import type { Metadata } from "next";
import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicNavigation } from "@/components/public/public-navigation";

export const metadata: Metadata = {
  title: "Aviso de Privacidad",
  description:
    "Aviso de privacidad integral de 075arquitectura. Conoce cómo protegemos y gestionamos tus datos personales.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <a className="public-skip-link" href="#contenido-privacidad">
        Saltar al contenido
      </a>
      <PublicNavigation />

      <main id="contenido-privacidad" className="public-legal">
        <header className="public-legal__header">
          <p className="public-legal__eyebrow">Legal · 075arquitectura</p>
          <h1 className="public-legal__title">Aviso de Privacidad</h1>
          <p className="public-legal__date">
            Última actualización: Octubre 2026
          </p>
        </header>

        <article className="public-legal__body">
          <section className="public-legal__section">
            <h2>1. Identidad y Domicilio del Responsable</h2>
            <p>
              <strong>075arquitectura</strong>, con presencia en México y canal
              de atención digital mediante su sitio web oficial, es responsable
              del tratamiento y resguardo de los datos personales que nos
              proporciones, en cumplimiento con la Ley Federal de Protección de
              Datos Personales en Posesión de los Particulares (LFPDPPP).
            </p>
          </section>

          <section className="public-legal__section">
            <h2>2. Datos Personales que Recabamos</h2>
            <p>
              Nuestro sitio web público funciona primordialmente como un
              portafolio editorial de libre consulta, sin requerir registro ni
              creación de cuenta por parte de los visitantes.
            </p>
            <p>
              Únicamente recabamos los datos que tú decides proporcionarnos de
              forma voluntaria al ponerte en contacto con nosotros a través de
              WhatsApp, correo electrónico o llamada telefónica, tales como:
            </p>
            <ul>
              <li>Nombre completo o de contacto.</li>
              <li>Número de teléfono celular.</li>
              <li>Dirección de correo electrónico.</li>
              <li>
                Información descriptiva y ubicación aproximada del proyecto
                arquitectónico o diseño que deseas consultar.
              </li>
            </ul>
          </section>

          <section className="public-legal__section">
            <h2>3. Finalidades del Tratamiento de Datos</h2>
            <p>
              Los datos personales recabados son utilizados exclusivamente para
              las siguientes finalidades primarias y legítimas:
            </p>
            <ul>
              <li>
                Atender tus solicitudes de información, cotizaciones y asesoría
                en arquitectura, interiorismo y visualización.
              </li>
              <li>
                Dar seguimiento a conversaciones iniciadas voluntariamente a
                través de nuestros canales oficiales de mensajería o correo.
              </li>
              <li>
                Formalizar, en su caso, la relación profesional de servicios
                arquitectónicos o de diseño.
              </li>
            </ul>
            <p>
              <strong>No vendemos, cedemos ni transferimos</strong> tus datos
              personales a terceros con fines publicitarios o comerciales.
            </p>
          </section>

          <section className="public-legal__section">
            <h2>4. Cookies y Almacenamiento Local</h2>
            <p>
              Este sitio web utiliza exclusivamente almacenamiento local y
              cookies técnicas esenciales destinadas a:
            </p>
            <ul>
              <li>
                Recordar tu preferencia sobre el aviso de cookies para no volver
                a mostrarlo repetitivamente.
              </li>
              <li>
                Garantizar la seguridad y protección de sesiones autenticadas
                para el panel administrativo privado del despacho.
              </li>
            </ul>
            <p>
              No empleamos cookies de rastreo publicitario masivo ni
              herramientas de elaboración de perfiles para comercialización
              externa.
            </p>
          </section>

          <section className="public-legal__section">
            <h2>5. Derechos ARCO y Revocación del Consentimiento</h2>
            <p>
              Tienes derecho a conocer qué datos personales tenemos de ti, para
              qué los usamos y las condiciones del uso que les damos (
              <strong>Acceso</strong>). Asimismo, es tu derecho solicitar la
              corrección de tu información personal en caso de estar
              desactualizada o ser inexacta (<strong>Rectificación</strong>);
              que la eliminemos de nuestros registros o bases cuando consideres
              que no está siendo utilizada conforme a los principios legales (
              <strong>Cancelación</strong>); así como oponerte al uso de tus
              datos para fines específicos (<strong>Oposición</strong>).
            </p>
            <p>
              Para ejercer cualquiera de tus derechos ARCO o revocar el
              consentimiento otorgado, puedes enviar un mensaje directo a través
              de nuestros canales de contacto indicados en la página principal o
              dirigirte a{" "}
              <Link href="/#contacto" className="public-legal__inline-link">
                la sección de contacto
              </Link>
              .
            </p>
          </section>

          <section className="public-legal__section">
            <h2>6. Modificaciones al Presente Aviso</h2>
            <p>
              075arquitectura se reserva el derecho de actualizar o modificar
              este aviso de privacidad en cualquier momento para atender
              novedades legislativas o prácticas de operación interna. Cualquier
              cambio será publicado oportunamente en esta misma dirección web
              con la fecha de actualización correspondiente.
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
