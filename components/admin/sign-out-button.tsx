"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="admin-signout"
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/admin/acceso?estado=cerrada" });
      }}
    >
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}
