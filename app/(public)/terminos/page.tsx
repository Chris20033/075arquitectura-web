import type { Metadata } from "next";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicNavigation } from "@/components/public/public-navigation";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos de uso, aviso legal y protección de propiedad intelectual de 075arquitectura.",
};

export default function TermsPage() {
  return (
    <>
      <a className="public-skip-link" href="#contenido-terminos">
        Saltar al contenido
      </a>
      <PublicNavigation />

      <main id="contenido-terminos" className="public-legal">
        <header className="public-legal__header">
          <p className="public-legal__eyebrow">Legal · 075arquitectura</p>
          <h1 className="public-legal__title">Términos y Condiciones de Uso</h1>
          <p className="public-legal__date">
            Última actualización: Octubre 2026
          </p>
        </header>

        <article className="public-legal__body">
          <section className="public-legal__section">
            <h2>1. Aceptación y Objeto</h2>
            <p>
              El acceso y uso de este sitio web atribuye la condición de
              visitante e implica la aceptación plena de las disposiciones
              contenidas en este Aviso Legal y Condiciones de Uso. El propósito
              de este sitio es la difusión editorial y profesional de la
              trayectoria, proyectos y servicios de diseño y arquitectura de{" "}
              <strong>075arquitectura</strong>.
            </p>
          </section>

          <section className="public-legal__section">
            <h2>2. Propiedad Intelectual y Derechos de Autor</h2>
            <p>
              Todos los contenidos exhibidos en esta plataforma —incluyendo,
              pero no limitándose a: diseños arquitectónicos, renders, maquetas
              digitales, fotografías de obras, planimetrías, bocetos, logotipos,
              marcas, nombres comerciales, textos y código fuente— son propiedad
              exclusiva de <strong>075arquitectura</strong> o de sus legítimos
              titulares que han otorgado autorización expresa para su
              exhibición.
            </p>
            <p>
              Queda <strong>estrictamente prohibida</strong> la reproducción
              total o parcial, distribución, modificación, copia para fines
              comerciales o empleo en proyectos de construcción ajenos sin la
              previa autorización expresa y por escrito de 075arquitectura.
            </p>
          </section>

          <section className="public-legal__section">
            <h2>3. Carácter Informativo del Portafolio</h2>
            <p>
              El material gráfico, descriptivo y dimensional presentado en las
              páginas de proyectos tiene una finalidad exclusivamente
              ilustrativa, editorial e informativa.
            </p>
            <p>
              Las imágenes o descripciones no constituyen un proyecto ejecutivo
              listo para edificación ni una oferta contractual vinculante
              directa. Cada desarrollo arquitectónico real requiere análisis de
              sitio, estudios de mecánica de suelos, cálculo estructural,
              normatividad municipal aplicable y un contrato de servicios
              profesionales específico.
            </p>
          </section>

          <section className="public-legal__section">
            <h2>4. Canales de Contacto y Enlaces a Terceros</h2>
            <p>
              El sitio facilita enlaces directos a plataformas externas (tales
              como WhatsApp, Instagram, Pinterest o correo electrónico) para
              conveniencia y comunicación con el estudio.
            </p>
            <p>
              075arquitectura no tiene control sobre las políticas de
              privacidad, términos o disponibilidad técnica de dichas
              plataformas de terceros, por lo que el uso de las mismas se rige
              por sus respectivas condiciones de servicio.
            </p>
          </section>

          <section className="public-legal__section">
            <h2>5. Uso Adecuado del Sitio</h2>
            <p>
              El visitante se compromete a hacer un uso lícito y ético del
              sitio, absteniéndose de llevar a cabo acciones que puedan dañar,
              inutilizar, sobrecargar o deteriorar los servidores de la
              aplicación o interferir con las medidas de seguridad del panel
              administrativo.
            </p>
          </section>

          <section className="public-legal__section">
            <h2>6. Legislación Aplicable y Jurisdicción</h2>
            <p>
              Para la interpretación, cumplimiento y resolución de cualquier
              controversia derivada del uso de este sitio, las partes se someten
              a la legislación federal aplicable en los Estados Unidos Mexicanos
              y a la competencia de los tribunales competentes en México,
              renunciando a cualquier otro fuero que pudiera corresponderles por
              razón de sus domicilios presentes o futuros.
            </p>
          </section>
        </article>
      </main>

      <PublicFooter
        actionLink={{ href: "/#proyectos", label: "Ver proyectos" }}
      />
    </>
  );
}
