import type { DatabaseClient } from "@/lib/db/client";

export const adminSessionMaxAgeSeconds = 8 * 60 * 60;
export const adminSessionMaxAgeMs = adminSessionMaxAgeSeconds * 1_000;

export type AdminJwtClaims = {
  sub?: string;
  sessionStartedAt?: number;
  passwordChangedAt?: number;
};

export async function validateAdminClaims(
  database: DatabaseClient,
  claims: AdminJwtClaims,
  now = new Date(),
) {
  if (
    !claims.sub ||
    !Number.isFinite(claims.sessionStartedAt) ||
    !Number.isFinite(claims.passwordChangedAt)
  ) {
    return null;
  }

  const startedAt = claims.sessionStartedAt as number;
  const age = now.getTime() - startedAt;
  if (age < 0 || age >= adminSessionMaxAgeMs) return null;

  const admin = await database.adminUser.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      isActive: true,
      passwordChangedAt: true,
      lastLoginAt: true,
    },
  });

  if (
    !admin?.isActive ||
    admin.passwordChangedAt.getTime() !== claims.passwordChangedAt
  ) {
    return null;
  }

  return admin;
}

export function isAdminTokenWithinAbsoluteLifetime(
  claims: AdminJwtClaims,
  now = Date.now(),
) {
  if (!Number.isFinite(claims.sessionStartedAt)) return false;
  const age = now - (claims.sessionStartedAt as number);
  return age >= 0 && age < adminSessionMaxAgeMs;
}
