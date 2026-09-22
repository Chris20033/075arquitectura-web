import "server-only";

import { ProjectStatus } from "@/generated/prisma/enums";
import { database } from "@/lib/db";
import type { DatabaseClient } from "@/lib/db/client";

import { getContentMode } from "./landing";
import {
  resolvePublicProjectImage,
  type PublicProjectImage,
} from "./project-images";

export type PublicProjectSummary = {
  name: string;
  slug: string;
  year: number | null;
  location: string | null;
  category: { name: string; slug: string };
  cover: PublicProjectImage;
};

export type PublicProjectNavigationItem = {
  name: string;
  slug: string;
};

export type PublicProjectDetail = PublicProjectSummary & {
  description: string | null;
  gallery: PublicProjectImage[];
  previous: PublicProjectNavigationItem | null;
  next: PublicProjectNavigationItem | null;
};

type ProjectQueryOptions = {
  mode?: "demo" | "live";
  cloudinaryUrl?: string;
};

async function findPublicProjectRecords(client: DatabaseClient) {
  return client.project.findMany({
    where: {
      status: ProjectStatus.PUBLISHED,
      deletedAt: null,
    },
    orderBy: { position: "asc" },
    select: {
      name: true,
      slug: true,
      description: true,
      year: true,
      location: true,
      category: { select: { name: true, slug: true } },
      images: {
        orderBy: { position: "asc" },
        select: {
          cloudinaryPublicId: true,
          cloudinaryVersion: true,
          width: true,
          height: true,
          altText: true,
          position: true,
          isCover: true,
        },
      },
    },
  });
}

function toRenderableProject(
  project: Awaited<ReturnType<typeof findPublicProjectRecords>>[number],
  options: ProjectQueryOptions,
) {
  if (
    project.images.length === 0 ||
    project.images.filter((image) => image.isCover).length !== 1 ||
    project.images.some(
      (image) =>
        image.width <= 0 || image.height <= 0 || !image.altText?.trim(),
    )
  ) {
    return null;
  }

  const images = project.images.map((image) =>
    resolvePublicProjectImage(image, options),
  );
  const cover = images.find((image) => image.isCover);
  if (!cover) {
    return null;
  }

  return {
    name: project.name,
    slug: project.slug,
    description: project.description,
    year: project.year,
    location: project.location,
    category: project.category,
    cover,
    gallery: images.filter((image) => !image.isCover),
  };
}

async function getRenderableProjects(
  client: DatabaseClient,
  options: ProjectQueryOptions,
) {
  const records = await findPublicProjectRecords(client);
  return records
    .map((project) => toRenderableProject(project, options))
    .filter((project): project is NonNullable<typeof project> =>
      Boolean(project),
    );
}

export async function getPublicProjects(
  client: DatabaseClient = database,
  options: ProjectQueryOptions = {},
): Promise<PublicProjectSummary[]> {
  const mode = options.mode ?? getContentMode();
  const projects = await getRenderableProjects(client, { ...options, mode });

  return projects.map((project) => ({
    name: project.name,
    slug: project.slug,
    year: project.year,
    location: project.location,
    category: project.category,
    cover: project.cover,
  }));
}

export async function getPublicProjectBySlug(
  slug: string,
  client: DatabaseClient = database,
  options: ProjectQueryOptions = {},
): Promise<PublicProjectDetail | null> {
  const mode = options.mode ?? getContentMode();
  const projects = await getRenderableProjects(client, { ...options, mode });
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0) {
    return null;
  }

  const project = projects[index];
  const adjacent = (candidate: (typeof projects)[number] | undefined) =>
    candidate ? { name: candidate.name, slug: candidate.slug } : null;

  if (projects.length === 1) {
    return { ...project, previous: null, next: null };
  }

  return {
    ...project,
    previous: adjacent(
      projects[(index - 1 + projects.length) % projects.length],
    ),
    next: adjacent(projects[(index + 1) % projects.length]),
  };
}

export async function getPublicProjectSlugs(
  client: DatabaseClient = database,
  options: ProjectQueryOptions = {},
) {
  const projects = await getPublicProjects(client, options);
  return projects.map((project) => project.slug);
}
