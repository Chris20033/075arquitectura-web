import { Prisma } from "@/generated/prisma/client";
import { ProjectStatus } from "@/generated/prisma/enums";
import type { DatabaseClient } from "@/lib/db/client";
import type { SocialNetwork } from "@/lib/social-networks";
import { getPublicationIssuesForCandidate } from "@/lib/projects/publication";
import {
  getPublicImageUrl,
  resolvePublicProjectImage,
} from "@/lib/public/project-images";

import { AdminContentError } from "./content-result";
import {
  assertSameIds,
  normalizeName,
  slugify,
  uniqueSlug,
} from "./content-utils";

type TransactionClient = Prisma.TransactionClient;

const MAX_TRANSACTION_RETRIES = 3;

function isRetryable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2034" || error.code === "P2002")
  );
}

async function serializable<T>(
  database: DatabaseClient,
  operation: (transaction: TransactionClient) => Promise<T>,
) {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await database.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryable(error) || attempt === MAX_TRANSACTION_RETRIES)
        throw error;
    }
  }
  throw new Error("Transaction retry limit reached.");
}

async function moveToTemporaryPositions(
  records: Array<{ id: string; position: number }>,
  update: (id: string, position: number) => Promise<unknown>,
) {
  const start =
    Math.max(0, ...records.map((record) => record.position)) +
    records.length +
    1;
  for (const [index, record] of records.entries()) {
    await update(record.id, start + index);
  }
}

function staleContent() {
  return new AdminContentError(
    "CONTENT_STALE",
    "Este contenido cambió en otra sesión. Recarga la página antes de guardar.",
  );
}

async function nextCategorySlug(
  transaction: TransactionClient,
  name: string,
  excludedId?: string,
) {
  const existing = await transaction.category.findMany({
    where: excludedId ? { id: { not: excludedId } } : undefined,
    select: { slug: true },
  });
  return uniqueSlug(
    slugify(name, "categoria"),
    existing.map((item) => item.slug),
  );
}

async function nextProjectSlug(
  transaction: TransactionClient,
  name: string,
  excludedId?: string,
) {
  const existing = await transaction.project.findMany({
    where: excludedId ? { id: { not: excludedId } } : undefined,
    select: { slug: true },
  });
  return uniqueSlug(
    slugify(name, "proyecto"),
    existing.map((item) => item.slug),
  );
}

async function compactPublishedProjects(transaction: TransactionClient) {
  const projects = await transaction.project.findMany({
    where: { status: ProjectStatus.PUBLISHED, deletedAt: null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, position: true },
  });
  await moveToTemporaryPositions(projects, (id, position) =>
    transaction.project.update({ where: { id }, data: { position } }),
  );
  for (const [position, project] of projects.entries()) {
    await transaction.project.update({
      where: { id: project.id },
      data: { position },
    });
  }
}

async function projectCandidate(transaction: TransactionClient, id: string) {
  return transaction.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      position: true,
      publishedAt: true,
      deletedAt: true,
      updatedAt: true,
      images: {
        orderBy: { position: "asc" },
        select: { altText: true, isCover: true, width: true, height: true },
      },
    },
  });
}

export function createAdminContentService(database: DatabaseClient) {
  return {
    async listCategories() {
      const categories = await database.category.findMany({
        orderBy: { position: "asc" },
        include: { _count: { select: { projects: true } } },
      });
      return categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        position: category.position,
        updatedAt: category.updatedAt.toISOString(),
        projectCount: category._count.projects,
      }));
    },

    async createCategory(name: string) {
      return serializable(database, async (transaction) => {
        const normalizedName = normalizeName(name);
        const duplicate = await transaction.category.findUnique({
          where: { normalizedName },
        });
        if (duplicate) {
          throw new AdminContentError(
            "VALIDATION_ERROR",
            "Revisa los campos indicados.",
            {
              name: "Ya existe una categoría con este nombre.",
            },
          );
        }
        const last = await transaction.category.aggregate({
          _max: { position: true },
        });
        const slug = await nextCategorySlug(transaction, name);
        return transaction.category.create({
          data: {
            name,
            normalizedName,
            slug,
            position: (last._max.position ?? -1) + 1,
          },
        });
      });
    },

    async updateCategory(id: string, expectedUpdatedAt: Date, name: string) {
      return serializable(database, async (transaction) => {
        const current = await transaction.category.findUnique({
          where: { id },
        });
        if (!current)
          throw new AdminContentError(
            "NOT_FOUND",
            "La categoría ya no existe.",
          );
        if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        const normalizedName = normalizeName(name);
        const duplicate = await transaction.category.findFirst({
          where: { normalizedName, id: { not: id } },
        });
        if (duplicate) {
          throw new AdminContentError(
            "VALIDATION_ERROR",
            "Revisa los campos indicados.",
            {
              name: "Ya existe una categoría con este nombre.",
            },
          );
        }
        const slug = await nextCategorySlug(transaction, name, id);
        return transaction.category.update({
          where: { id },
          data: { name, normalizedName, slug },
        });
      });
    },

    async deleteCategory(id: string, expectedUpdatedAt: Date) {
      return serializable(database, async (transaction) => {
        const category = await transaction.category.findUnique({
          where: { id },
          include: { _count: { select: { projects: true } } },
        });
        if (!category)
          throw new AdminContentError(
            "NOT_FOUND",
            "La categoría ya no existe.",
          );
        if (category.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        if (category._count.projects > 0) {
          throw new AdminContentError(
            "CATEGORY_IN_USE",
            "No puedes eliminar una categoría que todavía tiene proyectos.",
          );
        }
        await transaction.category.delete({ where: { id } });
        const remaining = await transaction.category.findMany({
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });
        await moveToTemporaryPositions(remaining, (categoryId, position) =>
          transaction.category.update({
            where: { id: categoryId },
            data: { position },
          }),
        );
        for (const [position, item] of remaining.entries()) {
          await transaction.category.update({
            where: { id: item.id },
            data: { position },
          });
        }
      });
    },

    async reorderCategories(ids: string[]) {
      return serializable(database, async (transaction) => {
        const current = await transaction.category.findMany({
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });
        assertSameIds(
          ids,
          current.map((item) => item.id),
        );
        await moveToTemporaryPositions(current, (id, position) =>
          transaction.category.update({ where: { id }, data: { position } }),
        );
        for (const [position, id] of ids.entries()) {
          await transaction.category.update({
            where: { id },
            data: { position },
          });
        }
      });
    },

    async listProjects(filter: "all" | "draft" | "published" = "all") {
      const status =
        filter === "draft"
          ? ProjectStatus.DRAFT
          : filter === "published"
            ? ProjectStatus.PUBLISHED
            : undefined;
      const projects = await database.project.findMany({
        where: { deletedAt: null, status },
        orderBy: [
          { status: "desc" },
          { position: "asc" },
          { updatedAt: "desc" },
        ],
        include: {
          category: { select: { name: true } },
          _count: { select: { images: true } },
        },
      });
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        position: project.position,
        publishedAt: project.publishedAt?.toISOString() ?? null,
        updatedAt: project.updatedAt.toISOString(),
        category: project.category.name,
        imageCount: project._count.images,
      }));
    },

    async getProject(id: string) {
      const [project, categories] = await Promise.all([
        database.project.findUnique({
          where: { id },
          include: {
            category: { select: { name: true } },
            images: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                altText: true,
                isCover: true,
                width: true,
                height: true,
                position: true,
                originalFormat: true,
                originalBytes: true,
                mediaKey: true,
                storageKind: true,
                storageKey: true,
                variants: true,
              },
            },
          },
        }),
        database.category.findMany({ orderBy: { position: "asc" } }),
      ]);
      if (!project || project.deletedAt) return null;
      const issues = getPublicationIssuesForCandidate(project);
      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        year: project.year,
        location: project.location,
        categoryId: project.categoryId,
        categoryName: project.category.name,
        status: project.status,
        publishedAt: project.publishedAt?.toISOString() ?? null,
        updatedAt: project.updatedAt.toISOString(),
        images: project.images.map((image) => ({
          id: image.id,
          altText: image.altText,
          isCover: image.isCover,
          width: image.width,
          height: image.height,
          position: image.position,
          format: image.originalFormat,
          bytes: Number(image.originalBytes),
          previewUrl: getPublicImageUrl(
            resolvePublicProjectImage({
              mediaKey: image.mediaKey,
              storageKind: image.storageKind,
              storageKey: image.storageKey,
              variants: image.variants,
              width: image.width,
              height: image.height,
              altText: image.altText ?? "Vista previa del proyecto",
              position: image.position,
              isCover: image.isCover,
            }),
            900,
          ),
        })),
        publicationIssues: issues,
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
        })),
      };
    },

    async createProject(input: {
      name: string;
      description: string | null;
      year: number | null;
      location: string | null;
      categoryId: string;
    }) {
      return serializable(database, async (transaction) => {
        const category = await transaction.category.findUnique({
          where: { id: input.categoryId },
        });
        if (!category) {
          throw new AdminContentError(
            "VALIDATION_ERROR",
            "Revisa los campos indicados.",
            {
              categoryId: "Selecciona una categoría válida.",
            },
          );
        }
        const slug = await nextProjectSlug(transaction, input.name);
        return transaction.project.create({
          data: { ...input, slug, status: ProjectStatus.DRAFT, position: 0 },
        });
      });
    },

    async updateProject(
      id: string,
      expectedUpdatedAt: Date,
      input: {
        name: string;
        description: string | null;
        year: number | null;
        location: string | null;
        categoryId: string;
      },
    ) {
      return serializable(database, async (transaction) => {
        const current = await transaction.project.findUnique({ where: { id } });
        if (!current || current.deletedAt) {
          throw new AdminContentError(
            "NOT_FOUND",
            "El proyecto ya no está disponible.",
          );
        }
        if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        const category = await transaction.category.findUnique({
          where: { id: input.categoryId },
        });
        if (!category) {
          throw new AdminContentError(
            "VALIDATION_ERROR",
            "Revisa los campos indicados.",
            {
              categoryId: "Selecciona una categoría válida.",
            },
          );
        }
        const slug = current.publishedAt
          ? current.slug
          : await nextProjectSlug(transaction, input.name, id);
        return transaction.project.update({
          where: { id },
          data: { ...input, slug },
        });
      });
    },

    async publishProject(id: string, expectedUpdatedAt: Date) {
      return serializable(database, async (transaction) => {
        const project = await projectCandidate(transaction, id);
        if (!project || project.deletedAt) {
          throw new AdminContentError(
            "NOT_FOUND",
            "El proyecto ya no está disponible.",
          );
        }
        if (project.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        const issues = getPublicationIssuesForCandidate(project);
        if (issues.length > 0) {
          throw new AdminContentError(
            "PUBLICATION_BLOCKED",
            "Completa los requisitos pendientes antes de publicar.",
          );
        }
        const last = await transaction.project.aggregate({
          where: { status: ProjectStatus.PUBLISHED, deletedAt: null },
          _max: { position: true },
        });
        return transaction.project.update({
          where: { id },
          data: {
            status: ProjectStatus.PUBLISHED,
            position: (last._max.position ?? -1) + 1,
            publishedAt: project.publishedAt ?? new Date(),
          },
        });
      });
    },

    async unpublishProject(id: string, expectedUpdatedAt: Date) {
      return serializable(database, async (transaction) => {
        const project = await transaction.project.findUnique({ where: { id } });
        if (!project || project.deletedAt) {
          throw new AdminContentError(
            "NOT_FOUND",
            "El proyecto ya no está disponible.",
          );
        }
        if (project.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        await transaction.project.update({
          where: { id },
          data: { status: ProjectStatus.DRAFT, position: 0 },
        });
        await compactPublishedProjects(transaction);
      });
    },

    async trashProject(id: string, expectedUpdatedAt: Date) {
      return serializable(database, async (transaction) => {
        const project = await transaction.project.findUnique({ where: { id } });
        if (!project || project.deletedAt) {
          throw new AdminContentError(
            "NOT_FOUND",
            "El proyecto ya no está disponible.",
          );
        }
        if (project.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        await transaction.project.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
        if (project.status === ProjectStatus.PUBLISHED) {
          await compactPublishedProjects(transaction);
        }
      });
    },

    async reorderPublishedProjects(ids: string[]) {
      return serializable(database, async (transaction) => {
        const current = await transaction.project.findMany({
          where: { status: ProjectStatus.PUBLISHED, deletedAt: null },
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });
        assertSameIds(
          ids,
          current.map((item) => item.id),
        );
        await moveToTemporaryPositions(current, (id, position) =>
          transaction.project.update({ where: { id }, data: { position } }),
        );
        for (const [position, id] of ids.entries()) {
          await transaction.project.update({
            where: { id },
            data: { position },
          });
        }
      });
    },

    async listTrash() {
      const projects = await database.project.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        include: {
          category: { select: { name: true } },
          _count: { select: { images: true } },
        },
      });
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        position: project.position,
        category: project.category.name,
        deletedAt: project.deletedAt!.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        imageCount: project._count.images,
      }));
    },

    async restoreProject(id: string, expectedUpdatedAt: Date) {
      return serializable(database, async (transaction) => {
        const project = await projectCandidate(transaction, id);
        if (!project || !project.deletedAt) {
          throw new AdminContentError(
            "NOT_FOUND",
            "El proyecto ya no está en la papelera.",
          );
        }
        if (project.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        const issues = getPublicationIssuesForCandidate({
          ...project,
          deletedAt: null,
        });
        if (project.status !== ProjectStatus.PUBLISHED || issues.length > 0) {
          await transaction.project.update({
            where: { id },
            data: { deletedAt: null, status: ProjectStatus.DRAFT, position: 0 },
          });
          return { restoredAsDraft: true };
        }

        const active = await transaction.project.findMany({
          where: { status: ProjectStatus.PUBLISHED, deletedAt: null },
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });
        await moveToTemporaryPositions(active, (projectId, position) =>
          transaction.project.update({
            where: { id: projectId },
            data: { position },
          }),
        );
        const insertion = Math.min(project.position, active.length);
        const orderedIds = active.map((item) => item.id);
        orderedIds.splice(insertion, 0, project.id);
        const temporaryPosition =
          Math.max(
            project.position,
            ...active.map((item) => item.position),
            0,
          ) +
          active.length * 2 +
          3;
        await transaction.project.update({
          where: { id },
          data: { deletedAt: null, position: temporaryPosition },
        });
        for (const [position, projectId] of orderedIds.entries()) {
          await transaction.project.update({
            where: { id: projectId },
            data: { position },
          });
        }
        return { restoredAsDraft: false };
      });
    },

    async permanentlyDeleteProject(id: string, confirmation: string) {
      return serializable(database, async (transaction) => {
        const project = await transaction.project.findUnique({
          where: { id },
          include: { _count: { select: { images: true } } },
        });
        if (!project || !project.deletedAt) {
          throw new AdminContentError(
            "NOT_FOUND",
            "El proyecto ya no está en la papelera.",
          );
        }
        if (confirmation.trim() !== project.name) {
          throw new AdminContentError(
            "CONFIRMATION_MISMATCH",
            "Escribe el nombre exacto del proyecto para confirmar.",
            { confirmation: "El nombre no coincide." },
          );
        }
        if (project._count.images > 0) {
          throw new AdminContentError(
            "PROJECT_HAS_IMAGES",
            "Este proyecto conserva imágenes y deberá eliminarse en Sprint 7.",
          );
        }
        await transaction.project.delete({ where: { id } });
      });
    },

    async getProfile() {
      const profile = await database.siteProfile.findUnique({
        where: { singletonKey: "default" },
        include: {
          heroImage: true,
          socialLinks: { orderBy: { position: "asc" } },
        },
      });
      if (!profile)
        throw new AdminContentError(
          "NOT_FOUND",
          "No existe el perfil del sitio.",
        );
      return {
        id: profile.id,
        professionalName: profile.professionalName,
        biography: profile.biography,
        whatsappPhone: profile.whatsappPhone,
        publicEmail: profile.publicEmail,
        publicPhone: profile.publicPhone,
        updatedAt: profile.updatedAt.toISOString(),
        heroImage: profile.heroImage
          ? {
              id: profile.heroImage.id,
              altText: profile.heroImage.altText,
              width: profile.heroImage.width,
              height: profile.heroImage.height,
              format: profile.heroImage.originalFormat,
              bytes: Number(profile.heroImage.originalBytes),
              previewUrl: getPublicImageUrl(
                resolvePublicProjectImage({
                  mediaKey: profile.heroImage.mediaKey,
                  storageKind: profile.heroImage.storageKind,
                  storageKey: profile.heroImage.storageKey,
                  variants: profile.heroImage.variants,
                  width: profile.heroImage.width,
                  height: profile.heroImage.height,
                  altText: profile.heroImage.altText,
                  position: 0,
                  isCover: true,
                }),
                1600,
              ),
            }
          : null,
        socialLinks: profile.socialLinks.map((link) => ({
          id: link.id,
          platform: link.platform as SocialNetwork,
          username: link.username,
          label: link.label,
          url: link.url,
          position: link.position,
          isVisible: link.isVisible,
          updatedAt: link.updatedAt.toISOString(),
        })),
      };
    },

    async updateProfile(
      expectedUpdatedAt: Date,
      input: {
        professionalName: string;
        biography: string | null;
        whatsappPhone: string | null;
        publicEmail: string | null;
        publicPhone: string | null;
      },
    ) {
      const updated = await database.siteProfile.updateMany({
        where: { singletonKey: "default", updatedAt: expectedUpdatedAt },
        data: input,
      });
      if (updated.count === 0) throw staleContent();
    },

    async createSocialLink(input: {
      platform: SocialNetwork;
      username: string | null;
      label: string;
      url: string;
      isVisible: boolean;
    }) {
      return serializable(database, async (transaction) => {
        const profile = await transaction.siteProfile.findUnique({
          where: { singletonKey: "default" },
        });
        if (!profile)
          throw new AdminContentError(
            "NOT_FOUND",
            "No existe el perfil del sitio.",
          );
        const last = await transaction.socialLink.aggregate({
          where: { siteProfileId: profile.id },
          _max: { position: true },
        });
        return transaction.socialLink.create({
          data: {
            ...input,
            siteProfileId: profile.id,
            position: (last._max.position ?? -1) + 1,
          },
        });
      });
    },

    async updateSocialLink(
      id: string,
      expectedUpdatedAt: Date,
      input: {
        platform: SocialNetwork;
        username: string | null;
        label: string;
        url: string;
        isVisible: boolean;
      },
    ) {
      const updated = await database.socialLink.updateMany({
        where: { id, updatedAt: expectedUpdatedAt },
        data: input,
      });
      if (updated.count === 0) throw staleContent();
    },

    async deleteSocialLink(id: string, expectedUpdatedAt: Date) {
      return serializable(database, async (transaction) => {
        const link = await transaction.socialLink.findUnique({ where: { id } });
        if (!link)
          throw new AdminContentError("NOT_FOUND", "El enlace ya no existe.");
        if (link.updatedAt.getTime() !== expectedUpdatedAt.getTime())
          throw staleContent();
        await transaction.socialLink.delete({ where: { id } });
        const remaining = await transaction.socialLink.findMany({
          where: { siteProfileId: link.siteProfileId },
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });
        await moveToTemporaryPositions(remaining, (linkId, position) =>
          transaction.socialLink.update({
            where: { id: linkId },
            data: { position },
          }),
        );
        for (const [position, item] of remaining.entries()) {
          await transaction.socialLink.update({
            where: { id: item.id },
            data: { position },
          });
        }
      });
    },

    async reorderSocialLinks(ids: string[]) {
      return serializable(database, async (transaction) => {
        const profile = await transaction.siteProfile.findUnique({
          where: { singletonKey: "default" },
        });
        if (!profile)
          throw new AdminContentError(
            "NOT_FOUND",
            "No existe el perfil del sitio.",
          );
        const current = await transaction.socialLink.findMany({
          where: { siteProfileId: profile.id },
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });
        assertSameIds(
          ids,
          current.map((item) => item.id),
        );
        await moveToTemporaryPositions(current, (id, position) =>
          transaction.socialLink.update({ where: { id }, data: { position } }),
        );
        for (const [position, id] of ids.entries()) {
          await transaction.socialLink.update({
            where: { id },
            data: { position },
          });
        }
      });
    },
  };
}
