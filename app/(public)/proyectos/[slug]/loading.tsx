export default function ProjectLoading() {
  return (
    <main
      className="project-loading"
      aria-busy="true"
      aria-label="Cargando proyecto"
    >
      <div className="project-loading__mark">075</div>
      <div className="project-loading__line" />
      <p>Abriendo proyecto</p>
    </main>
  );
}
