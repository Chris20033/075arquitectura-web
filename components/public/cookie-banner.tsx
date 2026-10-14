"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "075_cookies_accepted";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function getServerSnapshot() {
  return true;
}

export function CookieBanner() {
  const isAccepted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);

  if (isAccepted || dismissed) {
    return null;
  }

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors
    }
    setDismissed(true);
  }

  return (
    <aside
      className="public-cookies"
      role="region"
      aria-label="Aviso de cookies y almacenamiento esencial"
    >
      <div className="public-cookies__inner">
        <p className="public-cookies__text">
          Utilizamos almacenamiento esencial y cookies técnicas para el
          funcionamiento y seguridad del sitio, sin rastreo de terceros.
          Consulta nuestro{" "}
          <Link href="/privacidad" className="public-cookies__link">
            Aviso de Privacidad
          </Link>
          .
        </p>
        <button
          type="button"
          className="public-cookies__button"
          onClick={handleAccept}
          aria-label="Aceptar y cerrar aviso de cookies"
        >
          Entendido
        </button>
      </div>
    </aside>
  );
}
