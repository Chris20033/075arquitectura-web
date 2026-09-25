import Link from "next/link";

import { ReorderList } from "@/components/admin/reorder-list";
import { reorderProjectsAction } from "@/lib/admin/content-actions";
import { getAdminProjects } from "@/lib/admin/content-queries";

type ProjectsPageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const filters = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Borradores" },
  { value: "published", label: "Publicados" },
] as const;

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const requested = (await searchParams).estado;
  const filter = filters.some((item) => item.value === requested)
    ? (requested as (typeof filters)[number]["value"])
    : "all";
  const [projects, published] = await Promise.all([
    getAdminProjects(filter),
    getAdminProjects("published"),
  ]);

  return (
    <article className="admin-page">
      <header className="admin-page__header admin-page__header--action">
        <div>
          <h1 className="admin-page__title">Proyectos</h1>
          <p className="admin-page__intro">
            Crea, completa y publica tus proyectos desde un solo lugar.
          </p>
        </div>
        <div className="admin-page__actions">
          <Link className="admin-text-action" href="/admin/categorias">
            Tipos de proyecto
          </Link>
          <Link
            className="admin-button"
            data-tone="primary"
            href="/admin/proyectos/nuevo"
          >
            Crear proyecto
          </Link>
        </div>
      </header>

      <nav className="admin-filter" aria-label="Filtrar proyectos">
        {filters.map((item) => (
          <Link
            key={item.value}
            href={
              item.value === "all"
                ? "/admin/proyectos"
                : `/admin/proyectos?estado=${item.value}`
            }
            aria-current={filter === item.value ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {projects.length === 0 ? (
        <div className="admin-empty admin-empty--large">
          <h2>No hay proyectos en esta vista.</h2>
          <p>Crea un borrador o cambia el filtro para continuar.</p>
        </div>
      ) : (
        <div className="admin-project-list">
          {projects.map((project) => (
            <Link
              href={`/admin/proyectos/${project.id}`}
              className="admin-project-row"
              key={project.id}
            >
              <span
                className="admin-project-row__state"
                data-state={project.status.toLowerCase()}
              >
                {project.status === "PUBLISHED" ? "Publicado" : "Borrador"}
              </span>
              <span className="admin-project-row__name">
                <strong>{project.name}</strong>
              </span>
              <span>{project.category}</span>
              <span>{project.imageCount} imágenes</span>
              <time dateTime={project.updatedAt}>
                {new Intl.DateTimeFormat("es-MX", {
                  dateStyle: "medium",
                }).format(new Date(project.updatedAt))}
              </time>
            </Link>
          ))}
        </div>
      )}

      <section
        className="admin-section admin-section--spaced"
        aria-labelledby="project-order-title"
      >
        <div className="admin-section__header">
          <h2 id="project-order-title">Orden en el sitio</h2>
          <span>Solo aparecen los proyectos publicados</span>
        </div>
        <ReorderList
          items={published.map((project) => ({
            id: project.id,
            title: project.name,
            meta: project.category,
          }))}
          action={reorderProjectsAction}
          emptyMessage="Publica un proyecto para construir el orden del portafolio."
        />
      </section>
    </article>
  );
}
