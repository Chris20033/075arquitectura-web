-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'PINTEREST', 'TIKTOK', 'BEHANCE', 'HOUZZ', 'YOUTUBE', 'X', 'OTHER');

-- AlterTable
ALTER TABLE "social_links" ADD COLUMN     "platform" "SocialPlatform" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "username" VARCHAR(80);
