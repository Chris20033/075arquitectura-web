import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  publishProjectAction,
  trashProjectAction,
  unpublishProjectAction,
  updateProjectAction,
} from "@/lib/admin/content-actions";
import { getAdminProject } from "@/lib/admin/content-queries";
import type { PublicationIssueCode } from "@/lib/projects/publication";

type ProjectEditorPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: string }>;
};

const issueLabels: Record<PublicationIssueCode, string> = {
  PROJECT_NOT_FOUND: "El proyecto no existe.",
  PROJECT_IN_TRASH: "El proyecto está en la papelera.",
  NAME_REQUIRED: "Añade un nombre.",
  SLUG_REQUIRED: "Genera un slug válido.",
  IMAGE_REQUIRED: "Añade al menos una imagen en Sprint 7.",
  COVER_REQUIRED: "Selecciona una portada en Sprint 7.",
  IMAGE_ALT_TEXT_REQUIRED:
    "Completa el texto alternativo de todas las imágenes.",
  IMAGE_DIMENSIONS_INVALID: "Corrige las dimensiones inválidas de la galería.",
};

export default async function ProjectEditorPage({
  params,
  searchParams,
}: ProjectEditorPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const project = await getAdminProject(id);
  if (!project) notFound();
  const created = query.estado === "creado";
  const canPublish = project.publicationIssues.length === 0;

  return (
    <article className="admin-page admin-editor">
      <header className="admin-page__header admin-page__header--action">
        <div>
          <Link className="admin-back-link" href="/admin/proyectos">
            Volver a proyectos
          </Link>
          <h1 className="admin-page__title">{project.name}</h1>
          <p className="admin-page__intro">/{project.slug}</p>
        </div>
        <span className="admin-status">
          {project.status === "PUBLISHED" ? "Publicado" : "Borrador"}
        </span>
      </header>

      {created ? (
        <p className="admin-feedback" data-tone="success" role="status">
          Borrador creado. Ya puedes completar su ficha.
        </p>
      ) : null}

      <div className="admin-editor-layout">
        <AdminActionForm
          action={updateProjectAction.bind(null, project.id)}
          className="admin-editor-form"
          submitLabel="Guardar ficha"
        >
          <input type="hidden" name="updatedAt" value={project.updatedAt} />
          <div className="admin-form-grid">
            <label className="admin-field admin-field--wide">
              <span>Nombre del proyecto</span>
              <input
                name="name"
                defaultValue={project.name}
                maxLength={180}
                required
              />
            </label>
            <label className="admin-field">
              <span>Categoría</span>
              <select
                name="categoryId"
                defaultValue={project.categoryId}
                required
              >
                {project.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Año</span>
              <input
                name="year"
                type="number"
                min={1000}
                max={9999}
                inputMode="numeric"
                defaultValue={project.year ?? ""}
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Ubicación</span>
              <input
                name="location"
                maxLength={180}
                defaultValue={project.location ?? ""}
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Descripción</span>
              <textarea
                name="description"
                rows={10}
                maxLength={10000}
                defaultValue={project.description ?? ""}
              />
            </label>
          </div>
          <p className="admin-form-note">
            {project.publishedAt
              ? "El slug quedó bloqueado al publicarse por primera vez."
              : "El slug se actualizará desde el nombre hasta la primera publicación."}
          </p>
        </AdminActionForm>

        <aside className="admin-editor-sidebar">
          <section className="admin-checklist">
            <h2>Preparación editorial</h2>
            {canPublish ? (
              <p className="admin-checklist__ready">
                El proyecto está listo para publicar.
              </p>
            ) : (
              <ul>
                {project.publicationIssues.map((issue) => (
                  <li key={issue}>{issueLabels[issue]}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-gallery-summary">
            <div className="admin-section__header">
              <h2>Galería</h2>
              <span>Sprint 7</span>
            </div>
            <p>
              {project.images.length === 0
                ? "Todavía no hay imágenes."
                : `${project.images.length} imágenes registradas.`}
            </p>
            {project.images.length > 0 ? (
              <ol>
                {project.images.map((image) => (
                  <li key={image.id}>
                    <span>{String(image.position + 1).padStart(2, "0")}</span>
                    <span>
                      {image.isCover ? "Portada" : "Imagen"} · {image.width}×
                      {image.height}
                    </span>
                    <span>
                      {image.altText?.trim() ? "Alt listo" : "Alt pendiente"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          <section className="admin-editor-actions">
            <h2>Estado</h2>
            {project.status === "DRAFT" ? (
              <ConfirmDialog
                action={publishProjectAction.bind(null, project.id)}
                title="Publicar proyecto"
                description="El proyecto aparecerá inmediatamente en el catálogo público."
                triggerLabel="Publicar"
                confirmLabel="Publicar ahora"
                disabled={!canPublish}
                hiddenFields={{ updatedAt: project.updatedAt }}
              />
            ) : (
              <ConfirmDialog
                action={unpublishProjectAction.bind(null, project.id)}
                title="Volver a borrador"
                description="El proyecto dejará de estar disponible públicamente."
                triggerLabel="Volver a borrador"
                confirmLabel="Retirar del sitio"
                hiddenFields={{ updatedAt: project.updatedAt }}
              />
            )}
            <ConfirmDialog
              action={trashProjectAction.bind(null, project.id)}
              title="Enviar a la papelera"
              description="El proyecto se ocultará del sitio y conservará todas sus imágenes."
              triggerLabel="Enviar a papelera"
              confirmLabel="Mover a papelera"
              tone="danger"
              hiddenFields={{ updatedAt: project.updatedAt }}
            />
          </section>
        </aside>
      </div>
    </article>
  );
}
