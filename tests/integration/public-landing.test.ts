import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { MediaStorageKind } from "@/generated/prisma/enums";
import { createDatabaseClient } from "@/lib/db/client";
import {
  normalizeEmailUrl,
  normalizeSocialUrl,
  normalizeWhatsAppUrl,
} from "@/lib/public/contact";
import { getPublicLandingData } from "@/lib/public/landing";
import { seedDatabase } from "@/prisma/seed-data";
import { getSafeTestDatabaseUrl } from "@/scripts/test-database";

const database = createDatabaseClient(getSafeTestDatabaseUrl());

beforeEach(async () => {
  await seedDatabase(database, { mode: "test", reset: true });
});

afterAll(async () => {
  await database.$disconnect();
});

describe("public landing data", () => {
  it("returns only visible social links in editorial order", async () => {
    const profile = await database.siteProfile.findUniqueOrThrow({
      where: { singletonKey: "default" },
    });
    await database.socialLink.update({
      where: {
        siteProfileId_position: { siteProfileId: profile.id, position: 0 },
      },
      data: { isVisible: false },
    });

    const landing = await getPublicLandingData(database);

    expect(landing.profile?.socialLinks).toEqual([
      {
        id: expect.any(String),
        platform: "PINTEREST",
        username: "075arquitectura_demo",
        displayName: "@075arquitectura_demo",
        href: null,
      },
    ]);
  });

  it("preserves optional fields and handles a missing profile", async () => {
    await database.siteProfile.update({
      where: { singletonKey: "default" },
      data: { biography: null, publicEmail: null, publicPhone: null },
    });

    const incomplete = await getPublicLandingData(database);
    expect(incomplete.profile).toMatchObject({
      biography: null,
      publicEmail: null,
      publicPhone: null,
    });

    await database.siteProfile.delete({ where: { singletonKey: "default" } });
    await expect(getPublicLandingData(database)).resolves.toMatchObject({
      profile: null,
      heroImage: null,
    });
  });

  it("exposes only the selected platform and username for an active social link", async () => {
    const profile = await database.siteProfile.findUniqueOrThrow({
      where: { singletonKey: "default" },
    });
    await database.socialLink.update({
      where: {
        siteProfileId_position: { siteProfileId: profile.id, position: 0 },
      },
      data: {
        platform: "INSTAGRAM",
        username: "estudio_075",
        label: "Instagram",
        url: "https://instagram.com/estudio_075",
      },
    });

    const landing = await getPublicLandingData(database);
    expect(landing.profile?.socialLinks[0]).toEqual({
      id: expect.any(String),
      platform: "INSTAGRAM",
      username: "estudio_075",
      displayName: "@estudio_075",
      href: "https://instagram.com/estudio_075",
    });
  });

  it("returns an independent hero instead of deriving it from project order", async () => {
    const profile = await database.siteProfile.findUniqueOrThrow({
      where: { singletonKey: "default" },
    });
    await database.siteHeroImage.create({
      data: {
        siteProfileId: profile.id,
        mediaKey: "00000000-0000-7000-8000-000000000123",
        storageKind: MediaStorageKind.LOCAL,
        storageKey: "site/hero/00000000-0000-7000-8000-000000000123",
        originalFilename: "landing.jpg",
        originalFormat: "jpeg",
        originalBytes: 1_000_000n,
        originalSha256: "a".repeat(64),
        displayFormat: "webp",
        variants: [
          { name: "laptop", width: 1280, height: 853, bytes: 120_000 },
        ],
        width: 1800,
        height: 1200,
        altText: "Patio principal del estudio",
      },
    });

    const landing = await getPublicLandingData(database);
    expect(landing.heroImage).toMatchObject({
      alt: "Patio principal del estudio",
      width: 1800,
      height: 1200,
    });
    expect(landing.heroImage?.src).toBe(
      "/media/00000000-0000-7000-8000-000000000123/__variant__",
    );
  });
});

describe("public contact normalization", () => {
  it("normalizes valid WhatsApp numbers and blocks demo values", () => {
    expect(normalizeWhatsAppUrl("+52 (449) 123-4567")).toBe(
      "https://wa.me/524491234567",
    );
    expect(normalizeWhatsAppUrl("+52 000 000 0000")).toBeNull();
    expect(normalizeWhatsAppUrl("123")).toBeNull();
  });

  it("blocks placeholder email and unsafe social URLs", () => {
    expect(normalizeEmailUrl("hola@estudio.mx")).toBe("mailto:hola@estudio.mx");
    expect(normalizeEmailUrl("contacto@075arquitectura.test")).toBeNull();
    expect(normalizeSocialUrl("https://example.invalid/instagram")).toBeNull();
    expect(normalizeSocialUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSocialUrl("https://instagram.com/075arquitectura")).toBe(
      "https://instagram.com/075arquitectura",
    );
  });
});
