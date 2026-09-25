import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ProjectStatus } from "@/generated/prisma/enums";
import { createDatabaseClient } from "@/lib/db/client";
import { getPublicImageUrl } from "@/lib/public/project-images";
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
    expect(JSON.stringify(projects)).not.toContain("storageKey");
    expect(JSON.stringify(projects)).not.toContain("originalSha256");
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

    await database.projectImage.updateMany({
      where: {
        project: { slug: "patio-de-tierra-demo" },
        isCover: false,
      },
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
  it("uses bundled assets for demonstration projects", async () => {
    const demo = await getPublicProjectBySlug("casa-luz-demo", database, {
      mode: "demo",
    });
    expect(demo?.cover).toMatchObject({
      kind: "bundled",
      src: "/images/concept/courtyard-house-demo.webp",
    });
  });

  it("selects the nearest generated WebP variant without exposing storage", () => {
    const image = {
      kind: "managed" as const,
      src: "/media/00000000-0000-7000-8000-000000000123/__variant__",
      width: 1800,
      height: 1200,
      alt: "Vista de prueba",
      position: 0,
      isCover: true,
      variants: [
        { name: "mobile" as const, width: 480, height: 320 },
        { name: "tablet" as const, width: 768, height: 512 },
        { name: "laptop" as const, width: 1280, height: 853 },
        { name: "desktop" as const, width: 1800, height: 1200 },
      ],
    };
    expect(getPublicImageUrl(image, 900)).toContain("/laptop");
    expect(getPublicImageUrl(image, 2400)).toContain("/desktop");
    expect(JSON.stringify(image)).not.toContain("uploads/");
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
    expect(JSON.stringify(metadata)).not.toContain("storageKey");
    expect(JSON.stringify(metadata)).not.toContain("originalSha256");
  });
});
