import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ProjectStatus } from "@/generated/prisma/enums";
import { createAdminContentService } from "@/lib/admin/content-service";
import { AdminContentError } from "@/lib/admin/content-result";
import { normalizeName, slugify, uniqueSlug } from "@/lib/admin/content-utils";
import { createDatabaseClient } from "@/lib/db/client";
import { getPublicProjectBySlug } from "@/lib/public/projects";
import { seedDatabase } from "@/prisma/seed-data";
import { getSafeTestDatabaseUrl } from "@/scripts/test-database";

const database = createDatabaseClient(getSafeTestDatabaseUrl());
const content = createAdminContentService(database);

beforeEach(async () => {
  await seedDatabase(database, { mode: "test", reset: true });
});

afterAll(async () => {
  await database.$disconnect();
});

describe("content naming", () => {
  it("normalizes accents, whitespace, and slug collisions", () => {
    expect(normalizeName("  Casa   Árbol  ")).toBe("casa árbol");
    expect(slugify("Casa Árbol / Norte")).toBe("casa-arbol-norte");
    expect(uniqueSlug("casa", ["casa", "casa-2", "casa-3"])).toBe("casa-4");
  });

  it("creates unique category slugs and rejects normalized duplicates", async () => {
    const category = await content.createCategory("Paisajismo & exterior");
    expect(category.slug).toBe("paisajismo-exterior");

    await expect(
      content.createCategory("  PAISAJISMO & EXTERIOR "),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    } satisfies Partial<AdminContentError>);
  });
});

describe("categories", () => {
  it("rejects deletion when projects exist, including trash", async () => {
    const category = await database.category.findFirstOrThrow({
      where: { projects: { some: { deletedAt: { not: null } } } },
    });
    await expect(
      content.deleteCategory(category.id, category.updatedAt),
    ).rejects.toMatchObject({
      code: "CATEGORY_IN_USE",
    } satisfies Partial<AdminContentError>);
  });

  it("reorders atomically and rejects an incomplete list", async () => {
    const categories = await content.listCategories();
    const reversed = categories.map((item) => item.id).reverse();
    await content.reorderCategories(reversed);
    expect((await content.listCategories()).map((item) => item.id)).toEqual(
      reversed,
    );

    await expect(
      content.reorderCategories(reversed.slice(1)),
    ).rejects.toMatchObject({
      code: "INVALID_ORDER",
    } satisfies Partial<AdminContentError>);
    expect((await content.listCategories()).map((item) => item.id)).toEqual(
      reversed,
    );
  });
});

describe("project editing and publication", () => {
  it("regenerates a draft slug and locks it after first publication", async () => {
    const category = await database.category.findFirstOrThrow();
    const project = await content.createProject({
      name: "Casa Árbol",
      description: null,
      year: 2026,
      location: null,
      categoryId: category.id,
    });
    const renamed = await content.updateProject(project.id, project.updatedAt, {
      name: "Casa Árbol Norte",
      description: null,
      year: 2026,
      location: null,
      categoryId: category.id,
    });
    expect(renamed.slug).toBe("casa-arbol-norte");

    await database.projectImage.create({
      data: {
        projectId: project.id,
        cloudinaryAssetId: `test-asset-${project.id}`,
        cloudinaryPublicId: `test/public-${project.id}`,
        cloudinaryVersion: 1n,
        secureUrl: "https://example.invalid/test.jpg",
        format: "jpg",
        width: 1600,
        height: 1200,
        bytes: 1000n,
        altText: "Vista exterior de prueba.",
        position: 0,
        isCover: true,
      },
    });
    const publishable = await database.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    const published = await content.publishProject(
      project.id,
      publishable.updatedAt,
    );
    const edited = await content.updateProject(
      published.id,
      published.updatedAt,
      {
        name: "Nombre posterior",
        description: null,
        year: 2026,
        location: null,
        categoryId: category.id,
      },
    );
    expect(edited.slug).toBe("casa-arbol-norte");
    expect(edited.publishedAt).toEqual(published.publishedAt);
  });

  it("keeps a new project as draft when publication requirements are missing", async () => {
    const category = await database.category.findFirstOrThrow();
    const project = await content.createProject({
      name: "Proyecto sin imágenes",
      description: null,
      year: null,
      location: null,
      categoryId: category.id,
    });
    await expect(
      content.publishProject(project.id, project.updatedAt),
    ).rejects.toMatchObject({
      code: "PUBLICATION_BLOCKED",
    } satisfies Partial<AdminContentError>);
    expect(
      (await database.project.findUniqueOrThrow({ where: { id: project.id } }))
        .status,
    ).toBe(ProjectStatus.DRAFT);
  });

  it("detects a stale edit instead of overwriting it", async () => {
    const project = await database.project.findFirstOrThrow({
      where: { deletedAt: null },
    });
    await database.project.update({
      where: { id: project.id },
      data: { location: "Cambio externo" },
    });
    await expect(
      content.updateProject(project.id, project.updatedAt, {
        name: project.name,
        description: project.description,
        year: project.year,
        location: "Cambio local",
        categoryId: project.categoryId,
      }),
    ).rejects.toMatchObject({
      code: "CONTENT_STALE",
    } satisfies Partial<AdminContentError>);
  });

  it("reorders the public catalogue transactionally", async () => {
    const published = await content.listProjects("published");
    const reversed = published.map((item) => item.id).reverse();
    await content.reorderPublishedProjects(reversed);
    expect(
      (await content.listProjects("published")).map((item) => item.id),
    ).toEqual(reversed);
  });
});

describe("trash lifecycle", () => {
  it("removes a published project from public and restores its state", async () => {
    const project = await database.project.findFirstOrThrow({
      where: { status: ProjectStatus.PUBLISHED, deletedAt: null },
      orderBy: { position: "asc" },
    });
    await content.trashProject(project.id, project.updatedAt);
    await expect(
      getPublicProjectBySlug(project.slug, database, { mode: "demo" }),
    ).resolves.toBeNull();

    const trashed = await database.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    const restored = await content.restoreProject(
      project.id,
      trashed.updatedAt,
    );
    expect(restored.restoredAsDraft).toBe(false);
    expect(
      (await database.project.findUniqueOrThrow({ where: { id: project.id } }))
        .status,
    ).toBe(ProjectStatus.PUBLISHED);
  });

  it("restores an invalid published project as draft", async () => {
    const project = await database.project.findFirstOrThrow({
      where: { status: ProjectStatus.PUBLISHED, deletedAt: null },
      include: { images: true },
    });
    await content.trashProject(project.id, project.updatedAt);
    await database.projectImage.updateMany({
      where: { projectId: project.id },
      data: { altText: null },
    });
    const trashed = await database.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    const restored = await content.restoreProject(
      project.id,
      trashed.updatedAt,
    );
    expect(restored.restoredAsDraft).toBe(true);
  });

  it("deletes image-free trash and blocks projects with images", async () => {
    const category = await database.category.findFirstOrThrow();
    const draft = await content.createProject({
      name: "Borrador eliminable",
      description: null,
      year: null,
      location: null,
      categoryId: category.id,
    });
    await content.trashProject(draft.id, draft.updatedAt);
    await content.permanentlyDeleteProject(draft.id, draft.name);
    expect(
      await database.project.findUnique({ where: { id: draft.id } }),
    ).toBeNull();

    const withImages = await database.project.findFirstOrThrow({
      where: { deletedAt: { not: null }, images: { some: {} } },
    });
    await expect(
      content.permanentlyDeleteProject(withImages.id, withImages.name),
    ).rejects.toMatchObject({
      code: "PROJECT_HAS_IMAGES",
    } satisfies Partial<AdminContentError>);
  });
});

describe("profile and social links", () => {
  it("updates public profile data and keeps social order atomic", async () => {
    const profile = await content.getProfile();
    await content.updateProfile(new Date(profile.updatedAt), {
      professionalName: "075 arquitectura",
      biography: "Biografía actualizada.",
      whatsappPhone: "521234567890",
      publicEmail: "hola@example.test",
      publicPhone: null,
    });
    const updated = await content.getProfile();
    expect(updated.professionalName).toBe("075 arquitectura");

    const reversed = updated.socialLinks.map((item) => item.id).reverse();
    await content.reorderSocialLinks(reversed);
    expect(
      (await content.getProfile()).socialLinks.map((item) => item.id),
    ).toEqual(reversed);
  });
});
