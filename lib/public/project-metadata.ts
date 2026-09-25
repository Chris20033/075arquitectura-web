import "server-only";

import type { Metadata, MetadataRoute } from "next";

import { getPublicImageUrl } from "./project-images";
import type { PublicProjectDetail } from "./projects";

function metadataDescription(name: string, description: string | null) {
  const fallback = `${name}, proyecto de arquitectura presentado por 075arquitectura.`;
  const value = description?.trim() || fallback;
  return value.length > 160 ? `${value.slice(0, 157).trimEnd()}…` : value;
}

export function buildProjectMetadata(
  project: PublicProjectDetail,
  siteUrl: URL,
): Metadata {
  const canonical = new URL(`/proyectos/${project.slug}`, siteUrl);
  const imageUrl = new URL(getPublicImageUrl(project.cover, 1800), siteUrl);
  const description = metadataDescription(project.name, project.description);

  return {
    title: project.name,
    description,
    alternates: { canonical: canonical.toString() },
    openGraph: {
      type: "website",
      url: canonical.toString(),
      title: project.name,
      description,
      siteName: "075arquitectura",
      locale: "es_MX",
      images: [
        {
          url: imageUrl.toString(),
          width: project.cover.width,
          height: project.cover.height,
          alt: project.cover.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description,
      images: [{ url: imageUrl.toString(), alt: project.cover.alt }],
    },
  };
}

export function buildPublicSitemap(siteUrl: URL, slugs: string[]) {
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl.toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  entries.push(
    ...slugs.map((slug) => ({
      url: new URL(`/proyectos/${slug}`, siteUrl).toString(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  );

  return entries;
}
