import { AdminActionForm } from "@/components/admin/admin-action-form";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ReorderList } from "@/components/admin/reorder-list";
import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  updateCategoryAction,
} from "@/lib/admin/content-actions";
import { getAdminCategories } from "@/lib/admin/content-queries";

export default async function CategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <article className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Categorías</h1>
          <p className="admin-page__intro">
            Clasifica la obra y define el orden editorial disponible para el
            archivo.
          </p>
        </div>
        <span className="admin-page__date">
          {categories.length} registradas
        </span>
      </header>

      <div className="admin-split">
        <section
          className="admin-section"
          aria-labelledby="category-list-title"
        >
          <div className="admin-section__header">
            <h2 id="category-list-title">Archivo de categorías</h2>
            <span>Nombre y slug se mantienen sincronizados</span>
          </div>
          {categories.length === 0 ? (
            <p className="admin-empty">
              Crea la primera categoría antes de comenzar un proyecto.
            </p>
          ) : (
            <div className="admin-edit-list">
              {categories.map((category) => (
                <div className="admin-edit-row" key={category.id}>
                  <AdminActionForm
                    action={updateCategoryAction.bind(null, category.id)}
                    className="admin-inline-form"
                    submitLabel="Guardar"
                    pendingLabel="Guardando…"
                    tone="secondary"
                  >
                    <input
                      type="hidden"
                      name="updatedAt"
                      value={category.updatedAt}
                    />
                    <label className="admin-field">
                      <span>Nombre</span>
                      <input
                        name="name"
                        defaultValue={category.name}
                        maxLength={120}
                        required
                      />
                    </label>
                    <p className="admin-inline-meta">
                      /{category.slug} · {category.projectCount}{" "}
                      {category.projectCount === 1 ? "proyecto" : "proyectos"}
                    </p>
                  </AdminActionForm>
                  <ConfirmDialog
                    action={deleteCategoryAction.bind(null, category.id)}
                    title={`Eliminar ${category.name}`}
                    description={
                      category.projectCount > 0
                        ? "Esta categoría tiene proyectos asociados y no puede eliminarse."
                        : "La categoría desaparecerá de forma definitiva."
                    }
                    triggerLabel="Eliminar"
                    confirmLabel="Eliminar categoría"
                    tone="danger"
                    disabled={category.projectCount > 0}
                    hiddenFields={{ updatedAt: category.updatedAt }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="admin-section admin-section--aside">
          <div className="admin-section__header">
            <h2>Nueva categoría</h2>
            <span>Se añadirá al final</span>
          </div>
          <AdminActionForm
            action={createCategoryAction}
            className="admin-stack-form"
            submitLabel="Crear categoría"
            resetOnSuccess
          >
            <label className="admin-field">
              <span>Nombre</span>
              <input
                name="name"
                maxLength={120}
                placeholder="Ej. Residencial"
                required
              />
            </label>
          </AdminActionForm>
        </aside>
      </div>

      <section
        className="admin-section admin-section--spaced"
        aria-labelledby="category-order-title"
      >
        <div className="admin-section__header">
          <h2 id="category-order-title">Orden manual</h2>
          <span>Compatible con teclado y móvil</span>
        </div>
        <ReorderList
          items={categories.map((category) => ({
            id: category.id,
            title: category.name,
            meta: `${category.projectCount} proyectos`,
          }))}
          action={reorderCategoriesAction}
          emptyMessage="El orden estará disponible cuando existan categorías."
        />
      </section>
    </article>
  );
}
