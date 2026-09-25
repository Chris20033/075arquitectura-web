CREATE TYPE "MediaStorageKind" AS ENUM ('BUNDLED', 'LOCAL');

-- The independent hero is intentionally cleared. The owner chose to upload it again.
DELETE FROM "site_hero_images";

ALTER TABLE "site_hero_images"
  DROP CONSTRAINT "site_hero_images_version_check",
  DROP CONSTRAINT "site_hero_images_bytes_check",
  ADD COLUMN "media_key" UUID NOT NULL DEFAULT uuidv7(),
  ADD COLUMN "storage_kind" "MediaStorageKind" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "storage_key" TEXT NOT NULL,
  ADD COLUMN "original_filename" VARCHAR(255) NOT NULL,
  ADD COLUMN "original_format" VARCHAR(16) NOT NULL,
  ADD COLUMN "original_bytes" BIGINT NOT NULL,
  ADD COLUMN "original_sha256" CHAR(64),
  ADD COLUMN "display_format" VARCHAR(16) NOT NULL DEFAULT 'webp',
  ADD COLUMN "variants" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "upload_token" UUID;

DROP INDEX "site_hero_images_cloudinary_asset_id_key";
DROP INDEX "site_hero_images_cloudinary_public_id_key";

ALTER TABLE "site_hero_images"
  DROP COLUMN "cloudinary_asset_id",
  DROP COLUMN "cloudinary_public_id",
  DROP COLUMN "cloudinary_version",
  DROP COLUMN "secure_url",
  DROP COLUMN "format",
  DROP COLUMN "bytes",
  ADD CONSTRAINT "site_hero_images_original_bytes_check" CHECK ("original_bytes" > 0),
  ADD CONSTRAINT "site_hero_images_display_format_check" CHECK ("display_format" = 'webp');

CREATE UNIQUE INDEX "site_hero_images_media_key_key" ON "site_hero_images"("media_key");
CREATE INDEX "site_hero_images_storage_key_idx" ON "site_hero_images"("storage_key");
CREATE UNIQUE INDEX "site_hero_images_upload_token_key" ON "site_hero_images"("upload_token");

ALTER TABLE "project_images"
  ADD COLUMN "media_key" UUID DEFAULT uuidv7(),
  ADD COLUMN "storage_kind" "MediaStorageKind",
  ADD COLUMN "storage_key" TEXT,
  ADD COLUMN "original_filename" VARCHAR(255),
  ADD COLUMN "original_format" VARCHAR(16),
  ADD COLUMN "original_bytes" BIGINT,
  ADD COLUMN "original_sha256" CHAR(64),
  ADD COLUMN "display_format" VARCHAR(16),
  ADD COLUMN "variants" JSONB,
  ADD COLUMN "upload_token" UUID;

-- Bundled demonstration images remain available without copying runtime files.
UPDATE "project_images"
SET
  "media_key" = "id",
  "storage_kind" = 'BUNDLED',
  "storage_key" = CASE "cloudinary_public_id"
    WHEN '075arquitectura/demo/casa-luz-cover' THEN '/images/concept/courtyard-house-demo.webp'
    WHEN '075arquitectura/demo/casa-luz-gallery' THEN '/images/concept/stair-interior-demo.webp'
    WHEN '075arquitectura/demo/patio-tierra-cover' THEN '/images/concept/brick-pavilion-demo.webp'
    WHEN '075arquitectura/demo/patio-tierra-gallery' THEN '/images/concept/patio-tierra-detail-demo.webp'
    WHEN '075arquitectura/demo/casa-umbral-cover' THEN '/images/concept/casa-umbral-cover-demo.webp'
    WHEN '075arquitectura/demo/casa-umbral-gallery' THEN '/images/concept/casa-umbral-stair-demo.webp'
    WHEN '075arquitectura/demo/draft' THEN '/images/concept/stair-interior-demo.webp'
    WHEN '075arquitectura/demo/deleted-cover' THEN '/images/concept/courtyard-house-demo.webp'
  END,
  "original_filename" = 'demo.webp',
  "original_format" = 'webp',
  "original_bytes" = "bytes",
  "display_format" = 'webp',
  "variants" = '[]'::jsonb
WHERE "cloudinary_public_id" LIKE '075arquitectura/demo/%';

-- Real Cloudinary references are detached; those files will be uploaded again.
DELETE FROM "project_images"
WHERE "storage_key" IS NULL;

UPDATE "projects" AS project
SET "status" = 'DRAFT', "position" = 0, "updated_at" = CURRENT_TIMESTAMP
WHERE project."status" = 'PUBLISHED'
  AND project."deleted_at" IS NULL
  AND (
    NOT EXISTS (SELECT 1 FROM "project_images" image WHERE image."project_id" = project."id")
    OR NOT EXISTS (SELECT 1 FROM "project_images" image WHERE image."project_id" = project."id" AND image."is_cover" = true)
  );

ALTER TABLE "project_images"
  ALTER COLUMN "media_key" SET NOT NULL,
  ALTER COLUMN "storage_kind" SET NOT NULL,
  ALTER COLUMN "storage_kind" SET DEFAULT 'LOCAL',
  ALTER COLUMN "storage_key" SET NOT NULL,
  ALTER COLUMN "original_filename" SET NOT NULL,
  ALTER COLUMN "original_format" SET NOT NULL,
  ALTER COLUMN "original_bytes" SET NOT NULL,
  ALTER COLUMN "display_format" SET NOT NULL,
  ALTER COLUMN "display_format" SET DEFAULT 'webp',
  ALTER COLUMN "variants" SET NOT NULL,
  DROP CONSTRAINT "project_images_version_check",
  DROP CONSTRAINT "project_images_bytes_check";

DROP INDEX "project_images_cloudinary_asset_id_key";
DROP INDEX "project_images_cloudinary_public_id_key";

ALTER TABLE "project_images"
  DROP COLUMN "cloudinary_asset_id",
  DROP COLUMN "cloudinary_public_id",
  DROP COLUMN "cloudinary_version",
  DROP COLUMN "secure_url",
  DROP COLUMN "format",
  DROP COLUMN "bytes",
  ADD CONSTRAINT "project_images_original_bytes_check" CHECK ("original_bytes" > 0),
  ADD CONSTRAINT "project_images_display_format_check" CHECK ("display_format" = 'webp');

CREATE UNIQUE INDEX "project_images_media_key_key" ON "project_images"("media_key");
CREATE INDEX "project_images_storage_key_idx" ON "project_images"("storage_key");
CREATE UNIQUE INDEX "project_images_upload_token_key" ON "project_images"("upload_token");
