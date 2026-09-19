import { afterAll, beforeEach, describe, expect, it } from "vitest";

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
        label: "Pinterest de prueba",
        url: "https://example.invalid/pinterest",
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
    });
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
