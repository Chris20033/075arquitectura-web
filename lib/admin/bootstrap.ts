import type { DatabaseClient } from "@/lib/db/client";

import { hashPassword, isPasswordLengthValid } from "@/lib/auth/password";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AdminBootstrapError extends Error {
  constructor(
    public readonly code:
      "INVALID_EMAIL" | "INVALID_PASSWORD" | "ADMIN_ALREADY_EXISTS",
    message: string,
  ) {
    super(message);
    this.name = "AdminBootstrapError";
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function bootstrapAdmin(
  database: DatabaseClient,
  input: { email: string; password: string },
) {
  const email = normalizeEmail(input.email);

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    throw new AdminBootstrapError(
      "INVALID_EMAIL",
      "ADMIN_EMAIL must be a valid email address.",
    );
  }

  if (!isPasswordLengthValid(input.password)) {
    throw new AdminBootstrapError(
      "INVALID_PASSWORD",
      "ADMIN_PASSWORD must contain between 15 and 128 characters.",
    );
  }

  const existingAdmins = await database.adminUser.count();
  if (existingAdmins > 0) {
    throw new AdminBootstrapError(
      "ADMIN_ALREADY_EXISTS",
      "An administrator already exists; bootstrap will not overwrite it.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  return database.adminUser.create({
    data: {
      email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });
}
