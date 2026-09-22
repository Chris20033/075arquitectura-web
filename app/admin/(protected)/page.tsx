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
        <h1 className="admin-page__title">Resumen</h1>
        <time className="admin-page__date" dateTime={new Date().toISOString()}>
          {dateFormatter.format(new Date())}
        </time>
      </header>

      <section className="admin-summary" aria-labelledby="estado-portafolio">
        <h2 className="admin-summary__lead" id="estado-portafolio">
          El portafolio está listo para su <span>siguiente etapa.</span>
        </h2>
        <dl className="admin-metrics">
          {metrics.map(([label, value]) => (
            <div className="admin-metric" key={label}>
              <dt>{label}</dt>
              <dd>{String(value).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="admin-worklist" aria-label="Estado de módulos">
        <div className="admin-worklist__row">
          <span className="admin-label">Contenido</span>
          <div>
            <h2>Proyectos y categorías</h2>
            <p>
              Crea borradores, edita fichas, publica y ajusta el orden editorial
              desde el archivo.
            </p>
          </div>
          <span className="admin-status">Disponible</span>
        </div>
        <div className="admin-worklist__row">
          <span className="admin-label">Perfil</span>
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
          <span className="admin-status">Disponible</span>
        </div>
        <div className="admin-worklist__row">
          <span className="admin-label">Imágenes</span>
          <div>
            <h2>Galerías y portadas</h2>
            <p>
              La carga segura, el orden y el ciclo de vida en Cloudinary se
              integrarán después de la gestión editorial.
            </p>
          </div>
          <span className="admin-status">Sprint 7</span>
        </div>
      </section>
    </article>
  );
}
