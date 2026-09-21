import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { ProjectImage } from "@/components/public/project-image";
import { PublicNavigation } from "@/components/public/public-navigation";
import { getContentMode } from "@/lib/public/landing";
import { buildProjectMetadata } from "@/lib/public/project-metadata";
import { getPublicProjectBySlug } from "@/lib/public/projects";
import { getSiteUrl } from "@/lib/public/site-url";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

const readProject = cache((slug: string) => getPublicProjectBySlug(slug));

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await readProject(slug);
  if (!project) {
    notFound();
  }

  return buildProjectMetadata(project, getSiteUrl());
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  await connection();
  const { slug } = await params;
  const project = await readProject(slug);
  if (!project) {
    notFound();
  }

  const isDemo = getContentMode() === "demo";
  const adjacentAreEqual = project.previous?.slug === project.next?.slug;

  return (
    <>
      <a className="public-skip-link" href="#contenido-proyecto">
        Saltar al contenido
      </a>
      <PublicNavigation />

      <main id="contenido-proyecto">
        <section className="project-detail-hero" id="inicio">
          <ProjectImage
            image={project.cover}
            className="project-detail-hero__image"
            fill
            priority
            sizes="100vw"
          />
          <div className="project-detail-hero__wash" />
          <div className="project-detail-hero__heading">
            <p>{project.category.name}</p>
            <h1>{project.name}</h1>
          </div>
          <dl className="project-detail-hero__facts">
            {project.year && (
              <div>
                <dt>Año</dt>
                <dd>{project.year}</dd>
              </div>
            )}
            {project.location && (
              <div>
                <dt>Ubicación</dt>
                <dd>{project.location}</dd>
              </div>
            )}
          </dl>
          {isDemo && <p className="project-detail-hero__demo">Proyecto demo</p>}
        </section>

        <section className="project-detail-intro">
          <Link href="/#proyectos">Volver al archivo</Link>
          <div>
            <p className="project-detail-intro__category">
              {project.category.name}
            </p>
            {project.description && <p>{project.description}</p>}
          </div>
        </section>

        {project.gallery.length > 0 && (
          <section
            className="project-detail-gallery"
            aria-label={`Galería de ${project.name}`}
          >
            {project.gallery.map((image) => (
              <figure
                className="project-detail-gallery__figure"
                key={`${project.slug}-${image.position}`}
              >
                <ProjectImage
                  image={image}
                  sizes="(max-width: 700px) 100vw, 86vw"
                />
                <figcaption>
                  <span>{String(image.position + 1).padStart(2, "0")}</span>
                  <span>{image.alt}</span>
                </figcaption>
              </figure>
            ))}
          </section>
        )}

        <nav className="project-detail-adjacent" aria-label="Otros proyectos">
          {project.previous && !adjacentAreEqual && (
            <Link href={`/proyectos/${project.previous.slug}`}>
              <span>Anterior</span>
              <strong>{project.previous.name}</strong>
            </Link>
          )}
          {project.next && (
            <Link
              className="project-detail-adjacent__next"
              href={`/proyectos/${project.next.slug}`}
            >
              <span>{adjacentAreEqual ? "Otro proyecto" : "Siguiente"}</span>
              <strong>{project.next.name}</strong>
            </Link>
          )}
        </nav>
      </main>

      <footer className="public-footer">
        <span>075arquitectura</span>
        <span>© {new Date().getFullYear()}</span>
        <Link href="/#proyectos">Archivo</Link>
      </footer>
    </>
  );
}
