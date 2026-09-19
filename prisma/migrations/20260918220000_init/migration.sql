-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "singleton_key" VARCHAR(32) NOT NULL DEFAULT 'owner',
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "password_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_users_singleton_check" CHECK ("singleton_key" = 'owner'),
    CONSTRAINT "admin_users_email_normalized_check" CHECK ("email" = lower(btrim("email")))
);

-- CreateTable
CREATE TABLE "site_profiles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "singleton_key" VARCHAR(32) NOT NULL DEFAULT 'default',
    "professional_name" VARCHAR(160) NOT NULL DEFAULT '',
    "biography" TEXT,
    "whatsapp_phone" VARCHAR(32),
    "public_email" VARCHAR(320),
    "public_phone" VARCHAR(32),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_profiles_singleton_check" CHECK ("singleton_key" = 'default')
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "site_profile_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "social_links_position_check" CHECK ("position" >= 0)
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(120) NOT NULL,
    "normalized_name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_name_normalized_check" CHECK ("normalized_name" = lower(btrim("name"))),
    CONSTRAINT "categories_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "categories_position_check" CHECK ("position" >= 0)
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "category_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "year" SMALLINT,
    "location" VARCHAR(180),
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "projects_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "projects_position_check" CHECK ("position" >= 0),
    CONSTRAINT "projects_year_check" CHECK ("year" IS NULL OR "year" BETWEEN 1000 AND 9999)
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "project_id" UUID NOT NULL,
    "cloudinary_asset_id" VARCHAR(255) NOT NULL,
    "cloudinary_public_id" VARCHAR(255) NOT NULL,
    "cloudinary_version" BIGINT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "format" VARCHAR(32) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" BIGINT NOT NULL,
    "alt_text" VARCHAR(500),
    "position" INTEGER NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_images_position_check" CHECK ("position" >= 0),
    CONSTRAINT "project_images_dimensions_check" CHECK ("width" > 0 AND "height" > 0),
    CONSTRAINT "project_images_bytes_check" CHECK ("bytes" > 0),
    CONSTRAINT "project_images_version_check" CHECK ("cloudinary_version" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_singleton_key_key" ON "admin_users"("singleton_key");
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "site_profiles_singleton_key_key" ON "site_profiles"("singleton_key");
CREATE UNIQUE INDEX "social_links_profile_position_key" ON "social_links"("site_profile_id", "position");
CREATE UNIQUE INDEX "categories_normalized_name_key" ON "categories"("normalized_name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "categories_position_key" ON "categories"("position");
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");
CREATE INDEX "projects_public_listing_idx" ON "projects"("status", "deleted_at", "position");
CREATE INDEX "projects_category_id_idx" ON "projects"("category_id");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");
CREATE UNIQUE INDEX "projects_public_position_key" ON "projects"("position") WHERE (status = 'PUBLISHED' AND deleted_at IS NULL);
CREATE UNIQUE INDEX "project_images_cloudinary_asset_id_key" ON "project_images"("cloudinary_asset_id");
CREATE UNIQUE INDEX "project_images_cloudinary_public_id_key" ON "project_images"("cloudinary_public_id");
CREATE INDEX "project_images_project_id_idx" ON "project_images"("project_id");
CREATE UNIQUE INDEX "project_images_project_position_key" ON "project_images"("project_id", "position");
CREATE UNIQUE INDEX "project_images_one_cover_key" ON "project_images"("project_id") WHERE ("is_cover" = true);

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_site_profile_id_fkey" FOREIGN KEY ("site_profile_id") REFERENCES "site_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
