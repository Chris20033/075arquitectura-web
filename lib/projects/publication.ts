import type { DatabaseClient } from "@/lib/db/client";

export const publicationIssueCodes = [
  "PROJECT_NOT_FOUND",
  "PROJECT_IN_TRASH",
  "NAME_REQUIRED",
  "SLUG_REQUIRED",
  "IMAGE_REQUIRED",
  "COVER_REQUIRED",
  "IMAGE_ALT_TEXT_REQUIRED",
] as const;

export type PublicationIssueCode = (typeof publicationIssueCodes)[number];

export type PublicationCandidate = {
  name: string;
  slug: string;
  deletedAt: Date | null;
  images: Array<{
    altText: string | null;
    isCover: boolean;
  }>;
};

export function getPublicationIssuesForCandidate(
  project: PublicationCandidate,
): PublicationIssueCode[] {
  const issues: PublicationIssueCode[] = [];

  if (project.deletedAt) issues.push("PROJECT_IN_TRASH");
  if (!project.name.trim()) issues.push("NAME_REQUIRED");
  if (!project.slug.trim()) issues.push("SLUG_REQUIRED");
  if (project.images.length === 0) issues.push("IMAGE_REQUIRED");
  if (!project.images.some((image) => image.isCover)) {
    issues.push("COVER_REQUIRED");
  }
  if (project.images.some((image) => !image.altText?.trim())) {
    issues.push("IMAGE_ALT_TEXT_REQUIRED");
  }

  return issues;
}

export async function getPublicationIssues(
  database: DatabaseClient,
  projectId: string,
): Promise<PublicationIssueCode[]> {
  const project = await database.project.findUnique({
    where: { id: projectId },
    select: {
      name: true,
      slug: true,
      deletedAt: true,
      images: {
        select: {
          altText: true,
          isCover: true,
        },
      },
    },
  });

  if (!project) {
    return ["PROJECT_NOT_FOUND"];
  }

  return getPublicationIssuesForCandidate(project);
}
