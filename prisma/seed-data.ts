import argon2 from "argon2";

import { MediaStorageKind, ProjectStatus } from "../generated/prisma/enums";
import type { DatabaseClient } from "../lib/db/client";

export type SeedMode = "development" | "test";

export async function seedDatabase(
  database: DatabaseClient,
  options: { mode: SeedMode; reset?: boolean },
) {
  if (options.reset) {
    await database.loginThrottle.deleteMany();
    await database.project.deleteMany();
    await database.category.deleteMany();
    await database.socialLink.deleteMany();
    await database.siteProfile.deleteMany();
    await database.adminUser.deleteMany();
  }

  const profile = await database.siteProfile.upsert({
    where: { singletonKey: "default" },
    update: {
      professionalName: "075arquitectura — perfil de demostración",
      biography:
        "Estudio de demostración enfocado en espacios contemporáneos, materialidad honesta y una lectura atenta de cada contexto.",
      whatsappPhone: "+520000000000",
      publicEmail: "contacto@075arquitectura.test",
      publicPhone: "+520000000000",
    },
    create: {
      singletonKey: "default",
      professionalName: "075arquitectura — perfil de demostración",
      biography:
        "Estudio de demostración enfocado en espacios contemporáneos, materialidad honesta y una lectura atenta de cada contexto.",
      whatsappPhone: "+520000000000",
      publicEmail: "contacto@075arquitectura.test",
      publicPhone: "+520000000000",
    },
  });

  const socialLinks = [
    {
      platform: "INSTAGRAM" as const,
      username: "075arquitectura_demo",
      label: "Instagram",
      url: "https://example.invalid/instagram",
    },
    {
      platform: "PINTEREST" as const,
      username: "075arquitectura_demo",
      label: "Pinterest",
      url: "https://example.invalid/pinterest",
    },
  ];

  for (const [position, socialLink] of socialLinks.entries()) {
    await database.socialLink.upsert({
      where: {
        siteProfileId_position: {
          siteProfileId: profile.id,
          position,
        },
      },
      update: socialLink,
      create: {
        ...socialLink,
        siteProfileId: profile.id,
        position,
      },
    });
  }

  const residential = await database.category.upsert({
    where: { slug: "residencial-demo" },
    update: {
      name: "Residencial demo",
      normalizedName: "residencial demo",
      position: 0,
    },
    create: {
      name: "Residencial demo",
      normalizedName: "residencial demo",
      slug: "residencial-demo",
      position: 0,
    },
  });

  const renovation = await database.category.upsert({
    where: { slug: "remodelacion-demo" },
    update: {
      name: "Remodelación demo",
      normalizedName: "remodelación demo",
      position: 1,
    },
    create: {
      name: "Remodelación demo",
      normalizedName: "remodelación demo",
      slug: "remodelacion-demo",
      position: 1,
    },
  });

  const publishedProject = await database.project.upsert({
    where: { slug: "casa-luz-demo" },
    update: {
      categoryId: residential.id,
      name: "Casa Luz demo",
      description: "Proyecto publicado completamente ficticio.",
      year: 2026,
      location: "Ubicación de prueba",
      status: ProjectStatus.PUBLISHED,
      position: 0,
      publishedAt: new Date("2026-01-10T12:00:00.000Z"),
      deletedAt: null,
    },
    create: {
      categoryId: residential.id,
      name: "Casa Luz demo",
      slug: "casa-luz-demo",
      description: "Proyecto publicado completamente ficticio.",
      year: 2026,
      location: "Ubicación de prueba",
      status: ProjectStatus.PUBLISHED,
      position: 0,
      publishedAt: new Date("2026-01-10T12:00:00.000Z"),
    },
  });

  const patioProject = await database.project.upsert({
    where: { slug: "patio-de-tierra-demo" },
    update: {
      categoryId: residential.id,
      name: "Patio de Tierra demo",
      description:
        "Pabellón ficticio organizado por umbrales de ladrillo, sombra profunda y vegetación de bajo consumo.",
      year: 2025,
      location: "Ubicación de prueba",
      status: ProjectStatus.PUBLISHED,
      position: 1,
      publishedAt: new Date("2026-01-11T12:00:00.000Z"),
      deletedAt: null,
    },
    create: {
      categoryId: residential.id,
      name: "Patio de Tierra demo",
      slug: "patio-de-tierra-demo",
      description:
        "Pabellón ficticio organizado por umbrales de ladrillo, sombra profunda y vegetación de bajo consumo.",
      year: 2025,
      location: "Ubicación de prueba",
      status: ProjectStatus.PUBLISHED,
      position: 1,
      publishedAt: new Date("2026-01-11T12:00:00.000Z"),
    },
  });

  const thresholdProject = await database.project.upsert({
    where: { slug: "casa-umbral-demo" },
    update: {
      categoryId: renovation.id,
      name: "Casa Umbral demo",
      description:
        "Remodelación ficticia que enlaza habitaciones y patios mediante una secuencia de vanos, piedra clara y madera oscura.",
      year: 2024,
      location: "Ubicación de prueba",
      status: ProjectStatus.PUBLISHED,
      position: 2,
      publishedAt: new Date("2026-01-12T12:00:00.000Z"),
      deletedAt: null,
    },
    create: {
      categoryId: renovation.id,
      name: "Casa Umbral demo",
      slug: "casa-umbral-demo",
      description:
        "Remodelación ficticia que enlaza habitaciones y patios mediante una secuencia de vanos, piedra clara y madera oscura.",
      year: 2024,
      location: "Ubicación de prueba",
      status: ProjectStatus.PUBLISHED,
      position: 2,
      publishedAt: new Date("2026-01-12T12:00:00.000Z"),
    },
  });

  const draftProject = await database.project.upsert({
    where: { slug: "estudio-borrador-demo" },
    update: {
      categoryId: renovation.id,
      name: "Estudio borrador demo",
      status: ProjectStatus.DRAFT,
      position: 3,
      publishedAt: null,
      deletedAt: null,
    },
    create: {
      categoryId: renovation.id,
      name: "Estudio borrador demo",
      slug: "estudio-borrador-demo",
      status: ProjectStatus.DRAFT,
      position: 3,
    },
  });

  const deletedProject = await database.project.upsert({
    where: { slug: "proyecto-papelera-demo" },
    update: {
      categoryId: residential.id,
      name: "Proyecto papelera demo",
      status: ProjectStatus.PUBLISHED,
      position: 4,
      publishedAt: new Date("2025-05-01T12:00:00.000Z"),
      deletedAt: new Date("2026-02-01T12:00:00.000Z"),
    },
    create: {
      categoryId: residential.id,
      name: "Proyecto papelera demo",
      slug: "proyecto-papelera-demo",
      status: ProjectStatus.PUBLISHED,
      position: 4,
      publishedAt: new Date("2025-05-01T12:00:00.000Z"),
      deletedAt: new Date("2026-02-01T12:00:00.000Z"),
    },
  });

  const images = [
    {
      projectId: publishedProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/courtyard-house-demo.webp",
      originalFilename: "courtyard-house-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1774,
      height: 887,
      originalBytes: 324070n,
      altText: "Render exterior ficticio de Casa Luz.",
      position: 0,
      isCover: true,
    },
    {
      projectId: publishedProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/stair-interior-demo.webp",
      originalFilename: "stair-interior-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1024,
      height: 1536,
      originalBytes: 166064n,
      altText: "Vista interior ficticia de Casa Luz.",
      position: 1,
      isCover: false,
    },
    {
      projectId: patioProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/brick-pavilion-demo.webp",
      originalFilename: "brick-pavilion-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1448,
      height: 1086,
      originalBytes: 356504n,
      altText:
        "Vista conceptual de un pabellón de ladrillo abierto hacia un jardín seco.",
      position: 0,
      isCover: true,
    },
    {
      projectId: patioProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/patio-tierra-detail-demo.webp",
      originalFilename: "patio-tierra-detail-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1536,
      height: 1024,
      originalBytes: 240438n,
      altText:
        "Detalle conceptual del encuentro entre celosía de ladrillo, concreto y patio.",
      position: 1,
      isCover: false,
    },
    {
      projectId: thresholdProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/casa-umbral-cover-demo.webp",
      originalFilename: "casa-umbral-cover-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1536,
      height: 1024,
      originalBytes: 230584n,
      altText:
        "Vista conceptual de una casa articulada por umbrales hacia un patio arbolado.",
      position: 0,
      isCover: true,
    },
    {
      projectId: thresholdProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/casa-umbral-stair-demo.webp",
      originalFilename: "casa-umbral-stair-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1122,
      height: 1402,
      originalBytes: 211158n,
      altText: "Escalera conceptual de piedra iluminada por un patio interior.",
      position: 1,
      isCover: false,
    },
    {
      projectId: draftProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/stair-interior-demo.webp",
      originalFilename: "stair-interior-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1200,
      height: 900,
      originalBytes: 190000n,
      altText: null,
      position: 0,
      isCover: false,
    },
    {
      projectId: deletedProject.id,
      storageKind: MediaStorageKind.BUNDLED,
      storageKey: "/images/concept/courtyard-house-demo.webp",
      originalFilename: "courtyard-house-demo.webp",
      originalFormat: "webp",
      originalSha256: null,
      displayFormat: "webp",
      variants: [],
      width: 1400,
      height: 1000,
      originalBytes: 220000n,
      altText: "Portada ficticia de un proyecto en papelera.",
      position: 0,
      isCover: true,
    },
  ];

  for (const image of images) {
    await database.projectImage.upsert({
      where: {
        projectId_position: {
          projectId: image.projectId,
          position: image.position,
        },
      },
      update: image,
      create: image,
    });
  }

  if (options.mode === "test") {
    const passwordHash = await argon2.hash("test-only-password-123!", {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    await database.adminUser.upsert({
      where: { singletonKey: "owner" },
      update: {
        email: "admin@075arquitectura.test",
        passwordHash,
        isActive: true,
      },
      create: {
        singletonKey: "owner",
        email: "admin@075arquitectura.test",
        passwordHash,
      },
    });
  }
}
