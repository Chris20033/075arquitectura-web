import "dotenv/config";

export const defaultTestDatabaseUrl =
  "postgresql://arquitectura_test:local_test_only@127.0.0.1:5433/arquitectura_test";

export function getSafeTestDatabaseUrl(value = process.env.TEST_DATABASE_URL) {
  const rawUrl = value || defaultTestDatabaseUrl;
  const parsed = new URL(rawUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  const databaseName = parsed.pathname.slice(1);

  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Test database host must be localhost.");
  }
  if (parsed.port !== "5433") {
    throw new Error("Test database port must be 5433.");
  }
  if (!databaseName.endsWith("_test")) {
    throw new Error('Test database name must end with "_test".');
  }

  return rawUrl;
}
