import "dotenv/config";

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

import { Client } from "pg";

import { getSafeTestDatabaseUrl } from "./test-database";

const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");

function runPrisma(args: string[], databaseUrl: string) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Prisma command failed: prisma ${args.join(" ")}`);
  }
}

async function main() {
  const testDatabaseUrl = getSafeTestDatabaseUrl();
  const client = new Client({ connectionString: testDatabaseUrl });

  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  runPrisma(["migrate", "deploy"], testDatabaseUrl);
  runPrisma(["db", "seed", "--", "--mode=test"], testDatabaseUrl);

  console.info("Test database reset, migrated, and seeded safely.");
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Test database reset failed.",
  );
  process.exitCode = 1;
});
