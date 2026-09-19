import argon2 from "argon2";

import { ProjectStatus } from "../generated/prisma/enums";
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
    { label: "Instagram de prueba", url: "https://example.invalid/instagram" },
    { label: "Pinterest de prueba", url: "https://example.invalid/pinterest" },
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

  const draftProject = await database.project.upsert({
    where: { slug: "estudio-borrador-demo" },
    update: {
      categoryId: renovation.id,
      name: "Estudio borrador demo",
      status: ProjectStatus.DRAFT,
      position: 1,
      publishedAt: null,
      deletedAt: null,
    },
    create: {
      categoryId: renovation.id,
      name: "Estudio borrador demo",
      slug: "estudio-borrador-demo",
      status: ProjectStatus.DRAFT,
      position: 1,
    },
  });

  const deletedProject = await database.project.upsert({
    where: { slug: "proyecto-papelera-demo" },
    update: {
      categoryId: residential.id,
      name: "Proyecto papelera demo",
      status: ProjectStatus.PUBLISHED,
      position: 2,
      publishedAt: new Date("2025-05-01T12:00:00.000Z"),
      deletedAt: new Date("2026-02-01T12:00:00.000Z"),
    },
    create: {
      categoryId: residential.id,
      name: "Proyecto papelera demo",
      slug: "proyecto-papelera-demo",
      status: ProjectStatus.PUBLISHED,
      position: 2,
      publishedAt: new Date("2025-05-01T12:00:00.000Z"),
      deletedAt: new Date("2026-02-01T12:00:00.000Z"),
    },
  });

  const images = [
    {
      projectId: publishedProject.id,
      cloudinaryAssetId: "demo-asset-published-cover",
      cloudinaryPublicId: "075arquitectura/demo/casa-luz-cover",
      cloudinaryVersion: 1n,
      secureUrl: "https://example.invalid/cloudinary/casa-luz-cover.jpg",
      format: "jpg",
      width: 1800,
      height: 1200,
      bytes: 350000n,
      altText: "Render exterior ficticio de Casa Luz.",
      position: 0,
      isCover: true,
    },
    {
      projectId: publishedProject.id,
      cloudinaryAssetId: "demo-asset-published-gallery",
      cloudinaryPublicId: "075arquitectura/demo/casa-luz-gallery",
      cloudinaryVersion: 1n,
      secureUrl: "https://example.invalid/cloudinary/casa-luz-gallery.jpg",
      format: "jpg",
      width: 1600,
      height: 1200,
      bytes: 280000n,
      altText: "Vista interior ficticia de Casa Luz.",
      position: 1,
      isCover: false,
    },
    {
      projectId: draftProject.id,
      cloudinaryAssetId: "demo-asset-draft",
      cloudinaryPublicId: "075arquitectura/demo/draft",
      cloudinaryVersion: 1n,
      secureUrl: "https://example.invalid/cloudinary/draft.jpg",
      format: "jpg",
      width: 1200,
      height: 900,
      bytes: 190000n,
      altText: null,
      position: 0,
      isCover: false,
    },
    {
      projectId: deletedProject.id,
      cloudinaryAssetId: "demo-asset-deleted-cover",
      cloudinaryPublicId: "075arquitectura/demo/deleted-cover",
      cloudinaryVersion: 1n,
      secureUrl: "https://example.invalid/cloudinary/deleted-cover.jpg",
      format: "jpg",
      width: 1400,
      height: 1000,
      bytes: 220000n,
      altText: "Portada ficticia de un proyecto en papelera.",
      position: 0,
      isCover: true,
    },
  ];

  for (const image of images) {
    await database.projectImage.upsert({
      where: { cloudinaryAssetId: image.cloudinaryAssetId },
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
