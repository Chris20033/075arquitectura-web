import "dotenv/config";

import { createDatabaseClient } from "../lib/db/client";
import { seedDatabase, type SeedMode } from "./seed-data";

function readMode(): SeedMode {
  const argument = process.argv.find((value) => value.startsWith("--mode="));
  const mode = argument?.split("=")[1] ?? "development";

  if (mode !== "development" && mode !== "test") {
    throw new Error('Seed mode must be either "development" or "test".');
  }

  return mode;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed PostgreSQL.");
  }

  const database = createDatabaseClient(databaseUrl);

  try {
    const mode = readMode();
    await seedDatabase(database, { mode });
    console.info(`Database seed completed in ${mode} mode.`);
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed failed.");
  process.exitCode = 1;
});
