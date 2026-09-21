"use client";

import Link from "next/link";

export default function ProjectError({ reset }: { reset: () => void }) {
  return (
    <main className="project-not-found">
      <p>No pudimos abrir el proyecto</p>
      <h1>El archivo encontró un problema temporal.</h1>
      <div className="project-error__actions">
        <button type="button" onClick={reset}>
          Intentar de nuevo
        </button>
        <Link href="/#proyectos">Volver a proyectos</Link>
      </div>
    </main>
  );
}
