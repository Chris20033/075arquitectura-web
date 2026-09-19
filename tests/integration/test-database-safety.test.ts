import { describe, expect, it } from "vitest";

import {
  defaultTestDatabaseUrl,
  getSafeTestDatabaseUrl,
} from "@/scripts/test-database";

describe("test database safety guard", () => {
  it("accepts only the dedicated local test database", () => {
    expect(getSafeTestDatabaseUrl(defaultTestDatabaseUrl)).toBe(
      defaultTestDatabaseUrl,
    );
  });

  it.each([
    "postgresql://user:pass@example.com:5433/arquitectura_test",
    "postgresql://user:pass@127.0.0.1:5432/arquitectura_test",
    "postgresql://user:pass@127.0.0.1:5433/arquitectura",
  ])("rejects unsafe URL %s", (url) => {
    expect(() => getSafeTestDatabaseUrl(url)).toThrow();
  });
});
