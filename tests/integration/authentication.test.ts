import argon2 from "argon2";
import { decode, encode } from "next-auth/jwt";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { LoginThrottleScope } from "@/generated/prisma/enums";
import { sanitizeAdminCallback } from "@/lib/auth/callback-url";
import { getAdminSessionCookie } from "@/lib/auth/cookie";
import { authenticateAdmin } from "@/lib/auth/credentials";
import {
  createLoginThrottleKey,
  isLoginBlocked,
  registerLoginFailure,
} from "@/lib/auth/rate-limit";
import { adminSessionMaxAgeMs, validateAdminClaims } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/db/client";
import { seedDatabase } from "@/prisma/seed-data";
import { getSafeTestDatabaseUrl } from "@/scripts/test-database";

const database = createDatabaseClient(getSafeTestDatabaseUrl());
const authSecret = "test-only-auth-secret-with-enough-entropy";
const testPassword = "test-only-password-123!";
const baseTime = new Date("2026-09-18T12:00:00.000Z");

beforeEach(async () => {
  await seedDatabase(database, { mode: "test", reset: true });
});

afterAll(async () => {
  await database.$disconnect();
});

function authenticate(
  email: string,
  password: string,
  clientIdentity = "198.51.100.10",
  now = baseTime,
) {
  return authenticateAdmin(
    database,
    { email, password },
    { authSecret, clientIdentity, now },
  );
}

describe("credential authentication", () => {
  it("normalizes email, verifies Argon2id, and updates only a successful login", async () => {
    const storedBefore = await database.adminUser.findUniqueOrThrow({
      where: { singletonKey: "owner" },
    });
    expect(storedBefore.passwordHash).toMatch(
      /^\$argon2id\$v=19\$m=19456,p=1,t=2\$/,
    );
    await expect(
      argon2.verify(storedBefore.passwordHash, testPassword),
    ).resolves.toBe(true);

    const authenticated = await authenticate(
      "  ADMIN@075ARQUITECTURA.TEST  ",
      testPassword,
    );
    expect(authenticated).toMatchObject({
      email: "admin@075arquitectura.test",
    });

    const storedAfter = await database.adminUser.findUniqueOrThrow({
      where: { singletonKey: "owner" },
    });
    expect(storedAfter.lastLoginAt?.getTime()).toBe(baseTime.getTime());
  });

  it.each([
    ["admin@075arquitectura.test", "wrong-password-long-enough"],
    ["unknown@example.test", "wrong-password-long-enough"],
  ])(
    "returns the same public result for invalid credentials",
    async (email, password) => {
      await expect(authenticate(email, password)).resolves.toBeNull();
      const stored = await database.adminUser.findUniqueOrThrow({
        where: { singletonKey: "owner" },
      });
      expect(stored.lastLoginAt).toBeNull();
    },
  );

  it("returns the same result for an inactive administrator", async () => {
    await database.adminUser.update({
      where: { singletonKey: "owner" },
      data: { isActive: false },
    });

    await expect(
      authenticate("admin@075arquitectura.test", testPassword),
    ).resolves.toBeNull();
  });
});

describe("persistent throttling", () => {
  it("blocks account and client buckets at their independent thresholds", async () => {
    const account = createLoginThrottleKey(
      LoginThrottleScope.ACCOUNT,
      "owner",
      authSecret,
    );
    const client = createLoginThrottleKey(
      LoginThrottleScope.CLIENT,
      "198.51.100.20",
      authSecret,
    );

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await registerLoginFailure(database, [account], baseTime);
    }
    expect(await isLoginBlocked(database, [account], baseTime)).toBe(false);
    await registerLoginFailure(database, [account], baseTime);
    expect(await isLoginBlocked(database, [account], baseTime)).toBe(true);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await registerLoginFailure(database, [client], baseTime);
    }
    expect(await isLoginBlocked(database, [client], baseTime)).toBe(true);
  });

  it("unblocks after the block and resets an expired window", async () => {
    const key = createLoginThrottleKey(
      LoginThrottleScope.ACCOUNT,
      "owner",
      authSecret,
    );
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await registerLoginFailure(database, [key], baseTime);
    }

    const afterBlock = new Date(baseTime.getTime() + 15 * 60_000 + 1);
    expect(await isLoginBlocked(database, [key], afterBlock)).toBe(false);
    await registerLoginFailure(database, [key], afterBlock);

    const stored = await database.loginThrottle.findUniqueOrThrow({
      where: { scope_keyHash: key },
    });
    expect(stored.failures).toBe(1);
    expect(stored.blockedUntil).toBeNull();
  });

  it("persists only irreversible HMAC keys", async () => {
    const email = "admin@075arquitectura.test";
    await authenticate(email, "wrong-password-long-enough", "203.0.113.44");
    const records = await database.loginThrottle.findMany();

    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(record.keyHash).toMatch(/^[0-9a-f]{64}$/);
      expect(record.keyHash).not.toContain(email);
      expect(record.keyHash).not.toContain("203.0.113.44");
    }
  });

  it("counts concurrent failures atomically", async () => {
    const key = createLoginThrottleKey(
      LoginThrottleScope.CLIENT,
      "203.0.113.55",
      authSecret,
    );
    await Promise.all(
      Array.from({ length: 10 }, () =>
        registerLoginFailure(database, [key], baseTime),
      ),
    );

    const stored = await database.loginThrottle.findUniqueOrThrow({
      where: { scope_keyHash: key },
    });
    expect(stored.failures).toBe(10);
  });
});

describe("absolute administrator session", () => {
  it("uses an HttpOnly, SameSite cookie and enables Secure in production", () => {
    expect(getAdminSessionCookie(false)).toMatchObject({
      name: "next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", secure: false },
    });
    expect(getAdminSessionCookie(true)).toMatchObject({
      name: "__Secure-next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", secure: true },
    });
  });

  it("accepts a current token and rejects expiry, deactivation, and password changes", async () => {
    const admin = await database.adminUser.findUniqueOrThrow({
      where: { singletonKey: "owner" },
    });
    const claims = {
      sub: admin.id,
      sessionStartedAt: baseTime.getTime(),
      passwordChangedAt: admin.passwordChangedAt.getTime(),
    };

    await expect(
      validateAdminClaims(database, claims, baseTime),
    ).resolves.toMatchObject({
      id: admin.id,
    });
    await expect(
      validateAdminClaims(
        database,
        claims,
        new Date(baseTime.getTime() + adminSessionMaxAgeMs),
      ),
    ).resolves.toBeNull();

    await database.adminUser.update({
      where: { id: admin.id },
      data: {
        passwordChangedAt: new Date(admin.passwordChangedAt.getTime() + 1_000),
      },
    });
    await expect(
      validateAdminClaims(database, claims, baseTime),
    ).resolves.toBeNull();

    await database.adminUser.update({
      where: { id: admin.id },
      data: { passwordChangedAt: admin.passwordChangedAt, isActive: false },
    });
    await expect(
      validateAdminClaims(database, claims, baseTime),
    ).resolves.toBeNull();
  });

  it("encrypts JWTs and rejects a token decoded with another secret", async () => {
    const token = await encode({
      secret: authSecret,
      token: { sub: "admin-id", sessionStartedAt: baseTime.getTime() },
      maxAge: 60,
    });
    expect(token.split(".")).toHaveLength(5);
    await expect(decode({ secret: authSecret, token })).resolves.toMatchObject({
      sub: "admin-id",
    });
    await expect(
      decode({ secret: "different-test-secret", token }),
    ).rejects.toThrow();
  });
});

describe("safe administrator callbacks", () => {
  it.each([
    ["/admin/proyectos", "/admin/proyectos"],
    ["/admin", "/admin"],
    ["https://evil.example/admin", "/admin"],
    ["//evil.example", "/admin"],
    ["/admin\\evil", "/admin"],
    ["/admin/acceso?callbackUrl=/admin", "/admin"],
  ])("sanitizes %s", (input, expected) => {
    expect(sanitizeAdminCallback(input)).toBe(expected);
  });
});
