"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  initialAdminActionState,
  type AdminActionState,
} from "@/lib/admin/content-result";

type AdminAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

type AdminActionFormProps = {
  action: AdminAction;
  children: React.ReactNode;
  className?: string;
  submitLabel: string;
  pendingLabel?: string;
  tone?: "primary" | "secondary" | "danger";
  resetOnSuccess?: boolean;
};

export function ActionFeedback({ state }: { state: AdminActionState }) {
  if (state.code === "IDLE") return null;
  const fieldErrors = Object.values(state.fieldErrors ?? {});

  return (
    <div
      className="admin-feedback"
      data-tone={state.ok ? "success" : "error"}
      role={state.ok ? "status" : "alert"}
      aria-live="polite"
    >
      <p>{state.message}</p>
      {fieldErrors.length > 0 ? (
        <ul>
          {fieldErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AdminActionForm({
  action,
  children,
  className,
  submitLabel,
  pendingLabel = "Guardando…",
  tone = "primary",
  resetOnSuccess = false,
}: AdminActionFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAdminActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
  }, [resetOnSuccess, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      aria-busy={pending}
    >
      {children}
      <ActionFeedback state={state} />
      <button
        className="admin-button"
        data-tone={tone}
        type="submit"
        disabled={pending}
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
