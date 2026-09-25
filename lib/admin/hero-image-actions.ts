"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAdminOperation } from "@/lib/auth/access";
import { database } from "@/lib/db";
import { imageUploadLimits, validateImageMetadata } from "@/lib/media/limits";
import { createMediaUploadToken } from "@/lib/media/upload-token";

import {
  AdminContentError,
  errorResult,
  successResult,
  type AdminActionState,
} from "./content-result";
import { createAdminHeroImageService } from "./hero-image-service";
import type { PreparedMediaUpload } from "./image-actions";
import type { UploadDescriptor } from "./image-service";

function service() {
  return createAdminHeroImageService(database);
}

function refreshHero() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/perfil");
}

export async function prepareHeroUploadAction(
  descriptor: UploadDescriptor,
): Promise<AdminActionState<PreparedMediaUpload>> {
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
    if (!descriptor.altText?.trim())
      throw new AdminContentError(
        "UPLOAD_INVALID",
        "Añade una descripción antes de cargar la portada.",
      );
    const uploadId = randomUUID();
    return successResult("Carga preparada.", {
      uploadId,
      token: createMediaUploadToken({
        scope: "site_hero",
        ownerId: profile.id,
        uploadId,
        name: descriptor.name,
        mimeType: descriptor.mimeType,
        bytes: descriptor.bytes,
        altText: descriptor.altText.trim(),
      }),
    });
  } catch (error) {
    return errorResult<PreparedMediaUpload>(error);
  }
}

export async function updateHeroAltTextAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    await service().updateAltText(String(formData.get("altText") ?? ""));
    refreshHero();
    return successResult("Descripción actualizada.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteHeroImageAction(): Promise<AdminActionState> {
  try {
    await requireAdminOperation();
    await service().deleteHero();
    refreshHero();
    return successResult("Portada principal eliminada.");
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteHeroImageFormAction(
  _state: AdminActionState,
  _formData: FormData,
) {
  void _state;
  void _formData;
  return deleteHeroImageAction();
}
