import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página solicitada no existe o fue retirada del archivo.",
};

export default function RootNotFound() {
  return (
    <div className="public-root">
      <main className="project-not-found">
        <div>
          <p>Error 404 · 075arquitectura</p>
          <div className="project-loading__mark" style={{ marginTop: "1rem" }}>
            404
          </div>
        </div>

        <div>
          <h1>La página que buscas no existe o fue retirada del archivo.</h1>
        </div>

        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <Link href="/">Volver al inicio</Link>
          <Link href="/#proyectos">Ver proyectos</Link>
        </div>
      </main>
    </div>
  );
}
