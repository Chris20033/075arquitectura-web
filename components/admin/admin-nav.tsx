"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Inicio", href: "/admin" },
  { label: "Proyectos", href: "/admin/proyectos" },
  { label: "Mi sitio", href: "/admin/perfil" },
  { label: "Papelera", href: "/admin/papelera" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Administración">
      <ul>
        {navigation.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href) ||
                (item.href === "/admin/proyectos" &&
                  pathname.startsWith("/admin/categorias"));
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <span className="admin-nav__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
