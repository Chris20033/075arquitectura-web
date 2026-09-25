import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { MediaStorageKind, ProjectStatus } from "@/generated/prisma/enums";
import type { DatabaseClient } from "@/lib/db/client";
import {
  cleanupTemporaryStorage,
  stageStoredMediaForDeletion,
} from "@/lib/media/storage";

import { AdminContentError } from "./content-result";
import { assertSameIds } from "./content-utils";

type TransactionClient = Prisma.TransactionClient;

export type UploadDescriptor = {
  name: string;
  mimeType: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  altText: string | null;
};

async function serializable<T>(
  database: DatabaseClient,
  operation: (transaction: TransactionClient) => Promise<T>,
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await database.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034";
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw new Error("Transaction retry limit reached.");
}

async function temporaryPositions(
  records: Array<{ id: string; position: number }>,
  update: (id: string, position: number) => Promise<unknown>,
) {
  const start =
    Math.max(0, ...records.map((item) => item.position)) + records.length + 1;
  for (const [index, record] of records.entries())
    await update(record.id, start + index);
}

function missingProject() {
  return new AdminContentError(
    "NOT_FOUND",
    "El proyecto ya no está disponible.",
  );
}

export function createAdminImageService(database: DatabaseClient) {
  return {
    async updateAltTexts(
      projectId: string,
      values: Array<{ id: string; altText: string | null }>,
    ) {
      const project = await database.project.findUnique({
        where: { id: projectId },
        include: { images: { orderBy: { position: "asc" } } },
      });
      if (!project || project.deletedAt) throw missingProject();
      assertSameIds(
        values.map((value) => value.id),
        project.images.map((image) => image.id),
      );
      if (
        project.status === ProjectStatus.PUBLISHED &&
        values.some((value) => !value.altText?.trim())
      )
        throw new AdminContentError(
          "UPLOAD_INVALID",
          "Todas las imágenes publicadas necesitan una descripción.",
        );
      await database.$transaction(
        values.map((value) =>
          database.projectImage.update({
            where: { id: value.id },
            data: { altText: value.altText?.trim() || null },
          }),
        ),
      );
      await database.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      });
    },

    async updateGallery(
      projectId: string,
      values: Array<{ id: string; altText: string | null }>,
    ) {
      return serializable(database, async (transaction) => {
        const project = await transaction.project.findUnique({
          where: { id: projectId },
          include: { images: { orderBy: { position: "asc" } } },
        });
        if (!project || project.deletedAt) throw missingProject();
        assertSameIds(
          values.map((value) => value.id),
          project.images.map((image) => image.id),
        );
        if (
          project.status === ProjectStatus.PUBLISHED &&
          values.some((value) => !value.altText?.trim())
        )
          throw new AdminContentError(
            "UPLOAD_INVALID",
            "Todas las imágenes publicadas necesitan una descripción.",
          );
        await temporaryPositions(project.images, (id, position) =>
          transaction.projectImage.update({
            where: { id },
            data: { position },
          }),
        );
        for (const [position, value] of values.entries())
          await transaction.projectImage.update({
            where: { id: value.id },
            data: { position, altText: value.altText?.trim() || null },
          });
        await transaction.project.update({
          where: { id: projectId },
          data: { updatedAt: new Date() },
        });
      });
    },

    async setCover(projectId: string, imageId: string) {
      return serializable(database, async (transaction) => {
        const image = await transaction.projectImage.findFirst({
          where: { id: imageId, projectId },
        });
        if (!image)
          throw new AdminContentError("NOT_FOUND", "La imagen ya no existe.");
        await transaction.projectImage.updateMany({
          where: { projectId, isCover: true },
          data: { isCover: false },
        });
        await transaction.projectImage.update({
          where: { id: imageId },
          data: { isCover: true },
        });
        await transaction.project.update({
          where: { id: projectId },
          data: { updatedAt: new Date() },
        });
      });
    },

    async reorderImages(projectId: string, ids: string[]) {
      const values = ids.map((id) => ({ id, altText: null }));
      const current = await database.projectImage.findMany({
        where: { projectId },
      });
      return this.updateGallery(
        projectId,
        values.map((value) => ({
          ...value,
          altText:
            current.find((image) => image.id === value.id)?.altText ?? null,
        })),
      );
    },

    async deleteImage(projectId: string, imageId: string) {
      const image = await database.projectImage.findFirst({
        where: { id: imageId, projectId },
        include: { project: true },
      });
      if (!image)
        throw new AdminContentError("NOT_FOUND", "La imagen ya no existe.");
      const count = await database.projectImage.count({ where: { projectId } });
      if (image.isCover && count > 1)
        throw new AdminContentError(
          "IMAGE_IS_COVER",
          "Elige otra portada antes de eliminar esta imagen.",
        );
      if (image.project.status === ProjectStatus.PUBLISHED && count <= 1)
        throw new AdminContentError(
          "PUBLICATION_BLOCKED",
          "Un proyecto publicado no puede quedarse sin imágenes.",
        );
      const staged =
        image.storageKind === MediaStorageKind.LOCAL
          ? await stageStoredMediaForDeletion(image.storageKey)
          : null;
      try {
        await serializable(database, async (transaction) => {
          await transaction.projectImage.delete({ where: { id: image.id } });
          const remaining = await transaction.projectImage.findMany({
            where: { projectId },
            orderBy: { position: "asc" },
          });
          await temporaryPositions(remaining, (id, position) =>
            transaction.projectImage.update({
              where: { id },
              data: { position },
            }),
          );
          for (const [position, item] of remaining.entries())
            await transaction.projectImage.update({
              where: { id: item.id },
              data: { position },
            });
          await transaction.project.update({
            where: { id: projectId },
            data: { updatedAt: new Date() },
          });
        });
      } catch (error) {
        await staged?.rollback();
        throw error;
      }
      await staged?.commit();
    },

    cleanupPendingAssets() {
      return cleanupTemporaryStorage();
    },

    async permanentlyDeleteProject(projectId: string, confirmation: string) {
      const project = await database.project.findUnique({
        where: { id: projectId },
        include: { images: true },
      });
      if (!project || !project.deletedAt)
        throw new AdminContentError(
          "NOT_FOUND",
          "El proyecto ya no está en la papelera.",
        );
      if (confirmation.trim() !== project.name)
        throw new AdminContentError(
          "CONFIRMATION_MISMATCH",
          "Escribe el nombre exacto del proyecto para confirmar.",
        );
      const staged = await Promise.all(
        project.images
          .filter((image) => image.storageKind === MediaStorageKind.LOCAL)
          .map((image) => stageStoredMediaForDeletion(image.storageKey)),
      );
      try {
        await database.project.delete({ where: { id: projectId } });
      } catch (error) {
        await Promise.all(staged.map((item) => item.rollback()));
        throw error;
      }
      await Promise.all(staged.map((item) => item.commit()));
      return { deletedImages: project.images.length };
    },
  };
}
