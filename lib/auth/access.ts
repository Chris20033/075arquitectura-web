import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "./options";

export async function getActiveAdminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session : null;
}

export async function requireAdminPage() {
  const session = await getActiveAdminSession();
  if (!session) redirect("/admin/acceso?estado=sesion");
  return session;
}

export async function requireAdminOperation() {
  const session = await getActiveAdminSession();
  if (!session) throw new Error("UNAUTHORIZED_ADMIN_OPERATION");
  return session;
}
