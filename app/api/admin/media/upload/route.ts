import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { MediaStorageKind, ProjectStatus } from "@/generated/prisma/enums";
import { getActiveAdminSession } from "@/lib/auth/access";
import { database } from "@/lib/db";
import { imageUploadLimits } from "@/lib/media/limits";
import {
  processUploadedImage,
  withImageProcessingLock,
} from "@/lib/media/processor";
import {
  createTemporaryAssetDirectory,
  createTemporaryUploadPath,
  discardPath,
  finalizeAssetDirectory,
  isUploadCancelled,
  removeStoredMedia,
} from "@/lib/media/storage";
import { verifyMediaUploadToken } from "@/lib/media/upload-token";

export const runtime = "nodejs";

function safeProjectFolder(slug: string, id: string) {
  const safe = slug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  return `${safe || "proyecto"}--${id.slice(0, 8)}`;
}

function messageFor(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UPLOAD_TOO_LARGE")
      return "La imagen supera el límite de 20 MB.";
    if (error.message === "UNSUPPORTED_IMAGE_FORMAT")
      return "El archivo no es una imagen JPEG, PNG o WebP válida.";
    if (/TOKEN/.test(error.message))
      return "La preparación de la carga venció. Inténtalo nuevamente.";
    if (error.message === "UPLOAD_CANCELLED") return "Carga cancelada.";
  }
  return "No pudimos procesar la imagen. Comprueba el archivo e inténtalo nuevamente.";
}

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : error instanceof Error
      ? error.message
      : "UNKNOWN";
}

async function streamRequest(
  request: NextRequest,
  target: string,
  max: number,
) {
  if (!request.body) throw new Error("EMPTY_UPLOAD");
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      callback(bytes > max ? new Error("UPLOAD_TOO_LARGE") : null, chunk);
    },
  });
  await pipeline(
    Readable.fromWeb(request.body as never),
    limiter,
    createWriteStream(target, { flags: "wx" }),
  );
  return bytes;
}

export async function POST(request: NextRequest) {
  const session = await getActiveAdminSession();
  if (!session)
    return NextResponse.json(
      { message: "Tu sesión terminó." },
      { status: 401 },
    );

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin)
    return NextResponse.json(
      { message: "Solicitud no permitida." },
      { status: 403 },
    );

  const signed = request.headers.get("x-media-upload");
  if (!signed)
    return NextResponse.json({ message: "Carga incompleta." }, { status: 400 });

  let payload;
  try {
    payload = verifyMediaUploadToken(signed);
  } catch (error) {
    return NextResponse.json({ message: messageFor(error) }, { status: 400 });
  }

  if (await isUploadCancelled(payload.uploadId))
    return NextResponse.json({ message: "Carga cancelada." }, { status: 409 });

  const existing =
    payload.scope === "project"
      ? await database.projectImage.findUnique({
          where: { uploadToken: payload.uploadId },
          select: { id: true },
        })
      : await database.siteHeroImage.findUnique({
          where: { uploadToken: payload.uploadId },
          select: { id: true },
        });
  if (existing)
    return NextResponse.json({ message: "La imagen ya estaba guardada." });

  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (contentType !== payload.mimeType)
    return NextResponse.json(
      { message: "El tipo de archivo no coincide." },
      { status: 400 },
    );

  const temporaryFile = await createTemporaryUploadPath(payload.uploadId);
  let temporaryDirectory: string | null = null;
  let finalizedStorageKey: string | null = null;
  try {
    const bytes = await streamRequest(
      request,
      temporaryFile,
      imageUploadLimits.maxBytes,
    );
    if (bytes !== payload.bytes) throw new Error("UPLOAD_SIZE_MISMATCH");
    if (await isUploadCancelled(payload.uploadId))
      throw new Error("UPLOAD_CANCELLED");

    const mediaKey = randomUUID();
    temporaryDirectory = await createTemporaryAssetDirectory(mediaKey);
    const processed = await withImageProcessingLock(() =>
      processUploadedImage({
        sourcePath: temporaryFile,
        outputDirectory: temporaryDirectory!,
        suppliedName: payload.name,
      }),
    );
    if (await isUploadCancelled(payload.uploadId))
      throw new Error("UPLOAD_CANCELLED");
    await discardPath(temporaryFile).catch((error) => {
      // The finished asset already contains an exact copy of the original.
      // A scanner or libvips may briefly retain the transfer file on Windows;
      // the normal 24-hour cleanup can safely finish this non-critical step.
      console.warn(
        `[local-media] temporary cleanup deferred code=${errorCode(error)}`,
      );
    });

    if (payload.scope === "project") {
      const project = await database.project.findUnique({
        where: { id: payload.ownerId },
      });
      if (!project || project.deletedAt) throw new Error("PROJECT_NOT_FOUND");
      if (
        project.status === ProjectStatus.PUBLISHED &&
        !payload.altText?.trim()
      )
        throw new Error("ALT_TEXT_REQUIRED");

      finalizedStorageKey = `projects/${safeProjectFolder(project.slug, project.id)}/${mediaKey}`;
      await finalizeAssetDirectory(temporaryDirectory, finalizedStorageKey);
      temporaryDirectory = null;
      await database.$transaction(
        async (transaction) => {
          const lockedProject = await transaction.project.findUnique({
            where: { id: project.id },
            include: { _count: { select: { images: true } } },
          });
          if (!lockedProject || lockedProject.deletedAt)
            throw new Error("PROJECT_NOT_FOUND");
          if (
            lockedProject._count.images >= imageUploadLimits.maxImagesPerProject
          )
            throw new Error("UPLOAD_LIMIT_REACHED");
          const last = await transaction.projectImage.aggregate({
            where: { projectId: project.id },
            _max: { position: true },
            _count: true,
          });
          await transaction.projectImage.create({
            data: {
              projectId: project.id,
              mediaKey,
              storageKind: MediaStorageKind.LOCAL,
              storageKey: finalizedStorageKey!,
              originalFilename: processed.originalFilename,
              originalFormat: processed.originalFormat,
              originalBytes: BigInt(processed.originalBytes),
              originalSha256: processed.originalSha256,
              width: processed.width,
              height: processed.height,
              displayFormat: "webp",
              variants: processed.variants as unknown as Prisma.InputJsonValue,
              uploadToken: payload.uploadId,
              altText: payload.altText?.trim() || null,
              position: (last._max.position ?? -1) + 1,
              isCover: last._count === 0,
            },
          });
          await transaction.project.update({
            where: { id: project.id },
            data: { updatedAt: new Date() },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (await isUploadCancelled(payload.uploadId)) {
        await database.projectImage.deleteMany({
          where: { uploadToken: payload.uploadId, projectId: project.id },
        });
        throw new Error("UPLOAD_CANCELLED");
      }
      revalidatePath(`/proyectos/${project.slug}`);
    } else {
      const profile = await database.siteProfile.findUnique({
        where: { id: payload.ownerId },
        include: { heroImage: true },
      });
      if (!profile || !payload.altText?.trim())
        throw new Error("PROFILE_NOT_FOUND");
      finalizedStorageKey = `site/hero/${mediaKey}`;
      await finalizeAssetDirectory(temporaryDirectory, finalizedStorageKey);
      temporaryDirectory = null;
      const previous = profile.heroImage;
      await database.siteHeroImage.upsert({
        where: { siteProfileId: profile.id },
        create: {
          siteProfileId: profile.id,
          mediaKey,
          storageKind: MediaStorageKind.LOCAL,
          storageKey: finalizedStorageKey,
          originalFilename: processed.originalFilename,
          originalFormat: processed.originalFormat,
          originalBytes: BigInt(processed.originalBytes),
          originalSha256: processed.originalSha256,
          width: processed.width,
          height: processed.height,
          displayFormat: "webp",
          variants: processed.variants as unknown as Prisma.InputJsonValue,
          uploadToken: payload.uploadId,
          altText: payload.altText.trim(),
        },
        update: {
          mediaKey,
          storageKind: MediaStorageKind.LOCAL,
          storageKey: finalizedStorageKey,
          originalFilename: processed.originalFilename,
          originalFormat: processed.originalFormat,
          originalBytes: BigInt(processed.originalBytes),
          originalSha256: processed.originalSha256,
          width: processed.width,
          height: processed.height,
          displayFormat: "webp",
          variants: processed.variants as unknown as Prisma.InputJsonValue,
          uploadToken: payload.uploadId,
          altText: payload.altText.trim(),
        },
      });
      if (await isUploadCancelled(payload.uploadId)) {
        if (previous) {
          await database.siteHeroImage.upsert({
            where: { siteProfileId: profile.id },
            create: {
              siteProfileId: profile.id,
              mediaKey: previous.mediaKey,
              storageKind: previous.storageKind,
              storageKey: previous.storageKey,
              originalFilename: previous.originalFilename,
              originalFormat: previous.originalFormat,
              originalBytes: previous.originalBytes,
              originalSha256: previous.originalSha256,
              width: previous.width,
              height: previous.height,
              displayFormat: previous.displayFormat,
              variants: previous.variants as Prisma.InputJsonValue,
              uploadToken: previous.uploadToken,
              altText: previous.altText,
            },
            update: {
              mediaKey: previous.mediaKey,
              storageKind: previous.storageKind,
              storageKey: previous.storageKey,
              originalFilename: previous.originalFilename,
              originalFormat: previous.originalFormat,
              originalBytes: previous.originalBytes,
              originalSha256: previous.originalSha256,
              width: previous.width,
              height: previous.height,
              displayFormat: previous.displayFormat,
              variants: previous.variants as Prisma.InputJsonValue,
              uploadToken: previous.uploadToken,
              altText: previous.altText,
            },
          });
        } else {
          await database.siteHeroImage.deleteMany({
            where: {
              uploadToken: payload.uploadId,
              siteProfileId: profile.id,
            },
          });
        }
        throw new Error("UPLOAD_CANCELLED");
      }
      if (previous?.storageKind === MediaStorageKind.LOCAL)
        await removeStoredMedia(previous.storageKey).catch(() => undefined);
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/proyectos");
    revalidatePath("/admin/perfil");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ message: "Imagen procesada y guardada." });
  } catch (error) {
    await discardPath(temporaryFile).catch(() => undefined);
    if (temporaryDirectory)
      await discardPath(temporaryDirectory).catch(() => undefined);
    if (finalizedStorageKey)
      await removeStoredMedia(finalizedStorageKey).catch(() => undefined);
    console.error(`[local-media] upload failed code=${errorCode(error)}`);
    return NextResponse.json({ message: messageFor(error) }, { status: 400 });
  }
}
