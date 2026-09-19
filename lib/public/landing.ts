import "server-only";

import { database } from "@/lib/db";
import type { DatabaseClient } from "@/lib/db/client";

import {
  normalizeEmailUrl,
  normalizeSocialUrl,
  normalizeWhatsAppUrl,
} from "./contact";

export type PublicSocialLink = {
  label: string;
  url: string;
  href: string | null;
};

export type PublicSiteProfile = {
  professionalName: string;
  biography: string | null;
  whatsappPhone: string | null;
  whatsappHref: string | null;
  publicEmail: string | null;
  emailHref: string | null;
  publicPhone: string | null;
  socialLinks: PublicSocialLink[];
};

export type PublicLandingData = {
  mode: "demo" | "live";
  profile: PublicSiteProfile | null;
};

export function getContentMode(value = process.env.SITE_CONTENT_MODE) {
  return value === "live" ? "live" : "demo";
}

export async function getPublicLandingData(
  client: DatabaseClient = database,
): Promise<PublicLandingData> {
  const profile = await client.siteProfile.findUnique({
    where: { singletonKey: "default" },
    select: {
      professionalName: true,
      biography: true,
      whatsappPhone: true,
      publicEmail: true,
      publicPhone: true,
      socialLinks: {
        where: { isVisible: true },
        orderBy: { position: "asc" },
        select: { label: true, url: true },
      },
    },
  });

  return {
    mode: getContentMode(),
    profile: profile
      ? {
          ...profile,
          whatsappHref: normalizeWhatsAppUrl(profile.whatsappPhone),
          emailHref: normalizeEmailUrl(profile.publicEmail),
          socialLinks: profile.socialLinks.map((link) => ({
            ...link,
            href: normalizeSocialUrl(link.url),
          })),
        }
      : null,
  };
}
