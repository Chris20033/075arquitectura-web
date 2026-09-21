import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { buildPublicSitemap } from "@/lib/public/project-metadata";
import { getPublicProjectSlugs } from "@/lib/public/projects";
import { getSiteUrl } from "@/lib/public/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const siteUrl = getSiteUrl();
  try {
    const slugs = await getPublicProjectSlugs();
    return buildPublicSitemap(siteUrl, slugs);
  } catch {
    // Keep the root discoverable without exposing database or configuration errors.
    return buildPublicSitemap(siteUrl, []);
  }
}
