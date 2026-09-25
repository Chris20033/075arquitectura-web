CREATE TABLE "site_hero_images" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "site_profile_id" UUID NOT NULL,
    "cloudinary_asset_id" VARCHAR(255) NOT NULL,
    "cloudinary_public_id" VARCHAR(255) NOT NULL,
    "cloudinary_version" BIGINT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "format" VARCHAR(32) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" BIGINT NOT NULL,
    "alt_text" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_hero_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_hero_images_dimensions_check" CHECK ("width" > 0 AND "height" > 0),
    CONSTRAINT "site_hero_images_bytes_check" CHECK ("bytes" > 0),
    CONSTRAINT "site_hero_images_version_check" CHECK ("cloudinary_version" > 0),
    CONSTRAINT "site_hero_images_alt_text_check" CHECK (length(btrim("alt_text")) > 0)
);

CREATE UNIQUE INDEX "site_hero_images_site_profile_id_key" ON "site_hero_images"("site_profile_id");
CREATE UNIQUE INDEX "site_hero_images_cloudinary_asset_id_key" ON "site_hero_images"("cloudinary_asset_id");
CREATE UNIQUE INDEX "site_hero_images_cloudinary_public_id_key" ON "site_hero_images"("cloudinary_public_id");

ALTER TABLE "site_hero_images"
ADD CONSTRAINT "site_hero_images_site_profile_id_fkey"
FOREIGN KEY ("site_profile_id") REFERENCES "site_profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
