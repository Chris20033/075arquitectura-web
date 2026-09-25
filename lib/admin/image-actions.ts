"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";

import { requireAdminOperation } from "@/lib/auth/access";
import { database } from "@/lib/db";
import { MediaStorageKind, ProjectStatus } from "@/generated/prisma/enums";
import { imageUploadLimits, validateImageMetadata } from "@/lib/media/limits";
import {
  markUploadCancelled,
  stageStoredMediaForDeletion,
} from "@/lib/media/storage";
import { createMediaUploadToken } from "@/lib/media/upload-token";

import {
  AdminContentError,
  errorResult,
  successResult,
  type AdminActionState,
} from "./content-result";
import {
  createAdminImageService,
  type UploadDescriptor,
} from "./image-service";

function refreshImages(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/proyectos");
  revalidatePath("/admin/papelera");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/proyectos/${slug}`);
}

function imageService() {
  return createAdminImageService(database);
}

export type PreparedMediaUpload = { token: string; uploadId: string };

async function projectSlug(projectId: string) {
  return (
    await database.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    })
  )?.slug;
}

export async function prepareImageUploadsAction(
  projectId: string,
  descriptors: UploadDescriptor[],
): Promise<AdminActionState<PreparedMediaUpload[]>> {
  try {
    await requireAdminOperation();
    const project = await database.project.findUnique({
      where: { id: projectId },
      include: { _count: { select: { images: true } } },
    });
    if (!project || project.deletedAt)
      throw new AdminContentError(
        "NOT_FOUND",
        "El proyecto ya no está disponible.",
      );
    if (
      descriptors.length === 0 ||
      project._count.images + descriptors.length >
        imageUploadLimits.maxImagesPerProject
    )
      throw new AdminContentError(
        "UPLOAD_LIMIT_REACHED",
        "El proyecto admite como máximo 30 imágenes.",
      );
    const prepared = descriptors.map((descriptor) => {
      const issues = validateImageMetadata(descriptor);
      if (
        !(imageUploadLimits.allowedMimeTypes as readonly string[]).includes(
          descriptor.mimeType,
        ) ||
        issues.length > 0
      )
        throw new AdminContentError(
          "UPLOAD_INVALID",
          issues[0] ?? "El formato debe ser JPEG, PNG o WebP.",
        );
      if (
        project.status === ProjectStatus.PUBLISHED &&
        !descriptor.altText?.trim()
      )
        throw new AdminContentError(
          "UPLOAD_INVALID",
          "Añade una descripción a todas las imágenes nuevas.",
        );
      const uploadId = randomUUID();
      return {
        uploadId,
        token: createMediaUploadToken({
          scope: "project",
          ownerId: projectId,
          uploadId,
          name: descriptor.name,
          mimeType: descriptor.mimeType,
          bytes: descriptor.bytes,
          altText: descriptor.altText?.trim() || null,
        }),
      };
    });
    return successResult("Carga preparada.", prepared);
  } catch (error) {
    return errorResult<PreparedMediaUpload[]>(error);
  }
}

export async function updateImageAltTextsAction(
  projectId: string,
  values: Array<{ id: string; altText: string | null }>,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    await imageService().updateAltTexts(projectId, values);
    refreshImages(await projectSlug(projectId));
    return successResult("Textos alternativos guardados.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function setProjectCoverAction(
  projectId: string,
  imageId: string,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    await imageService().setCover(projectId, imageId);
    refreshImages(await projectSlug(projectId));
    return successResult("Portada actualizada.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function reorderProjectImagesAction(
  projectId: string,
  ids: string[],
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    await imageService().reorderImages(projectId, ids);
    refreshImages(await projectSlug(projectId));
    return successResult("Orden de galería guardado.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateProjectGalleryAction(
  projectId: string,
  values: Array<{ id: string; altText: string | null }>,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    await imageService().updateGallery(projectId, values);
    refreshImages(await projectSlug(projectId));
    return successResult("Cambios de las imágenes guardados.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteProjectImageAction(
  projectId: string,
  imageId: string,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    await imageService().deleteImage(projectId, imageId);
    refreshImages(await projectSlug(projectId));
    return successResult(
      "Imagen eliminada de la galería y del almacenamiento.",
    );
  } catch (error) {
    return errorResult(error);
  }
}

export async function cleanupPendingUploadsAction(): Promise<
  AdminActionState<{ deleted: number; failed: number }>
> {
  try {
    await requireAdminOperation();
    const result = await imageService().cleanupPendingAssets();
    return successResult(
      `Limpieza completa: ${result.deleted} cargas incompletas eliminadas y ${result.failed} fallidas.`,
      result,
    );
  } catch (error) {
    return errorResult<{
      deleted: number;
      failed: number;
    }>(error);
  }
}

export async function cancelProjectMediaUploadAction(
  projectId: string,
  uploadId: string,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    const project = await database.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project)
      throw new AdminContentError(
        "NOT_FOUND",
        "El proyecto ya no está disponible.",
      );
    await markUploadCancelled(uploadId);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const image = await database.projectImage.findFirst({
        where: { uploadToken: uploadId, projectId },
      });
      if (image) {
        await imageService().deleteImage(projectId, image.id);
        refreshImages(await projectSlug(projectId));
        break;
      }
      await wait(100);
    }

    return successResult("Carga cancelada.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function cancelHeroMediaUploadAction(
  uploadId: string,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    const profile = await database.siteProfile.findUnique({
      where: { singletonKey: "default" },
      select: { id: true },
    });
    if (!profile)
      throw new AdminContentError(
        "NOT_FOUND",
        "No existe el perfil del sitio.",
      );
    await markUploadCancelled(uploadId);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const image = await database.siteHeroImage.findFirst({
        where: { uploadToken: uploadId, siteProfileId: profile.id },
      });
      if (image) {
        const staged =
          image.storageKind === MediaStorageKind.LOCAL
            ? await stageStoredMediaForDeletion(image.storageKey)
            : null;
        try {
          await database.siteHeroImage.delete({ where: { id: image.id } });
        } catch (error) {
          await staged?.rollback();
          throw error;
        }
        await staged?.commit();
        refreshImages();
        break;
      }
      await wait(100);
    }

    return successResult("Carga cancelada.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function permanentlyDeleteProjectWithImagesAction(
  projectId: string,
  confirmation: string,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    const result = await imageService().permanentlyDeleteProject(
      projectId,
      confirmation,
    );
    refreshImages();
    return successResult(
      `Proyecto eliminado definitivamente junto con ${result.deletedImages} imágenes.`,
    );
  } catch (error) {
    return errorResult(error);
  }
}
