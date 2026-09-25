import "server-only";

import { requireAdminOperation } from "@/lib/auth/access";
import { database } from "@/lib/db";

import { createAdminContentService } from "./content-service";

const content = createAdminContentService(database);

export async function getAdminCategories() {
  await requireAdminOperation();
  return content.listCategories();
}

export async function getAdminProjects(
  filter: "all" | "draft" | "published" = "all",
) {
  await requireAdminOperation();
  return content.listProjects(filter);
}

export async function getAdminProject(id: string) {
  await requireAdminOperation();
  return content.getProject(id);
}

export async function getAdminTrash() {
  await requireAdminOperation();
  return content.listTrash();
}

export async function getAdminProfile() {
  await requireAdminOperation();
  return content.getProfile();
}
