import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth/access";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdminPage();

  return (
    <AdminShell email={session.user?.email ?? "Administradora"}>
      {children}
    </AdminShell>
  );
}
