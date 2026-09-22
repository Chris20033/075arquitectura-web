import Link from "next/link";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { createProjectAction } from "@/lib/admin/content-actions";
import { getAdminCategories } from "@/lib/admin/content-queries";

export default async function NewProjectPage() {
  const categories = await getAdminCategories();

  return (
    <article className="admin-page admin-editor">
      <header className="admin-page__header">
        <div>
          <Link className="admin-back-link" href="/admin/proyectos">
            Volver a proyectos
          </Link>
          <h1 className="admin-page__title">Nuevo proyecto</h1>
        </div>
        <span className="admin-status">Borrador inicial</span>
      </header>

      {categories.length === 0 ? (
        <div className="admin-empty admin-empty--large">
          <h2>Primero necesitas una categoría.</h2>
          <p>Cada proyecto pertenece obligatoriamente a una categoría.</p>
          <Link
            className="admin-button"
            data-tone="primary"
            href="/admin/categorias"
          >
            Crear categoría
          </Link>
        </div>
      ) : (
        <AdminActionForm
          action={createProjectAction}
          className="admin-editor-form admin-editor-form--new"
          submitLabel="Crear borrador"
          pendingLabel="Creando…"
        >
          <div className="admin-form-grid">
            <label className="admin-field admin-field--wide">
              <span>Nombre del proyecto</span>
              <input name="name" maxLength={180} required autoFocus />
            </label>
            <label className="admin-field">
              <span>Categoría</span>
              <select name="categoryId" required defaultValue="">
                <option value="" disabled>
                  Seleccionar
                </option>
                {categories.map((category) => (
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
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Ubicación</span>
              <input name="location" maxLength={180} />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Descripción</span>
              <textarea name="description" rows={8} maxLength={10000} />
            </label>
            <p className="admin-form-note admin-field--wide">
              El slug se generará automáticamente. El proyecto permanecerá como
              borrador hasta tener una galería publicable.
            </p>
          </div>
        </AdminActionForm>
      )}
    </article>
  );
}
