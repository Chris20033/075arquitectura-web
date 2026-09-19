import "dotenv/config";

import { bootstrapAdmin } from "../lib/admin/bootstrap";
import { createDatabaseClient } from "../lib/db/client";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!email) throw new Error("ADMIN_EMAIL is required.");
  if (!password) throw new Error("ADMIN_PASSWORD is required.");

  const database = createDatabaseClient(databaseUrl);

  try {
    const admin = await bootstrapAdmin(database, { email, password });
    console.info(`Administrator created for ${admin.email}.`);
  } finally {
    await database.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Administrator bootstrap failed.",
  );
  process.exitCode = 1;
});
