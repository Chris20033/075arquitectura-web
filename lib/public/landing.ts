import "server-only";

import { database } from "@/lib/db";
import type { DatabaseClient } from "@/lib/db/client";

import {
  resolvePublicProjectImage,
  type PublicProjectImage,
} from "./project-images";

import {
  normalizeEmailUrl,
  normalizeSocialUrl,
  normalizeWhatsAppUrl,
} from "./contact";
import {
  socialLinkDisplayName,
  type SocialNetwork,
} from "@/lib/social-networks";

export type PublicSocialLink = {
  id: string;
  platform: SocialNetwork;
  username: string | null;
  displayName: string;
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

export type PublicHeroImage = PublicProjectImage;

export type PublicLandingData = {
  mode: "demo" | "live";
  profile: PublicSiteProfile | null;
  heroImage: PublicHeroImage | null;
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
      heroImage: {
        select: {
          mediaKey: true,
          storageKind: true,
          storageKey: true,
          variants: true,
          width: true,
          height: true,
          altText: true,
        },
      },
      socialLinks: {
        where: { isVisible: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          platform: true,
          username: true,
          label: true,
          url: true,
        },
      },
    },
  });

  const mode = getContentMode();
  return {
    mode,
    heroImage: profile?.heroImage
      ? resolvePublicProjectImage({
          ...profile.heroImage,
          position: 0,
          isCover: true,
        })
      : null,
    profile: profile
      ? {
          professionalName: profile.professionalName,
          biography: profile.biography,
          whatsappPhone: profile.whatsappPhone,
          publicEmail: profile.publicEmail,
          publicPhone: profile.publicPhone,
          whatsappHref: normalizeWhatsAppUrl(profile.whatsappPhone),
          emailHref: normalizeEmailUrl(profile.publicEmail),
          socialLinks: profile.socialLinks.map((link) => ({
            id: link.id,
            platform: link.platform as SocialNetwork,
            username: link.username,
            displayName: socialLinkDisplayName({
              platform: link.platform as SocialNetwork,
              username: link.username,
              label: link.label,
            }),
            href: normalizeSocialUrl(link.url),
          })),
        }
      : null,
  };
}
