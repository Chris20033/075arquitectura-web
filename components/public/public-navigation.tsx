"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  ["Proyectos", "/#proyectos"],
  ["Estudio", "/#estudio"],
  ["Servicios", "/#servicios"],
  ["Proceso", "/#proceso"],
  ["Contacto", "/#contacto"],
] as const;

export function PublicNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("public-menu-open", isOpen);
    return () => document.body.classList.remove("public-menu-open");
  }, [isOpen]);

  return (
    <header className="public-header">
      <Link
        className="public-logo"
        href="/#inicio"
        aria-label="075arquitectura, inicio"
      >
        <Image
          src="/images/logo-075.jpeg"
          alt=""
          width={469}
          height={453}
          priority
        />
      </Link>
      <nav className="public-nav" aria-label="Navegación principal">
        {links.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <button
        className="public-menu-button"
        type="button"
        aria-expanded={isOpen}
        aria-controls="public-menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{isOpen ? "Cerrar" : "Menú"}</span>
        <span className="public-menu-button__mark" aria-hidden="true" />
      </button>
      <div
        className="public-menu"
        id="public-menu"
        data-open={isOpen || undefined}
      >
        <nav aria-label="Navegación móvil">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setIsOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
        <p>Arquitectura · Interiorismo · Visualización</p>
      </div>
    </header>
  );
}
