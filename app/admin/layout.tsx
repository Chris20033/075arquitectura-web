import type { Metadata } from "next";

import "./admin.css";

export const metadata: Metadata = {
  title: "Administración",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-root">{children}</div>;
}
