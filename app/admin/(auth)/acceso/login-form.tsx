"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

type LoginFormProps = {
  callbackUrl: string;
  initialMessage: string | null;
  initialTone: "error" | "success";
};

const genericError =
  "No pudimos iniciar sesión. Revisa tus datos o inténtalo más tarde.";

export function LoginForm({
  callbackUrl,
  initialMessage,
  initialTone,
}: LoginFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [tone, setTone] = useState(initialTone);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      callbackUrl,
      redirect: false,
    }).catch(() => null);

    if (!result?.ok || result.error) {
      setTone("error");
      setMessage(genericError);
      setPending(false);
      return;
    }

    window.location.assign(result.url || callbackUrl);
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <div className="admin-field">
        <label htmlFor="admin-email">Correo</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          maxLength={320}
          placeholder="tu@correo.com"
          required
          disabled={pending}
        />
      </div>

      <div className="admin-field">
        <label htmlFor="admin-password">Contraseña</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={15}
          maxLength={128}
          placeholder="15 caracteres o más"
          required
          disabled={pending}
        />
      </div>

      <p
        className="admin-form__message"
        data-tone={message ? tone : undefined}
        role={tone === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {message ?? "La sesión permanecerá activa hasta ocho horas."}
      </p>

      <button className="admin-primary-action" type="submit" disabled={pending}>
        <span>{pending ? "Verificando acceso…" : "Entrar al panel"}</span>
        <span className="admin-primary-action__mark" aria-hidden="true" />
      </button>
    </form>
  );
}
