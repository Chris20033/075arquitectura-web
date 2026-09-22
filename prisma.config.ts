import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node scripts/run-tsx.mjs prisma/seed.ts",
  },
  datasource: {
    // Client generation must also work during `npm ci`, before an environment
    // file exists. Commands that access PostgreSQL still require a valid URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
