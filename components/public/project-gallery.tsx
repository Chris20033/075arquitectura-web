"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";

import { ProjectImage } from "@/components/public/project-image";
import type { PublicProjectImage } from "@/lib/public/project-images";

type ProjectGalleryProps = {
  images: PublicProjectImage[];
  projectName: string;
};

function circularIndex(index: number, length: number) {
  return (index + length) % length;
}

export function ProjectGallery({ images, projectName }: ProjectGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastTriggerIndex = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const track = trackRef.current;
      if (!track) return;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      track.scrollTo({
        left: index * track.clientWidth,
        behavior: reducedMotion ? "auto" : behavior,
      });
    },
    [],
  );

  const goTo = useCallback(
    (requestedIndex: number) => {
      const nextIndex = circularIndex(requestedIndex, images.length);
      setActiveIndex(nextIndex);
      scrollToIndex(nextIndex);
    },
    [images.length, scrollToIndex],
  );

  const restorePage = useCallback(() => {
    document.documentElement.classList.remove("public-lightbox-open");
    triggerRefs.current[lastTriggerIndex.current]?.focus();
  }, []);

  function openViewer(index: number) {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    lastTriggerIndex.current = index;
    setActiveIndex(index);
    document.documentElement.classList.add("public-lightbox-open");
    dialog.showModal();
    window.requestAnimationFrame(() => scrollToIndex(index, "auto"));
  }

  function closeViewer() {
    dialogRef.current?.close();
  }

  function updateActiveImage(event: UIEvent<HTMLDivElement>) {
    const track = event.currentTarget;
    if (!track.clientWidth) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    if (nextIndex >= 0 && nextIndex < images.length) {
      setActiveIndex(nextIndex);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!dialogRef.current?.open || images.length < 2) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeIndex + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.documentElement.classList.remove("public-lightbox-open");
    };
  }, [activeIndex, goTo, images.length]);

  if (images.length === 0) return null;

  return (
    <section
      className="project-detail-gallery"
      aria-label={`Galería de ${projectName}`}
    >
      <div className="project-detail-gallery__grid">
        {images.map((image, index) => (
          <figure
            className="project-detail-gallery__figure"
            key={`${projectName}-${image.position}`}
          >
            <button
              ref={(element) => {
                triggerRefs.current[index] = element;
              }}
              className="project-detail-gallery__trigger"
              type="button"
              onClick={() => openViewer(index)}
              aria-label={`Abrir imagen ${index + 1} de ${images.length}: ${image.alt}`}
            >
              <span className="project-detail-gallery__media">
                <ProjectImage
                  image={image}
                  sizes="(max-width: 700px) 50vw, (max-width: 1100px) 50vw, 33vw"
                />
              </span>
            </button>
            <figcaption>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{image.alt}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="project-lightbox"
        aria-label={`Visor de imágenes de ${projectName}`}
        onClose={restorePage}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeViewer();
        }}
      >
        <header className="project-lightbox__header">
          <p>{projectName}</p>
          <p aria-live="polite">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(images.length).padStart(2, "0")}
          </p>
          <button type="button" onClick={closeViewer}>
            Cerrar
          </button>
        </header>

        <div
          ref={trackRef}
          className="project-lightbox__track"
          onScroll={updateActiveImage}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
            touchStartIndex.current = activeIndex;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null || images.length < 2) return;
            const endX = event.changedTouches[0]?.clientX;
            if (endX === undefined) return;
            const distance = touchStartX.current - endX;
            touchStartX.current = null;
            if (Math.abs(distance) < 50) return;
            goTo(touchStartIndex.current + (distance > 0 ? 1 : -1));
          }}
          onTouchCancel={() => {
            touchStartX.current = null;
          }}
        >
          {images.map((image, index) => (
            <figure
              className="project-lightbox__slide"
              key={`viewer-${projectName}-${image.position}`}
              aria-hidden={activeIndex !== index}
              onClick={(event) => {
                if (
                  event.target === event.currentTarget ||
                  event.target === event.currentTarget.firstElementChild
                ) {
                  closeViewer();
                }
              }}
            >
              <div className="project-lightbox__image">
                <ProjectImage image={image} sizes="100vw" />
              </div>
              <figcaption>{image.alt}</figcaption>
            </figure>
          ))}
        </div>

        {images.length > 1 ? (
          <div className="project-lightbox__navigation">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Ver imagen anterior"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Ver imagen siguiente"
            >
              Siguiente
            </button>
          </div>
        ) : null}

        {images.length > 1 ? (
          <p className="project-lightbox__mobile-hint">
            Desliza para continuar
          </p>
        ) : null}
      </dialog>
    </section>
  );
}
