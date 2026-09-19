-- CreateEnum
CREATE TYPE "LoginThrottleScope" AS ENUM ('ACCOUNT', 'CLIENT');

-- CreateTable
CREATE TABLE "login_throttles" (
    "scope" "LoginThrottleScope" NOT NULL,
    "key_hash" CHAR(64) NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "blocked_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_throttles_pkey" PRIMARY KEY ("scope", "key_hash"),
    CONSTRAINT "login_throttles_failures_check" CHECK ("failures" >= 0),
    CONSTRAINT "login_throttles_key_hash_check" CHECK ("key_hash" ~ '^[0-9a-f]{64}$')
);

-- CreateIndex
CREATE INDEX "login_throttles_updated_at_idx" ON "login_throttles"("updated_at");
