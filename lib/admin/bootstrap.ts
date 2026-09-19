import argon2 from "argon2";

import type { DatabaseClient } from "@/lib/db/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 15;
const MAX_PASSWORD_LENGTH = 128;

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

  if (
    input.password.length < MIN_PASSWORD_LENGTH ||
    input.password.length > MAX_PASSWORD_LENGTH
  ) {
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

  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

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
