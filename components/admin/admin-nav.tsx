"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { index: "01", label: "Resumen", href: "/admin" },
  { index: "02", label: "Proyectos", href: "/admin/proyectos" },
  { index: "03", label: "Categorías", href: "/admin/categorias" },
  { index: "04", label: "Perfil", href: "/admin/perfil" },
  { index: "05", label: "Papelera", href: "/admin/papelera" },
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
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <span className="admin-nav__index">{item.index}</span>
                <span className="admin-nav__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
