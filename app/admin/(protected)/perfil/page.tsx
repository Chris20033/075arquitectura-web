import Link from "next/link";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ReorderList } from "@/components/admin/reorder-list";
import { SiteHeroManager } from "@/components/admin/site-hero-manager";
import { SocialLinkFields } from "@/components/admin/social-link-fields";
import {
  createSocialLinkAction,
  deleteSocialLinkAction,
  reorderSocialLinksAction,
  updateProfileAction,
  updateSocialLinkAction,
} from "@/lib/admin/content-actions";
import { getAdminProfile } from "@/lib/admin/content-queries";
import { normalizeSocialUrl } from "@/lib/public/contact";

const sections = [
  { value: "portada", label: "Portada" },
  { value: "informacion", label: "Información" },
  { value: "redes", label: "Redes sociales" },
] as const;

type ProfileSection = (typeof sections)[number]["value"];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string }>;
}) {
  const requested = (await searchParams).seccion;
  const section: ProfileSection = sections.some(
    (item) => item.value === requested,
  )
    ? (requested as ProfileSection)
    : "portada";
  const profile = await getAdminProfile();
  const whatsappPending = !profile.whatsappPhone;

  return (
    <article className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Mi sitio</h1>
          <p className="admin-page__intro">
            Actualiza la portada, la información del estudio y sus medios de
            contacto.
          </p>
        </div>
        <span className="admin-status">
          {whatsappPending ? "Falta configurar WhatsApp" : "Contacto listo"}
        </span>
      </header>

      <nav className="admin-step-nav" aria-label="Secciones de Mi sitio">
        {sections.map((item, index) => (
          <Link
            key={item.value}
            href={`/admin/perfil?seccion=${item.value}`}
            aria-current={section === item.value ? "page" : undefined}
          >
            <span>{index + 1}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {section === "portada" ? (
        <SiteHeroManager image={profile.heroImage} />
      ) : null}

      {section === "informacion" ? (
        <section className="admin-section" aria-labelledby="profile-title">
          <div className="admin-section__header">
            <div>
              <h2 id="profile-title">Información pública</h2>
              <p>Estos datos aparecen en la página principal.</p>
            </div>
          </div>
          {whatsappPending ? (
            <div className="admin-notice" data-tone="warning">
              Añade un número de WhatsApp antes del lanzamiento. Puedes guardar
              el resto ahora y completarlo después.
            </div>
          ) : null}
          <AdminActionForm
            action={updateProfileAction}
            className="admin-editor-form"
            submitLabel="Guardar información"
            trackChanges
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
                <span>Presentación del estudio</span>
                <textarea
                  name="biography"
                  rows={8}
                  maxLength={10000}
                  defaultValue={profile.biography ?? ""}
                  placeholder="Cuenta brevemente qué tipo de arquitectura realizas y qué distingue tu trabajo."
                />
              </label>
              <label className="admin-field">
                <span>WhatsApp</span>
                <input
                  name="whatsappPhone"
                  inputMode="tel"
                  maxLength={32}
                  defaultValue={profile.whatsappPhone ?? ""}
                  placeholder="Ej. 5215551234567"
                />
                <small>
                  Incluye código de país y número, solo con dígitos.
                </small>
              </label>
              <label className="admin-field">
                <span>Correo público</span>
                <input
                  name="publicEmail"
                  type="email"
                  maxLength={320}
                  defaultValue={profile.publicEmail ?? ""}
                  placeholder="hola@tudominio.com"
                />
              </label>
              <label className="admin-field">
                <span>Teléfono público</span>
                <input
                  name="publicPhone"
                  inputMode="tel"
                  maxLength={32}
                  defaultValue={profile.publicPhone ?? ""}
                  placeholder="Ej. +52 55 5123 4567"
                />
              </label>
            </div>
          </AdminActionForm>
        </section>
      ) : null}

      {section === "redes" ? (
        <>
          <div className="admin-split admin-split--profile">
            <section
              className="admin-section"
              aria-labelledby="social-list-title"
            >
              <div className="admin-section__header">
                <div>
                  <h2 id="social-list-title">Redes sociales</h2>
                  <p>Decide cuáles aparecen y en qué orden.</p>
                </div>
                <span>{profile.socialLinks.length} registradas</span>
              </div>
              {profile.socialLinks.length === 0 ? (
                <p className="admin-empty">
                  Todavía no hay redes. Puedes añadir Instagram u otro enlace.
                </p>
              ) : (
                <div className="admin-edit-list">
                  {profile.socialLinks.map((link) => {
                    const isPubliclyActive = Boolean(
                      normalizeSocialUrl(link.url),
                    );
                    return (
                      <div
                        className="admin-edit-row admin-edit-row--social"
                        key={link.id}
                      >
                        <AdminActionForm
                          action={updateSocialLinkAction.bind(null, link.id)}
                          className="admin-inline-form admin-inline-form--social"
                          submitLabel={`Guardar ${link.label}`}
                          tone="secondary"
                          trackChanges
                        >
                          <input
                            type="hidden"
                            name="updatedAt"
                            value={link.updatedAt}
                          />
                          <SocialLinkFields
                            idPrefix={`social-${link.id}`}
                            platform={link.platform}
                            username={link.username}
                            label={link.label}
                          />
                          <label className="admin-field admin-field--wide">
                            <span>Enlace completo</span>
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
                            <span>Mostrar en el sitio</span>
                          </label>
                          {!isPubliclyActive ? (
                            <p className="admin-form-note">
                              Este enlace es de demostración y no se abrirá en
                              el sitio público.
                            </p>
                          ) : null}
                        </AdminActionForm>
                        <ConfirmDialog
                          action={deleteSocialLinkAction.bind(null, link.id)}
                          title={`Eliminar ${link.label}`}
                          description="El enlace dejará de aparecer en el sitio."
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
                <div>
                  <h2>Añadir una red</h2>
                  <p>Se colocará al final de la lista.</p>
                </div>
              </div>
              <AdminActionForm
                action={createSocialLinkAction}
                className="admin-stack-form"
                submitLabel="Añadir red social"
                resetOnSuccess
              >
                <SocialLinkFields idPrefix="new-social" />
                <label className="admin-field">
                  <span>Enlace completo</span>
                  <input
                    name="url"
                    type="url"
                    placeholder="https://instagram.com/tu_cuenta"
                    required
                  />
                </label>
                <label className="admin-check-field">
                  <input name="isVisible" type="checkbox" defaultChecked />
                  <span>Mostrar en el sitio</span>
                </label>
              </AdminActionForm>
            </aside>
          </div>

          <details className="admin-maintenance admin-section--spaced">
            <summary>Cambiar el orden de las redes</summary>
            <p>Mueve cada red hasta dejarla en la posición deseada.</p>
            <ReorderList
              items={profile.socialLinks.map((link) => ({
                id: link.id,
                title: link.label,
                meta: link.isVisible ? "Se muestra" : "Oculta",
              }))}
              action={reorderSocialLinksAction}
              emptyMessage="El orden aparecerá cuando añadas una red social."
            />
          </details>
        </>
      ) : null}
    </article>
  );
}
