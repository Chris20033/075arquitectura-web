import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { MediaStorageKind, ProjectStatus } from "@/generated/prisma/enums";
import { getActiveAdminSession } from "@/lib/auth/access";
import { database } from "@/lib/db";
import type { StoredVariant } from "@/lib/media/processor";
import { isMediaVariantName, mediaVariants } from "@/lib/media/limits";
import { resolveStoragePath } from "@/lib/media/storage";

export const runtime = "nodejs";

function parseVariants(value: unknown): StoredVariant[] {
  const allowed = new Set(mediaVariants.map((variant) => variant.name));
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is StoredVariant =>
      Boolean(item) &&
      typeof item === "object" &&
      "name" in item &&
      "width" in item &&
      typeof item.name === "string" &&
      allowed.has(item.name as StoredVariant["name"]) &&
      typeof item.width === "number",
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ mediaKey: string; variant: string }> },
) {
  const { mediaKey, variant } = await context.params;
  if (!isMediaVariantName(variant))
    return new NextResponse(null, { status: 404 });

  const [projectImage, heroImage] = await Promise.all([
    database.projectImage.findUnique({
      where: { mediaKey },
      include: { project: { select: { status: true, deletedAt: true } } },
    }),
    database.siteHeroImage.findUnique({ where: { mediaKey } }),
  ]);
  const image = projectImage ?? heroImage;
  if (!image || image.storageKind !== MediaStorageKind.LOCAL)
    return new NextResponse(null, { status: 404 });

  const isPublic = heroImage
    ? true
    : projectImage?.project.status === ProjectStatus.PUBLISHED &&
      projectImage.project.deletedAt === null;
  if (!isPublic && !(await getActiveAdminSession()))
    return new NextResponse(null, { status: 404 });

  const variants = parseVariants(image.variants);
  const selected =
    variants.find((entry) => entry.name === variant) ?? variants.at(-1);
  if (!selected) return new NextResponse(null, { status: 404 });

  try {
    const body = await readFile(
      join(resolveStoragePath(image.storageKey), `${selected.name}.webp`),
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(body.byteLength),
        "Cache-Control": isPublic
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
        ETag: `"${mediaKey}-${selected.name}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
