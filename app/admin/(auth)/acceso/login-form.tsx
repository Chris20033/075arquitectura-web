"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

type LoginFormProps = {
  callbackUrl: string;
  initialMessage: string | null;
  initialTone: "error" | "success";
};

type FieldErrors = {
  email?: string;
  password?: string;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const errors: FieldErrors = {};
    if (!email) {
      errors.email = "Introduce tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Introduce un correo electrónico válido.";
    }

    if (!password) {
      errors.password = "Introduce tu contraseña.";
    } else if (password.length < 15) {
      errors.password = "La contraseña debe tener al menos 15 caracteres.";
    }

    if (errors.email || errors.password) {
      setFieldErrors(errors);
      setTone("error");
      setMessage("Por favor completa los campos requeridos.");
      setPending(false);
      return;
    }

    setFieldErrors({});

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    }).catch(() => null);

    if (!result?.ok || result.error) {
      setFieldErrors({
        email: "Verifica el correo ingresado.",
        password: "Verifica la contraseña ingresada.",
      });
      setTone("error");
      setMessage(genericError);
      setPending(false);
      return;
    }

    window.location.assign(result.url || callbackUrl);
  }

  function handleFieldChange(field: keyof FieldErrors) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (message && tone === "error") {
      setMessage(null);
    }
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
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "admin-email-error" : undefined}
          onChange={() => handleFieldChange("email")}
        />
        {fieldErrors.email && (
          <span
            id="admin-email-error"
            className="admin-field__error"
            role="alert"
          >
            {fieldErrors.email}
          </span>
        )}
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
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={
            fieldErrors.password ? "admin-password-error" : undefined
          }
          onChange={() => handleFieldChange("password")}
        />
        {fieldErrors.password && (
          <span
            id="admin-password-error"
            className="admin-field__error"
            role="alert"
          >
            {fieldErrors.password}
          </span>
        )}
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
