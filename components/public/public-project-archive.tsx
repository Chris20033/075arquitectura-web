"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicProjectSummary } from "@/lib/public/projects";

import { ProjectImage } from "./project-image";

type PublicProjectArchiveProps = {
  projects: PublicProjectSummary[];
};

function formatIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function PublicProjectArchive({ projects }: PublicProjectArchiveProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const projectRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const frameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveProject = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const trackLeft = track.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    projectRefs.current.forEach((project, index) => {
      if (!project) return;
      const distance = Math.abs(
        project.getBoundingClientRect().left - trackLeft,
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const scheduleUpdate = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(updateActiveProject);
    };

    updateActiveProject();
    track.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      track.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [updateActiveProject]);

  const goToProject = useCallback(
    (index: number) => {
      const targetIndex = Math.max(0, Math.min(projects.length - 1, index));
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      projectRefs.current[targetIndex]?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "start",
      });
      setActiveIndex(targetIndex);
    },
    [projects.length],
  );

  return (
    <div className="public-project-archive">
      <div
        ref={trackRef}
        className="public-project-archive__track"
        role="region"
        aria-label="Archivo de proyectos publicados"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            goToProject(activeIndex - 1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            goToProject(activeIndex + 1);
          }
        }}
      >
        {projects.map((project, index) => (
          <Link
            ref={(element) => {
              projectRefs.current[index] = element;
            }}
            className="public-project-archive__project"
            href={`/proyectos/${project.slug}`}
            key={project.slug}
            aria-label={`Ver ${project.name}`}
          >
            <figure>
              <div className="public-project-archive__media">
                <ProjectImage
                  image={project.cover}
                  fill
                  sizes="(max-width: 700px) 86vw, (max-width: 900px) 78vw, 72vw"
                />
                <span
                  aria-hidden="true"
                  className="public-project-archive__number"
                >
                  {formatIndex(index)}
                </span>
              </div>
              <figcaption>
                <span className="public-project-archive__name">
                  {project.name}
                </span>
                <span className="public-project-archive__meta">
                  {project.category.name}
                  {project.year ? ` · ${project.year}` : ""}
                </span>
              </figcaption>
            </figure>
          </Link>
        ))}
      </div>

      <div className="public-project-archive__controls">
        <p
          className="public-project-archive__counter"
          aria-label={`Proyecto ${activeIndex + 1} de ${projects.length}`}
        >
          <span aria-hidden="true">{formatIndex(activeIndex)}</span>
          <span aria-hidden="true">/</span>
          <span aria-hidden="true">{formatIndex(projects.length - 1)}</span>
        </p>
        <div className="public-project-archive__progress" aria-hidden="true">
          <span
            style={{
              transform: `scaleX(${(activeIndex + 1) / projects.length})`,
            }}
          />
        </div>
        <div className="public-project-archive__actions">
          <button
            type="button"
            onClick={() => goToProject(activeIndex - 1)}
            disabled={activeIndex === 0}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => goToProject(activeIndex + 1)}
            disabled={activeIndex === projects.length - 1}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
