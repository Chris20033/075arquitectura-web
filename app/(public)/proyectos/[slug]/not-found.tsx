import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="project-not-found">
      <p>Proyecto no encontrado</p>
      <h1>Este proyecto no forma parte del archivo público.</h1>
      <Link href="/#proyectos">Volver a proyectos</Link>
    </main>
  );
}
