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

type ConfirmDialogProps = {
  action: AdminAction;
  title: string;
  description: string;
  triggerLabel: string;
  confirmLabel: string;
  hiddenFields?: Record<string, string>;
  confirmationName?: string;
  tone?: "primary" | "danger";
  disabled?: boolean;
};

export function ConfirmDialog({
  action,
  title,
  description,
  triggerLabel,
  confirmLabel,
  hiddenFields = {},
  confirmationName,
  tone = "primary",
  disabled = false,
}: ConfirmDialogProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAdminActionState,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.ok && dialogRef.current?.open) {
      dialogRef.current.close();
      triggerRef.current?.focus();
    }
  }, [state]);

  function close() {
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="admin-text-action"
        data-tone={tone}
        type="button"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <form action={formAction} className="admin-dialog__body">
          <h2>{title}</h2>
          <p>{description}</p>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {confirmationName ? (
            <label className="admin-field">
              <span>Escribe “{confirmationName}”</span>
              <input
                name="confirmation"
                autoComplete="off"
                required
                disabled={pending}
              />
            </label>
          ) : null}
          {state.code !== "IDLE" && !state.ok ? (
            <p className="admin-feedback" data-tone="error" role="alert">
              {state.message}
            </p>
          ) : null}
          <div className="admin-dialog__actions">
            <button
              className="admin-button"
              data-tone="secondary"
              type="button"
              onClick={close}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              className="admin-button"
              data-tone={tone}
              type="submit"
              disabled={pending}
            >
              {pending ? "Procesando…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
