import { LoginThrottleScope } from "@/generated/prisma/enums";
import { normalizeEmail } from "@/lib/admin/bootstrap";
import type { DatabaseClient } from "@/lib/db/client";

import {
  dummyPasswordHash,
  isPasswordLengthValid,
  verifyPassword,
} from "./password";
import {
  cleanupExpiredLoginThrottles,
  createLoginThrottleKey,
  isLoginBlocked,
  registerLoginFailure,
} from "./rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FALLBACK_PASSWORD = "075arquitectura-invalid-credential";

type HeaderValue = string | string[] | undefined;

export type CredentialRequest = {
  headers?: Record<string, HeaderValue>;
};

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  name: string;
  passwordChangedAt: number;
};

function firstHeaderValue(value: HeaderValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function getClientIdentity(request: CredentialRequest) {
  const headers = request.headers ?? {};
  const realIp = firstHeaderValue(headers["x-real-ip"]);
  const forwarded = firstHeaderValue(headers["x-forwarded-for"]);
  const candidate = realIp ?? forwarded?.split(",")[0]?.trim();
  return (candidate || "unknown-client").slice(0, 256);
}

export async function authenticateAdmin(
  database: DatabaseClient,
  input: { email?: unknown; password?: unknown },
  context: {
    authSecret: string;
    clientIdentity: string;
    now?: Date;
  },
): Promise<AuthenticatedAdmin | null> {
  const now = context.now ?? new Date();
  const emailInput = typeof input.email === "string" ? input.email : "";
  const passwordInput =
    typeof input.password === "string" ? input.password : "";
  const email = normalizeEmail(emailInput);
  const emailIsValid = EMAIL_PATTERN.test(email) && email.length <= 320;
  const passwordIsValid = isPasswordLengthValid(passwordInput);

  const admin = await database.adminUser.findUnique({
    where: { singletonKey: "owner" },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
      passwordChangedAt: true,
    },
  });

  const emailMatches = Boolean(admin && emailIsValid && admin.email === email);
  const clientKey = createLoginThrottleKey(
    LoginThrottleScope.CLIENT,
    context.clientIdentity,
    context.authSecret,
  );
  const accountKey = emailMatches
    ? createLoginThrottleKey(
        LoginThrottleScope.ACCOUNT,
        "owner",
        context.authSecret,
      )
    : null;
  const throttleKeys = accountKey ? [clientKey, accountKey] : [clientKey];

  if (await isLoginBlocked(database, throttleKeys, now)) return null;

  const hash = admin?.passwordHash ?? dummyPasswordHash;
  const password = passwordIsValid ? passwordInput : FALLBACK_PASSWORD;
  const passwordMatches = await verifyPassword(hash, password).catch(
    () => false,
  );

  if (
    !admin ||
    !emailMatches ||
    !passwordIsValid ||
    !passwordMatches ||
    !admin.isActive
  ) {
    await registerLoginFailure(database, throttleKeys, now);
    return null;
  }

  const updatedAdmin = await database.$transaction(async (transaction) => {
    const updated = await transaction.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: now },
      select: {
        id: true,
        email: true,
        passwordChangedAt: true,
      },
    });

    if (accountKey) {
      await transaction.loginThrottle.deleteMany({
        where: { scope: accountKey.scope, keyHash: accountKey.keyHash },
      });
    }

    return updated;
  });

  void cleanupExpiredLoginThrottles(database, now).catch(() => undefined);

  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    name: "Propietaria",
    passwordChangedAt: updatedAdmin.passwordChangedAt.getTime(),
  };
}
