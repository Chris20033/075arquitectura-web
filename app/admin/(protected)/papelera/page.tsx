import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  permanentlyDeleteProjectAction,
  restoreProjectAction,
} from "@/lib/admin/content-actions";
import { getAdminTrash } from "@/lib/admin/content-queries";

export default async function TrashPage() {
  const projects = await getAdminTrash();

  return (
    <article className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Papelera</h1>
          <p className="admin-page__intro">
            Recupera contenido conservado o elimina borradores sin imágenes de
            forma definitiva.
          </p>
        </div>
        <span className="admin-page__date">{projects.length} archivados</span>
      </header>

      {projects.length === 0 ? (
        <div className="admin-empty admin-empty--large">
          <h2>La papelera está vacía.</h2>
          <p>
            Los proyectos enviados aquí se conservarán sin caducidad automática.
          </p>
        </div>
      ) : (
        <div className="admin-trash-list">
          {projects.map((project) => (
            <article className="admin-trash-row" key={project.id}>
              <div>
                <span
                  className="admin-project-row__state"
                  data-state={project.status.toLowerCase()}
                >
                  Antes:{" "}
                  {project.status === "PUBLISHED" ? "Publicado" : "Borrador"}
                </span>
                <h2>{project.name}</h2>
                <p>
                  {project.category} · Eliminado el{" "}
                  {new Intl.DateTimeFormat("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(project.deletedAt))}
                </p>
              </div>
              <div className="admin-trash-row__actions">
                <ConfirmDialog
                  action={restoreProjectAction.bind(null, project.id)}
                  title={`Restaurar ${project.name}`}
                  description="Si todavía cumple los requisitos volverá publicado; de lo contrario quedará como borrador."
                  triggerLabel="Restaurar"
                  confirmLabel="Restaurar proyecto"
                  hiddenFields={{ updatedAt: project.updatedAt }}
                />
                <ConfirmDialog
                  action={permanentlyDeleteProjectAction.bind(null, project.id)}
                  title={`Eliminar ${project.name}`}
                  description={
                    project.imageCount > 0
                      ? "Este proyecto conserva imágenes. La eliminación remota estará disponible en Sprint 7."
                      : "Esta acción es irreversible y eliminará el proyecto de PostgreSQL."
                  }
                  triggerLabel={
                    project.imageCount > 0
                      ? "Eliminación pendiente"
                      : "Eliminar definitivamente"
                  }
                  confirmLabel="Eliminar definitivamente"
                  confirmationName={project.name}
                  tone="danger"
                  disabled={project.imageCount > 0}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
