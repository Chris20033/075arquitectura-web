import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ProjectImage } from "@/components/public/project-image";
import { PublicNavigation } from "@/components/public/public-navigation";
import {
  getContentMode,
  getPublicLandingData,
  type PublicLandingData,
} from "@/lib/public/landing";
import type { PublicProjectImage } from "@/lib/public/project-images";
import {
  getPublicProjects,
  type PublicProjectSummary,
} from "@/lib/public/projects";

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

type LandingViewData = {
  data: PublicLandingData;
  profileStatus: "ready" | "error";
  projectsStatus: "ready" | "error";
  projects: PublicProjectSummary[];
};

const demoHeroFallback: PublicProjectImage = {
  kind: "local",
  src: "/images/concept/courtyard-house-demo.webp",
  width: 1774,
  height: 887,
  alt: "Estudio conceptual de una casa de concreto abierta hacia un patio",
  position: 0,
  isCover: true,
};

async function readLanding(): Promise<LandingViewData> {
  const [landingResult, projectsResult] = await Promise.allSettled([
    getPublicLandingData(),
    getPublicProjects(),
  ]);
  const mode = getContentMode();

  return {
    data:
      landingResult.status === "fulfilled"
        ? landingResult.value
        : { mode, profile: null },
    profileStatus: landingResult.status === "fulfilled" ? "ready" : "error",
    projectsStatus: projectsResult.status === "fulfilled" ? "ready" : "error",
    projects: projectsResult.status === "fulfilled" ? projectsResult.value : [],
  };
}

export default async function Home() {
  await connection();
  const landing = await readLanding();
  const { profile, mode } = landing.data;
  const { projects } = landing;
  const isDemo = mode === "demo";
  const heroImage = projects[0]?.cover ?? (isDemo ? demoHeroFallback : null);
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
          {heroImage && (
            <ProjectImage
              image={heroImage}
              className="public-hero__image"
              fill
              priority
              sizes="100vw"
            />
          )}
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
            <p>
              {projects.length > 0 ? `${projects.length} obras` : "Archivo"}
            </p>
          </div>
          {landing.projectsStatus === "error" ? (
            <div className="public-projects__state" role="status">
              <p>El archivo no pudo cargarse.</p>
              <span>Intenta nuevamente en unos minutos.</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="public-projects__state" role="status">
              <p>El archivo está tomando forma.</p>
              <span>Los primeros proyectos aparecerán aquí muy pronto.</span>
            </div>
          ) : (
            <div className="public-project-grid">
              {projects.map((project, index) => (
                <Link
                  className="public-project"
                  href={`/proyectos/${project.slug}`}
                  key={project.slug}
                  aria-label={`Ver ${project.name}`}
                >
                  <figure>
                    <div
                      className="public-project__media"
                      style={{
                        aspectRatio: `${project.cover.width} / ${project.cover.height}`,
                      }}
                    >
                      <ProjectImage
                        image={project.cover}
                        fill
                        sizes={
                          index === 2
                            ? "(max-width: 700px) 92vw, 66vw"
                            : "(max-width: 700px) 92vw, 48vw"
                        }
                      />
                    </div>
                    <figcaption>
                      <span>{project.name}</span>
                      <span>
                        {project.category.name}
                        {project.year ? ` · ${project.year}` : ""}
                      </span>
                    </figcaption>
                  </figure>
                </Link>
              ))}
            </div>
          )}
          {isDemo && projects.length > 0 && (
            <p className="public-projects__note">
              Archivo conceptual de demostración. Ninguna imagen representa obra
              construida de 075arquitectura.
            </p>
          )}
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
                  {landing.profileStatus === "error"
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
