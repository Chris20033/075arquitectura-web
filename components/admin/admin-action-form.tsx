"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useAdminDirtyState } from "./admin-dirty-state";

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
  trackChanges?: boolean;
};

function formSignature(form: HTMLFormElement) {
  return JSON.stringify(
    [...new FormData(form).entries()]
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function ActionFeedback({ state }: { state: AdminActionState }) {
  if (state.code === "IDLE") return null;
  const fieldErrors = Object.values(state.fieldErrors ?? {});

  return (
    <div
      className="admin-feedback"
      data-tone={state.ok ? "success" : "error"}
      role={state.ok ? "status" : "alert"}
      aria-live="polite"
      tabIndex={-1}
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
  trackChanges = false,
}: AdminActionFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAdminActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef<string | null>(null);
  const formId = useId();
  const dirtyState = useAdminDirtyState();
  const [dirty, setLocalDirty] = useState(false);

  const setDirty = useCallback(
    (value: boolean) => {
      setLocalDirty(value);
      dirtyState?.setDirty(formId, value);
    },
    [dirtyState, formId],
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    baselineRef.current = formSignature(form);
    return () => dirtyState?.setDirty(formId, false);
  }, [dirtyState, formId]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (state.ok) {
      if (resetOnSuccess) form.reset();
      baselineRef.current = formSignature(form);
      const timer = window.setTimeout(() => setDirty(false), 0);
      return () => window.clearTimeout(timer);
    }
    if (state.code === "IDLE") return;
    let firstInvalid: HTMLElement | null = null;
    for (const element of form.querySelectorAll<HTMLElement>("[aria-invalid]"))
      element.removeAttribute("aria-invalid");
    for (const name of Object.keys(state.fieldErrors ?? {})) {
      const element = form.elements.namedItem(name);
      if (element instanceof HTMLElement) {
        element.setAttribute("aria-invalid", "true");
        firstInvalid ??= element;
      }
    }
    (
      firstInvalid ?? form.querySelector<HTMLElement>(".admin-feedback")
    )?.focus();
  }, [resetOnSuccess, setDirty, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      aria-busy={pending}
      onInput={(event) => {
        if (!trackChanges) return;
        const signature = formSignature(event.currentTarget);
        setDirty(signature !== baselineRef.current);
      }}
    >
      <ActionFeedback state={state} />
      {children}
      <div className={trackChanges ? "admin-savebar" : undefined}>
        {trackChanges ? (
          <span aria-live="polite">
            {pending
              ? "Guardando…"
              : dirty
                ? "Cambios sin guardar"
                : state.ok
                  ? "Todo guardado"
                  : "Sin cambios"}
          </span>
        ) : null}
        <button
          className="admin-button"
          data-tone={tone}
          type="submit"
          disabled={pending || (trackChanges && !dirty)}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
