import "server-only";

import { ProjectStatus } from "@/generated/prisma/enums";
import { requireAdminOperation } from "@/lib/auth/access";
import { database } from "@/lib/db";

export async function getAdminDashboardData() {
  const session = await requireAdminOperation();

  const [projects, published, drafts, trash, categories, profile] =
    await Promise.all([
      database.project.count(),
      database.project.count({
        where: { status: ProjectStatus.PUBLISHED, deletedAt: null },
      }),
      database.project.count({
        where: { status: ProjectStatus.DRAFT, deletedAt: null },
      }),
      database.project.count({ where: { deletedAt: { not: null } } }),
      database.category.count(),
      database.siteProfile.findUnique({
        where: { singletonKey: "default" },
        select: {
          professionalName: true,
          biography: true,
          whatsappPhone: true,
          publicEmail: true,
          publicPhone: true,
        },
      }),
    ]);

  const profileFields = profile ? Object.values(profile) : [];
  const completedProfileFields = profileFields.filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  ).length;

  return {
    administratorEmail: session.user?.email ?? "",
    metrics: { projects, published, drafts, trash, categories },
    profileCompletion: {
      completed: completedProfileFields,
      total: 5,
    },
  };
}
