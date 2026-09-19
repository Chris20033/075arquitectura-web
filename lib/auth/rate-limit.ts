import { createHmac } from "node:crypto";

import { LoginThrottleScope } from "@/generated/prisma/enums";
import type { DatabaseClient } from "@/lib/db/client";

const MINUTE = 60_000;
const RETENTION_MS = 24 * 60 * MINUTE;

export const loginThrottlePolicies = {
  [LoginThrottleScope.ACCOUNT]: {
    threshold: 5,
    windowMs: 15 * MINUTE,
    blockMs: 15 * MINUTE,
  },
  [LoginThrottleScope.CLIENT]: {
    threshold: 20,
    windowMs: 15 * MINUTE,
    blockMs: 15 * MINUTE,
  },
} as const;

export type LoginThrottleKey = {
  scope: LoginThrottleScope;
  keyHash: string;
};

export function createLoginThrottleKey(
  scope: LoginThrottleScope,
  value: string,
  secret: string,
): LoginThrottleKey {
  if (!secret) throw new Error("AUTH_SECRET is required for login throttling.");

  return {
    scope,
    keyHash: createHmac("sha256", secret)
      .update(`${scope}:${value}`)
      .digest("hex"),
  };
}

export async function isLoginBlocked(
  database: DatabaseClient,
  keys: LoginThrottleKey[],
  now = new Date(),
) {
  if (keys.length === 0) return false;

  const blocked = await database.loginThrottle.findFirst({
    where: {
      OR: keys.map(({ scope, keyHash }) => ({ scope, keyHash })),
      blockedUntil: { gt: now },
    },
    select: { keyHash: true },
  });

  return Boolean(blocked);
}

export async function registerLoginFailure(
  database: DatabaseClient,
  keys: LoginThrottleKey[],
  now = new Date(),
) {
  await database.$transaction(
    keys.map(({ scope, keyHash }) => {
      const policy = loginThrottlePolicies[scope];
      const windowStart = new Date(now.getTime() - policy.windowMs);
      const blockedUntil = new Date(now.getTime() + policy.blockMs);

      return database.$executeRaw`
        INSERT INTO "login_throttles" (
          "scope", "key_hash", "failures", "window_started_at", "blocked_until", "updated_at"
        ) VALUES (
          ${scope}::"LoginThrottleScope", ${keyHash}, 1, ${now}, NULL, ${now}
        )
        ON CONFLICT ("scope", "key_hash") DO UPDATE SET
          "failures" = CASE
            WHEN "login_throttles"."window_started_at" <= ${windowStart} THEN 1
            ELSE "login_throttles"."failures" + 1
          END,
          "window_started_at" = CASE
            WHEN "login_throttles"."window_started_at" <= ${windowStart} THEN ${now}
            ELSE "login_throttles"."window_started_at"
          END,
          "blocked_until" = CASE
            WHEN "login_throttles"."blocked_until" > ${now}
              THEN "login_throttles"."blocked_until"
            WHEN (
              CASE
                WHEN "login_throttles"."window_started_at" <= ${windowStart} THEN 1
                ELSE "login_throttles"."failures" + 1
              END
            ) >= ${policy.threshold}
              THEN ${blockedUntil}
            ELSE NULL
          END,
          "updated_at" = ${now}
      `;
    }),
  );
}

export function clearAccountThrottle(
  database: DatabaseClient,
  key: LoginThrottleKey,
) {
  return database.loginThrottle.deleteMany({
    where: { scope: key.scope, keyHash: key.keyHash },
  });
}

export function cleanupExpiredLoginThrottles(
  database: DatabaseClient,
  now = new Date(),
) {
  const retentionCutoff = new Date(now.getTime() - RETENTION_MS);
  return database.loginThrottle.deleteMany({
    where: {
      updatedAt: { lt: retentionCutoff },
      OR: [{ blockedUntil: null }, { blockedUntil: { lt: now } }],
    },
  });
}
