import "server-only";

import { createDatabaseClient } from "./client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to access PostgreSQL.");
}

const globalForDatabase = globalThis as typeof globalThis & {
  database?: ReturnType<typeof createDatabaseClient>;
};

export const database =
  globalForDatabase.database ?? createDatabaseClient(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.database = database;
}

export async function disconnectDatabase() {
  await database.$disconnect();
}
