import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ProjectStatus } from "@/generated/prisma/enums";
import { createDatabaseClient } from "@/lib/db/client";
import {
  buildCloudinaryImageTemplate,
  getCloudinaryCloudName,
  getPublicImageUrl,
  PublicImageConfigurationError,
  resolveCloudinaryImageUrl,
} from "@/lib/public/project-images";
import {
  buildProjectMetadata,
  buildPublicSitemap,
} from "@/lib/public/project-metadata";
import {
  getPublicProjectBySlug,
  getPublicProjects,
  getPublicProjectSlugs,
} from "@/lib/public/projects";
import { seedDatabase } from "@/prisma/seed-data";
import { getSafeTestDatabaseUrl } from "@/scripts/test-database";

const database = createDatabaseClient(getSafeTestDatabaseUrl());

beforeEach(async () => {
  await seedDatabase(database, { mode: "test", reset: true });
});

afterAll(async () => {
  await database.$disconnect();
});

describe("public project catalogue", () => {
  it("returns only renderable public projects in manual order", async () => {
    const projects = await getPublicProjects(database, { mode: "demo" });

    expect(projects.map((project) => project.slug)).toEqual([
      "casa-luz-demo",
      "patio-de-tierra-demo",
      "casa-umbral-demo",
    ]);
    expect(Object.keys(projects[0]).sort()).toEqual(
      ["category", "cover", "location", "name", "slug", "year"].sort(),
    );
    expect(JSON.stringify(projects)).not.toContain("cloudinaryAssetId");
    expect(JSON.stringify(projects)).not.toContain("secureUrl");
    expect(JSON.stringify(projects)).not.toContain("bytes");
  });

  it("treats drafts, trash, unknown slugs, and invalid projects as not public", async () => {
    await expect(
      getPublicProjectBySlug("estudio-borrador-demo", database, {
        mode: "demo",
      }),
    ).resolves.toBeNull();
    await expect(
      getPublicProjectBySlug("proyecto-papelera-demo", database, {
        mode: "demo",
      }),
    ).resolves.toBeNull();
    await expect(
      getPublicProjectBySlug("no-existe", database, { mode: "demo" }),
    ).resolves.toBeNull();

    await database.projectImage.update({
      where: { cloudinaryAssetId: "demo-asset-patio-gallery" },
      data: { altText: null },
    });

    const projects = await getPublicProjects(database, { mode: "demo" });
    expect(projects.map((project) => project.slug)).not.toContain(
      "patio-de-tierra-demo",
    );
    await expect(
      getPublicProjectBySlug("patio-de-tierra-demo", database, {
        mode: "demo",
      }),
    ).resolves.toBeNull();
  });

  it("returns the ordered gallery and circular adjacent projects", async () => {
    const project = await getPublicProjectBySlug("casa-luz-demo", database, {
      mode: "demo",
    });

    expect(project).toMatchObject({
      previous: { slug: "casa-umbral-demo" },
      next: { slug: "patio-de-tierra-demo" },
    });
    expect(project?.cover.position).toBe(0);
    expect(project?.gallery.map((image) => image.position)).toEqual([1]);
  });

  it("handles adjacent navigation with one or two public projects", async () => {
    await database.project.update({
      where: { slug: "casa-umbral-demo" },
      data: { status: ProjectStatus.DRAFT },
    });
    const twoProjects = await getPublicProjectBySlug(
      "casa-luz-demo",
      database,
      { mode: "demo" },
    );
    expect(twoProjects?.previous?.slug).toBe("patio-de-tierra-demo");
    expect(twoProjects?.next?.slug).toBe("patio-de-tierra-demo");

    await database.project.update({
      where: { slug: "patio-de-tierra-demo" },
      data: { status: ProjectStatus.DRAFT },
    });
    const oneProject = await getPublicProjectBySlug("casa-luz-demo", database, {
      mode: "demo",
    });
    expect(oneProject?.previous).toBeNull();
    expect(oneProject?.next).toBeNull();
  });

  it("uses the same public projection for slugs and sitemap", async () => {
    const slugs = await getPublicProjectSlugs(database, { mode: "demo" });
    const sitemap = buildPublicSitemap(
      new URL("https://075arquitectura.example"),
      slugs,
    );

    expect(sitemap.map((entry) => entry.url)).toEqual([
      "https://075arquitectura.example/",
      "https://075arquitectura.example/proyectos/casa-luz-demo",
      "https://075arquitectura.example/proyectos/patio-de-tierra-demo",
      "https://075arquitectura.example/proyectos/casa-umbral-demo",
    ]);
    expect(JSON.stringify(sitemap)).not.toContain("borrador");
    expect(JSON.stringify(sitemap)).not.toContain("papelera");
  });
});

describe("public project image delivery", () => {
  it("builds versioned Cloudinary URLs without credentials and clamps widths", () => {
    const cloudinaryUrl = "cloudinary://api-key:api-secret@demo-cloud";
    expect(getCloudinaryCloudName(cloudinaryUrl)).toBe("demo-cloud");

    const template = buildCloudinaryImageTemplate({
      cloudName: "demo-cloud",
      publicId: "075 Arquitectura/proyecto/portada final",
      version: 42n,
    });
    const delivered = resolveCloudinaryImageUrl(template, 1600, 2400);

    expect(delivered).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/c_limit,w_1600/f_auto/q_auto/v42/075%20Arquitectura/proyecto/portada%20final",
    );
    expect(delivered).not.toContain("api-key");
    expect(delivered).not.toContain("api-secret");
  });

  it("uses allowlisted local assets only in demo mode", async () => {
    const demo = await getPublicProjectBySlug("casa-luz-demo", database, {
      mode: "demo",
    });
    expect(demo?.cover).toMatchObject({
      kind: "local",
      src: "/images/concept/courtyard-house-demo.webp",
    });

    const live = await getPublicProjectBySlug("casa-luz-demo", database, {
      mode: "live",
      cloudinaryUrl: "cloudinary://api-key:api-secret@demo-cloud",
    });
    expect(live?.cover.kind).toBe("cloudinary");
    expect(getPublicImageUrl(live!.cover, 900)).toContain(
      "/c_limit,w_900/f_auto/q_auto/v1/",
    );
    expect(getPublicImageUrl(live!.cover)).not.toContain("example.invalid");
  });

  it("fails closed when live image delivery is not configured", async () => {
    await expect(
      getPublicProjects(database, { mode: "live", cloudinaryUrl: "" }),
    ).rejects.toBeInstanceOf(PublicImageConfigurationError);
  });
});

describe("project metadata", () => {
  it("uses the public canonical URL and cover without internal fields", async () => {
    const project = await getPublicProjectBySlug("casa-luz-demo", database, {
      mode: "demo",
    });
    const metadata = buildProjectMetadata(
      project!,
      new URL("https://075arquitectura.example"),
    );

    expect(metadata.alternates).toEqual({
      canonical: "https://075arquitectura.example/proyectos/casa-luz-demo",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Casa Luz demo",
      images: [
        {
          url: "https://075arquitectura.example/images/concept/courtyard-house-demo.webp",
        },
      ],
    });
    expect(JSON.stringify(metadata)).not.toContain("cloudinaryAssetId");
    expect(JSON.stringify(metadata)).not.toContain("secureUrl");
  });
});
