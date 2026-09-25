import Link from "next/link";

import { getAdminDashboardData } from "@/lib/admin/dashboard";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  const metrics = [
    ["Proyectos totales", data.metrics.projects],
    ["Publicados", data.metrics.published],
    ["Borradores", data.metrics.drafts],
    ["En papelera", data.metrics.trash],
    ["Categorías", data.metrics.categories],
  ] as const;

  return (
    <article className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Inicio</h1>
        <time className="admin-page__date" dateTime={new Date().toISOString()}>
          {dateFormatter.format(new Date())}
        </time>
      </header>

      <section className="admin-summary" aria-labelledby="admin-next-action">
        <h2 className="admin-summary__lead" id="admin-next-action">
          ¿Qué quieres <span>hacer hoy?</span>
        </h2>
        <div className="admin-quick-actions">
          <Link href="/admin/proyectos/nuevo">
            <strong>Crear un proyecto</strong>
            <span>Añade la información y después sus imágenes.</span>
          </Link>
          {data.recentDraft ? (
            <Link href={`/admin/proyectos/${data.recentDraft.id}`}>
              <strong>Continuar “{data.recentDraft.name}”</strong>
              <span>Es el borrador que editaste más recientemente.</span>
            </Link>
          ) : (
            <Link href="/admin/proyectos">
              <strong>Ver mis proyectos</strong>
              <span>Consulta lo publicado y los borradores.</span>
            </Link>
          )}
          <Link href="/admin/perfil">
            <strong>Cambiar portada o contacto</strong>
            <span>Actualiza lo que las personas ven de tu estudio.</span>
          </Link>
          <Link href="/" target="_blank">
            <strong>Ver el sitio público</strong>
            <span>Se abrirá en una pestaña nueva.</span>
          </Link>
        </div>
      </section>

      <section
        className="admin-summary admin-summary--compact"
        aria-label="Resumen del contenido"
      >
        <dl className="admin-metrics">
          {metrics.map(([label, value]) => (
            <div className="admin-metric" key={label}>
              <dt>{label}</dt>
              <dd>{String(value).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="admin-worklist" aria-label="Tareas pendientes">
        <div className="admin-worklist__row">
          <span className="admin-label">Proyectos</span>
          <div>
            <h2>Proyectos y categorías</h2>
            <p>
              {data.metrics.drafts > 0
                ? `Tienes ${data.metrics.drafts} ${data.metrics.drafts === 1 ? "borrador pendiente" : "borradores pendientes"}.`
                : "No tienes borradores pendientes."}
            </p>
          </div>
          <Link className="admin-text-action" href="/admin/proyectos">
            Revisar proyectos
          </Link>
        </div>
        <div className="admin-worklist__row">
          <span className="admin-label">Mi sitio</span>
          <div>
            <h2>
              {data.profileCompletion.completed}/{data.profileCompletion.total}
              {" campos configurados"}
            </h2>
            <p>
              Nombre, biografía, contacto y redes alimentan directamente la
              experiencia pública.
            </p>
          </div>
          <Link
            className="admin-text-action"
            href="/admin/perfil?seccion=informacion"
          >
            Completar datos
          </Link>
        </div>
        <div className="admin-worklist__row">
          <span className="admin-label">Ayuda</span>
          <div>
            <h2>Trabaja paso a paso</h2>
            <p>
              Primero guarda la información, luego agrega imágenes y al final
              revisa antes de publicar.
            </p>
          </div>
          <span className="admin-status">3 pasos</span>
        </div>
      </section>
    </article>
  );
}
