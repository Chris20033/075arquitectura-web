import { redirect } from "next/navigation";

import { getActiveAdminSession } from "@/lib/auth/access";
import { sanitizeAdminCallback } from "@/lib/auth/callback-url";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    estado?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [params, session] = await Promise.all([
    searchParams,
    getActiveAdminSession(),
  ]);

  if (session) redirect(sanitizeAdminCallback(params.callbackUrl));

  const initialMessage = params.error
    ? "No pudimos iniciar sesión. Revisa tus datos o inténtalo más tarde."
    : params.estado === "cerrada"
      ? "La sesión se cerró correctamente."
      : params.estado === "sesion"
        ? "Tu sesión no está activa. Inicia sesión para continuar."
        : null;

  return (
    <main className="admin-login">
      <section className="admin-login__brand" aria-label="075arquitectura">
        <div className="admin-login__topline">
          <span>075arquitectura</span>
          <span>Acceso reservado</span>
        </div>

        <div>
          <div className="admin-login__masthead" aria-hidden="true">
            075
          </div>
          <div className="admin-login__accent" aria-hidden="true" />
        </div>

        <div className="admin-login__footer">
          <span>Arquitectura · Interiorismo</span>
          <span>Panel editorial</span>
        </div>
      </section>

      <section className="admin-login__panel">
        <div className="admin-login__form-wrap">
          <h1 className="admin-login__title">Bienvenida de nuevo.</h1>
          <p className="admin-login__intro">
            Gestiona el portafolio desde un espacio privado. El acceso está
            limitado a la propietaria del estudio.
          </p>
          <LoginForm
            callbackUrl={sanitizeAdminCallback(params.callbackUrl)}
            initialMessage={initialMessage}
            initialTone={params.estado === "cerrada" ? "success" : "error"}
          />
        </div>
      </section>
    </main>
  );
}
