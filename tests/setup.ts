import { getSafeTestDatabaseUrl } from "../scripts/test-database";

process.env.DATABASE_URL = getSafeTestDatabaseUrl();
Object.assign(process.env, { NODE_ENV: "test" });
