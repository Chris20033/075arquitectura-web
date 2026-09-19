import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";

import { PublicNavigation } from "@/components/public/public-navigation";
import {
  getContentMode,
  getPublicLandingData,
  type PublicLandingData,
} from "@/lib/public/landing";

export const metadata: Metadata = {
  title: "Arquitectura con identidad",
  description:
    "Estudio de arquitectura, interiorismo y visualización. Espacios contemporáneos pensados desde el contexto.",
};

const services = [
  {
    name: "Arquitectura",
    text: "Diseño conceptual, anteproyecto, proyecto ejecutivo y acompañamiento durante el desarrollo de la obra.",
  },
  {
    name: "Interiorismo",
    text: "Distribución, iluminación, especificación de materiales y selección de mobiliario para espacios coherentes.",
  },
  {
    name: "Visualización",
    text: "Modelado, renders y presentaciones para comunicar con claridad cada decisión del proyecto.",
  },
];

const process = [
  [
    "Escuchamos",
    "Necesidades, sitio, presupuesto y la manera en que quieres habitar el espacio.",
  ],
  [
    "Proponemos",
    "Una dirección conceptual que ordena distribución, materialidad y atmósfera.",
  ],
  [
    "Definimos",
    "Planos, acabados, iluminación, mobiliario y soluciones constructivas.",
  ],
  [
    "Entregamos",
    "La documentación y visualizaciones necesarias para comprender y ejecutar.",
  ],
];

async function readLanding(): Promise<
  | { status: "ready"; data: PublicLandingData }
  | { status: "error"; data: PublicLandingData }
> {
  try {
    return { status: "ready", data: await getPublicLandingData() };
  } catch {
    return {
      status: "error",
      data: { mode: getContentMode(), profile: null },
    };
  }
}

export default async function Home() {
  await connection();
  const landing = await readLanding();
  const { profile, mode } = landing.data;
  const isDemo = mode === "demo";
  const professionalName =
    profile?.professionalName.trim() || "075arquitectura";
  const biography =
    profile?.biography?.trim() ||
    "Creamos espacios contemporáneos con identidad, funcionalidad y una lectura honesta de cada contexto.";

  return (
    <>
      <a className="public-skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <PublicNavigation />

      <main id="contenido">
        <section
          className="public-hero"
          id="inicio"
          aria-labelledby="hero-title"
        >
          <Image
            className="public-hero__image"
            src="/images/concept/courtyard-house-demo.webp"
            alt="Estudio conceptual de una casa de concreto abierta hacia un patio"
            fill
            priority
            sizes="100vw"
          />
          <div className="public-hero__wash" />
          <div className="public-hero__brand">
            <h1 id="hero-title">075</h1>
            <p>Arquitectura</p>
            <span aria-hidden="true" />
          </div>
          <p className="public-hero__disciplines">
            Arquitectura
            <br />
            Interiorismo
            <br />
            Visualización
          </p>
          <p className="public-hero__statement">Diseñamos espacios</p>
          <p className="public-hero__location">
            México
            <br />
            Estudio independiente
          </p>
          {isDemo && (
            <p className="public-demo-badge">Visual conceptual · Demo</p>
          )}
        </section>

        <section
          className="public-section public-projects"
          id="proyectos"
          aria-labelledby="projects-title"
        >
          <div className="public-section__heading">
            <h2 id="projects-title">Proyectos</h2>
            <p>Archivo en preparación</p>
          </div>
          <div className="public-project-grid">
            <figure className="public-project public-project--portrait">
              <div className="public-project__media">
                <Image
                  src="/images/concept/stair-interior-demo.webp"
                  alt="Estudio conceptual de una escalera iluminada por luz natural"
                  fill
                  sizes="(max-width: 720px) 100vw, 46vw"
                />
              </div>
              <figcaption>
                <span>Estudio de luz</span>
                <span>Interior · Demo</span>
              </figcaption>
            </figure>
            <figure className="public-project public-project--landscape">
              <div className="public-project__media">
                <Image
                  src="/images/concept/brick-pavilion-demo.webp"
                  alt="Estudio conceptual de un pabellón de ladrillo y jardín"
                  fill
                  sizes="(max-width: 720px) 100vw, 48vw"
                />
              </div>
              <figcaption>
                <span>Patio de tierra</span>
                <span>Arquitectura · Demo</span>
              </figcaption>
            </figure>
          </div>
          <p className="public-projects__note">
            Estas imágenes son estudios conceptuales de demostración. El archivo
            de obra se incorporará en la siguiente etapa.
          </p>
        </section>

        <section
          className="public-section public-studio"
          id="estudio"
          aria-labelledby="studio-title"
        >
          <div className="public-section__heading public-section__heading--dark">
            <h2 id="studio-title">Estudio</h2>
            <p>{professionalName}</p>
          </div>
          <div className="public-studio__grid">
            <p className="public-studio__aside">
              Arquitectura
              <br />
              Interiorismo
              <br />
              Visualización
              <br />
              México
            </p>
            <div>
              <p className="public-studio__lead">{biography}</p>
              <div className="public-studio__details">
                <p>
                  Cada proyecto parte de escuchar, leer el sitio y encontrar una
                  idea capaz de equilibrar atmósfera, función y recursos.
                </p>
                <p>
                  Trabajamos desde la intención inicial hasta la definición de
                  materiales, detalles y representación final.
                </p>
              </div>
              {!profile && (
                <p className="public-content-status" role="status">
                  {landing.status === "error"
                    ? "El perfil no pudo cargarse. Mostramos contenido editorial temporal."
                    : "Perfil en configuración. Mostramos contenido editorial temporal."}
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          className="public-section public-services"
          id="servicios"
          aria-labelledby="services-title"
        >
          <div className="public-section__heading">
            <h2 id="services-title">Servicios</h2>
            <p>Lo que hacemos</p>
          </div>
          <div className="public-services__list">
            {services.map((service, index) => (
              <article key={service.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{service.name}</h3>
                <p>{service.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="public-section public-process"
          id="proceso"
          aria-labelledby="process-title"
        >
          <div className="public-section__heading">
            <h2 id="process-title">Proceso</h2>
            <p>De la idea al espacio</p>
          </div>
          <ol className="public-process__list">
            {process.map(([name, text], index) => (
              <li key={name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{name}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="public-section public-contact"
          id="contacto"
          aria-labelledby="contact-title"
        >
          <h2 id="contact-title">
            Hablemos
            <br />
            de tu
            <br />
            proyecto.
          </h2>
          <div className="public-contact__bottom">
            <div>
              <p>¿Tienes una idea, remodelación o proyecto arquitectónico?</p>
              <p>Nos gustaría conocerlo.</p>
              {profile?.whatsappHref && (
                <a
                  className="public-contact__cta"
                  href={profile.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Escribir por WhatsApp
                </a>
              )}
            </div>
            <div className="public-contact__links">
              {profile?.socialLinks.map((link) =>
                link.href ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                ) : (
                  <span key={link.label}>{link.label} · Demo</span>
                ),
              )}
              {profile?.publicEmail &&
                (profile.emailHref ? (
                  <a href={profile.emailHref}>{profile.publicEmail}</a>
                ) : (
                  <span>{profile.publicEmail} · Demo</span>
                ))}
              {profile?.publicPhone && (
                <span>
                  {profile.publicPhone}
                  {!profile.whatsappHref && " · Demo"}
                </span>
              )}
              {!profile?.whatsappHref && (
                <span className="public-contact__pending">
                  Contacto directo en configuración
                </span>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <span>075arquitectura</span>
        <span>© {new Date().getFullYear()}</span>
        <a href="#inicio">Volver arriba</a>
      </footer>
    </>
  );
}
