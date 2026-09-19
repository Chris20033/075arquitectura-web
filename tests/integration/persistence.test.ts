import argon2 from "argon2";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ProjectStatus } from "@/generated/prisma/enums";
import { AdminBootstrapError, bootstrapAdmin } from "@/lib/admin/bootstrap";
import { createDatabaseClient } from "@/lib/db/client";
import {
  getPublicationIssues,
  getPublicationIssuesForCandidate,
} from "@/lib/projects/publication";
import { seedDatabase } from "@/prisma/seed-data";
import { getSafeTestDatabaseUrl } from "@/scripts/test-database";

const database = createDatabaseClient(getSafeTestDatabaseUrl());

beforeEach(async () => {
  await seedDatabase(database, { mode: "test", reset: true });
});

afterAll(async () => {
  await database.$disconnect();
});

describe("initial schema", () => {
  it("generates UUIDv7 identifiers", async () => {
    const profile = await database.siteProfile.findUniqueOrThrow({
      where: { singletonKey: "default" },
    });

    expect(profile.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("enforces singleton records", async () => {
    await expect(
      database.siteProfile.create({
        data: {
          singletonKey: "another",
          professionalName: "Invalid second profile",
        },
      }),
    ).rejects.toThrow();

    await expect(
      database.adminUser.create({
        data: {
          singletonKey: "another",
          email: "second@example.test",
          passwordHash: "not-a-real-hash",
        },
      }),
    ).rejects.toThrow();

    const admin = await database.adminUser.findUniqueOrThrow({
      where: { singletonKey: "owner" },
    });
    await expect(
      database.adminUser.update({
        where: { id: admin.id },
        data: { email: "NOT-NORMALIZED@EXAMPLE.TEST" },
      }),
    ).rejects.toThrow();

    expect(await database.siteProfile.count()).toBe(1);
    expect(await database.adminUser.count()).toBe(1);
  });

  it("enforces normalized category names and positions", async () => {
    await expect(
      database.category.create({
        data: {
          name: "Residencial demo",
          normalizedName: "residencial demo",
          slug: "otra-categoria",
          position: 10,
        },
      }),
    ).rejects.toThrow();

    await expect(
      database.category.create({
        data: {
          name: "Slug duplicado",
          normalizedName: "slug duplicado",
          slug: "residencial-demo",
          position: 11,
        },
      }),
    ).rejects.toThrow();

    await expect(
      database.category.create({
        data: {
          name: "Nombre distinto",
          normalizedName: "nombre distinto",
          slug: "nombre-distinto",
          position: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it("enforces social link positions within a profile", async () => {
    const profile = await database.siteProfile.findUniqueOrThrow({
      where: { singletonKey: "default" },
    });

    await expect(
      database.socialLink.create({
        data: {
          siteProfileId: profile.id,
          label: "Posición duplicada",
          url: "https://example.invalid/duplicate-social-position",
          position: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it("restricts category deletion while any project is associated", async () => {
    const category = await database.category.findUniqueOrThrow({
      where: { slug: "residencial-demo" },
    });

    await expect(
      database.category.delete({ where: { id: category.id } }),
    ).rejects.toThrow();
  });

  it("cascades local images when a project is permanently deleted", async () => {
    const project = await database.project.findUniqueOrThrow({
      where: { slug: "estudio-borrador-demo" },
      include: { images: true },
    });
    expect(project.images).toHaveLength(1);

    await database.project.delete({ where: { id: project.id } });

    expect(
      await database.projectImage.count({ where: { projectId: project.id } }),
    ).toBe(0);
  });

  it("allows only one cover and one position per project", async () => {
    const project = await database.project.findUniqueOrThrow({
      where: { slug: "casa-luz-demo" },
    });

    await expect(
      database.projectImage.create({
        data: {
          projectId: project.id,
          cloudinaryAssetId: "duplicate-cover-asset",
          cloudinaryPublicId: "075arquitectura/tests/duplicate-cover",
          cloudinaryVersion: 1n,
          secureUrl: "https://example.invalid/duplicate-cover.jpg",
          format: "jpg",
          width: 100,
          height: 100,
          bytes: 1000n,
          altText: "Portada duplicada.",
          position: 2,
          isCover: true,
        },
      }),
    ).rejects.toThrow();

    await expect(
      database.projectImage.create({
        data: {
          projectId: project.id,
          cloudinaryAssetId: "duplicate-position-asset",
          cloudinaryPublicId: "075arquitectura/tests/duplicate-position",
          cloudinaryVersion: 1n,
          secureUrl: "https://example.invalid/duplicate-position.jpg",
          format: "jpg",
          width: 100,
          height: 100,
          bytes: 1000n,
          altText: "Posición duplicada.",
          position: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it("enforces public ordering, Cloudinary IDs, and year checks", async () => {
    const category = await database.category.findUniqueOrThrow({
      where: { slug: "residencial-demo" },
    });

    await expect(
      database.project.create({
        data: {
          categoryId: category.id,
          name: "Public position collision",
          slug: "public-position-collision",
          status: ProjectStatus.PUBLISHED,
          position: 0,
        },
      }),
    ).rejects.toThrow();

    await expect(
      database.project.create({
        data: {
          categoryId: category.id,
          name: "Duplicate slug",
          slug: "casa-luz-demo",
          position: 21,
        },
      }),
    ).rejects.toThrow();

    await expect(
      database.project.create({
        data: {
          categoryId: category.id,
          name: "Draft can share public position",
          slug: "draft-shared-public-position",
          status: ProjectStatus.DRAFT,
          position: 0,
        },
      }),
    ).resolves.toBeDefined();

    await expect(
      database.project.create({
        data: {
          categoryId: category.id,
          name: "Invalid year",
          slug: "invalid-year",
          year: 999,
          position: 20,
        },
      }),
    ).rejects.toThrow();

    const draft = await database.project.findUniqueOrThrow({
      where: { slug: "estudio-borrador-demo" },
    });
    await expect(
      database.projectImage.create({
        data: {
          projectId: draft.id,
          cloudinaryAssetId: "demo-asset-published-cover",
          cloudinaryPublicId: "075arquitectura/tests/unique-public-id",
          cloudinaryVersion: 1n,
          secureUrl: "https://example.invalid/duplicate-asset.jpg",
          format: "jpg",
          width: 100,
          height: 100,
          bytes: 1000n,
          altText: "ID duplicado.",
          position: 5,
        },
      }),
    ).rejects.toThrow();

    await expect(
      database.projectImage.create({
        data: {
          projectId: draft.id,
          cloudinaryAssetId: "unique-asset-duplicate-public-id",
          cloudinaryPublicId: "075arquitectura/demo/casa-luz-cover",
          cloudinaryVersion: 1n,
          secureUrl: "https://example.invalid/duplicate-public-id.jpg",
          format: "jpg",
          width: 100,
          height: 100,
          bytes: 1000n,
          altText: "Public ID duplicado.",
          position: 6,
        },
      }),
    ).rejects.toThrow();
  });
});

describe("seed and visibility", () => {
  it("is idempotent", async () => {
    const countsBefore = {
      profiles: await database.siteProfile.count(),
      categories: await database.category.count(),
      projects: await database.project.count(),
      images: await database.projectImage.count(),
    };

    await seedDatabase(database, { mode: "test" });
    await seedDatabase(database, { mode: "test" });

    expect({
      profiles: await database.siteProfile.count(),
      categories: await database.category.count(),
      projects: await database.project.count(),
      images: await database.projectImage.count(),
    }).toEqual(countsBefore);
  });

  it("does not create an administrator in development mode", async () => {
    await database.adminUser.deleteMany();
    await seedDatabase(database, { mode: "development" });

    expect(await database.adminUser.count()).toBe(0);
  });

  it("returns only published projects outside the trash", async () => {
    const publicProjects = await database.project.findMany({
      where: {
        status: ProjectStatus.PUBLISHED,
        deletedAt: null,
      },
      orderBy: { position: "asc" },
    });

    expect(publicProjects.map((project) => project.slug)).toEqual([
      "casa-luz-demo",
    ]);
  });
});

describe("publication validation", () => {
  it("accepts the complete published fixture", async () => {
    const project = await database.project.findUniqueOrThrow({
      where: { slug: "casa-luz-demo" },
    });
    await expect(getPublicationIssues(database, project.id)).resolves.toEqual(
      [],
    );
  });

  it("reports draft and trash violations with stable codes", async () => {
    const draft = await database.project.findUniqueOrThrow({
      where: { slug: "estudio-borrador-demo" },
    });
    const deleted = await database.project.findUniqueOrThrow({
      where: { slug: "proyecto-papelera-demo" },
    });

    await expect(getPublicationIssues(database, draft.id)).resolves.toEqual([
      "COVER_REQUIRED",
      "IMAGE_ALT_TEXT_REQUIRED",
    ]);
    await expect(getPublicationIssues(database, deleted.id)).resolves.toEqual([
      "PROJECT_IN_TRASH",
    ]);
  });

  it("reports empty content and an unknown project", async () => {
    const category = await database.category.findUniqueOrThrow({
      where: { slug: "residencial-demo" },
    });
    const invalid = await database.project.create({
      data: {
        categoryId: category.id,
        name: " ",
        slug: "empty-project",
        position: 30,
      },
    });
    await expect(getPublicationIssues(database, invalid.id)).resolves.toEqual([
      "NAME_REQUIRED",
      "IMAGE_REQUIRED",
      "COVER_REQUIRED",
    ]);
    await expect(
      getPublicationIssues(database, "00000000-0000-7000-8000-000000000000"),
    ).resolves.toEqual(["PROJECT_NOT_FOUND"]);
  });

  it("reports every defensive issue in a stable order", () => {
    expect(
      getPublicationIssuesForCandidate({
        name: " ",
        slug: " ",
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
        images: [{ altText: " ", isCover: false }],
      }),
    ).toEqual([
      "PROJECT_IN_TRASH",
      "NAME_REQUIRED",
      "SLUG_REQUIRED",
      "COVER_REQUIRED",
      "IMAGE_ALT_TEXT_REQUIRED",
    ]);
  });
});

describe("administrator bootstrap", () => {
  it("normalizes email, hashes the password, and rejects a second admin", async () => {
    await database.adminUser.deleteMany();

    const admin = await bootstrapAdmin(database, {
      email: "  OWNER@EXAMPLE.TEST ",
      password: "a-secure-test-password",
    });
    expect(admin.email).toBe("owner@example.test");

    const stored = await database.adminUser.findUniqueOrThrow({
      where: { id: admin.id },
    });
    expect(stored.passwordHash).not.toContain("a-secure-test-password");
    await expect(
      argon2.verify(stored.passwordHash, "a-secure-test-password"),
    ).resolves.toBe(true);

    await expect(
      bootstrapAdmin(database, {
        email: "second@example.test",
        password: "another-secure-password",
      }),
    ).rejects.toMatchObject<Partial<AdminBootstrapError>>({
      code: "ADMIN_ALREADY_EXISTS",
    });
  });
});
