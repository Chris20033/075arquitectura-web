"use client";

import { useActionState, useState } from "react";

import {
  initialAdminActionState,
  type AdminActionState,
} from "@/lib/admin/content-result";

type ReorderItem = {
  id: string;
  title: string;
  meta?: string;
};

type AdminAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export function ReorderList({
  items,
  action,
  emptyMessage,
}: {
  items: ReorderItem[];
  action: AdminAction;
  emptyMessage: string;
}) {
  const [ordered, setOrdered] = useState(items);
  const incomingKey = items.map((item) => item.id).join("|");
  const [sourceKey, setSourceKey] = useState(incomingKey);
  const [state, formAction, pending] = useActionState(
    action,
    initialAdminActionState,
  );

  if (sourceKey !== incomingKey) {
    setSourceKey(incomingKey);
    setOrdered(items);
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= ordered.length) return;
    setOrdered((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  if (ordered.length === 0) {
    return <p className="admin-empty">{emptyMessage}</p>;
  }

  return (
    <form action={formAction} className="admin-reorder" aria-busy={pending}>
      <input
        type="hidden"
        name="ids"
        value={JSON.stringify(ordered.map((item) => item.id))}
      />
      <ol>
        {ordered.map((item, index) => (
          <li key={item.id}>
            <span className="admin-reorder__position">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="admin-reorder__name">
              <strong>{item.title}</strong>
              {item.meta ? <small>{item.meta}</small> : null}
            </span>
            <span className="admin-reorder__controls">
              <button
                type="button"
                disabled={pending || index === 0}
                onClick={() => move(index, -1)}
              >
                Subir
              </button>
              <button
                type="button"
                disabled={pending || index === ordered.length - 1}
                onClick={() => move(index, 1)}
              >
                Bajar
              </button>
            </span>
          </li>
        ))}
      </ol>
      {state.code !== "IDLE" ? (
        <p
          className="admin-feedback"
          data-tone={state.ok ? "success" : "error"}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
      <button className="admin-button" data-tone="secondary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar orden"}
      </button>
    </form>
  );
}
