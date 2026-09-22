import { AdminActionForm } from "@/components/admin/admin-action-form";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ReorderList } from "@/components/admin/reorder-list";
import {
  createSocialLinkAction,
  deleteSocialLinkAction,
  reorderSocialLinksAction,
  updateProfileAction,
  updateSocialLinkAction,
} from "@/lib/admin/content-actions";
import { getAdminProfile } from "@/lib/admin/content-queries";
import { normalizeSocialUrl } from "@/lib/public/contact";

export default async function ProfilePage() {
  const profile = await getAdminProfile();
  const whatsappPending = !profile.whatsappPhone;

  return (
    <article className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Perfil</h1>
          <p className="admin-page__intro">
            Mantén la información que acompaña la obra y abre las vías de
            contacto públicas.
          </p>
        </div>
        <span className="admin-status">
          {whatsappPending ? "Configuración incompleta" : "Contacto preparado"}
        </span>
      </header>

      {whatsappPending ? (
        <div className="admin-notice" data-tone="warning">
          Añade un número de WhatsApp antes del lanzamiento. Puedes seguir
          guardando el resto del perfil.
        </div>
      ) : null}

      <section
        className="admin-section admin-section--spaced"
        aria-labelledby="profile-title"
      >
        <div className="admin-section__header">
          <h2 id="profile-title">Información pública</h2>
          <span>Guardado explícito</span>
        </div>
        <AdminActionForm
          action={updateProfileAction}
          className="admin-editor-form"
          submitLabel="Guardar perfil"
        >
          <input type="hidden" name="updatedAt" value={profile.updatedAt} />
          <div className="admin-form-grid">
            <label className="admin-field admin-field--wide">
              <span>Nombre profesional</span>
              <input
                name="professionalName"
                maxLength={160}
                defaultValue={profile.professionalName}
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Biografía</span>
              <textarea
                name="biography"
                rows={8}
                maxLength={10000}
                defaultValue={profile.biography ?? ""}
              />
            </label>
            <label className="admin-field">
              <span>WhatsApp</span>
              <input
                name="whatsappPhone"
                inputMode="tel"
                maxLength={32}
                defaultValue={profile.whatsappPhone ?? ""}
                placeholder="5210000000000"
              />
            </label>
            <label className="admin-field">
              <span>Correo público</span>
              <input
                name="publicEmail"
                type="email"
                maxLength={320}
                defaultValue={profile.publicEmail ?? ""}
              />
            </label>
            <label className="admin-field">
              <span>Teléfono público</span>
              <input
                name="publicPhone"
                inputMode="tel"
                maxLength={32}
                defaultValue={profile.publicPhone ?? ""}
              />
            </label>
          </div>
        </AdminActionForm>
      </section>

      <div className="admin-split admin-split--profile">
        <section className="admin-section" aria-labelledby="social-list-title">
          <div className="admin-section__header">
            <h2 id="social-list-title">Redes y enlaces</h2>
            <span>{profile.socialLinks.length} registrados</span>
          </div>
          {profile.socialLinks.length === 0 ? (
            <p className="admin-empty">
              Añade el primer destino social del estudio.
            </p>
          ) : (
            <div className="admin-edit-list">
              {profile.socialLinks.map((link) => {
                const isPubliclyActive = Boolean(normalizeSocialUrl(link.url));
                return (
                  <div
                    className="admin-edit-row admin-edit-row--social"
                    key={link.id}
                  >
                    <AdminActionForm
                      action={updateSocialLinkAction.bind(null, link.id)}
                      className="admin-inline-form admin-inline-form--social"
                      submitLabel="Guardar enlace"
                      tone="secondary"
                    >
                      <input
                        type="hidden"
                        name="updatedAt"
                        value={link.updatedAt}
                      />
                      <label className="admin-field">
                        <span>Etiqueta</span>
                        <input
                          name="label"
                          maxLength={80}
                          defaultValue={link.label}
                          required
                        />
                      </label>
                      <label className="admin-field admin-field--wide">
                        <span>URL HTTPS</span>
                        <input
                          name="url"
                          type="url"
                          defaultValue={link.url}
                          required
                        />
                      </label>
                      <label className="admin-check-field">
                        <input
                          name="isVisible"
                          type="checkbox"
                          defaultChecked={link.isVisible}
                        />
                        <span>Visible en el sitio</span>
                      </label>
                      {!isPubliclyActive ? (
                        <p className="admin-form-note">
                          Este dominio se conserva como demo y no abrirá un
                          enlace público.
                        </p>
                      ) : null}
                    </AdminActionForm>
                    <ConfirmDialog
                      action={deleteSocialLinkAction.bind(null, link.id)}
                      title={`Eliminar ${link.label}`}
                      description="El enlace desaparecerá del perfil público."
                      triggerLabel="Eliminar"
                      confirmLabel="Eliminar enlace"
                      tone="danger"
                      hiddenFields={{ updatedAt: link.updatedAt }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="admin-section admin-section--aside">
          <div className="admin-section__header">
            <h2>Nuevo enlace</h2>
            <span>Se añadirá al final</span>
          </div>
          <AdminActionForm
            action={createSocialLinkAction}
            className="admin-stack-form"
            submitLabel="Añadir enlace"
            resetOnSuccess
          >
            <label className="admin-field">
              <span>Etiqueta</span>
              <input
                name="label"
                maxLength={80}
                placeholder="Instagram"
                required
              />
            </label>
            <label className="admin-field">
              <span>URL HTTPS</span>
              <input name="url" type="url" placeholder="https://" required />
            </label>
            <label className="admin-check-field">
              <input name="isVisible" type="checkbox" defaultChecked />
              <span>Visible en el sitio</span>
            </label>
          </AdminActionForm>
        </aside>
      </div>

      <section
        className="admin-section admin-section--spaced"
        aria-labelledby="social-order-title"
      >
        <div className="admin-section__header">
          <h2 id="social-order-title">Orden de enlaces</h2>
          <span>Incluye visibles y ocultos</span>
        </div>
        <ReorderList
          items={profile.socialLinks.map((link) => ({
            id: link.id,
            title: link.label,
            meta: link.isVisible ? "Visible" : "Oculto",
          }))}
          action={reorderSocialLinksAction}
          emptyMessage="El orden estará disponible cuando existan enlaces."
        />
      </section>
    </article>
  );
}
