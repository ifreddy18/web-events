/*
  Warnings:

  - A unique constraint covering the columns `[full_name]` on the table `athletes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[url]` on the table `media` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaUsageType" ADD VALUE 'ELEVATION_PROFILE';
ALTER TYPE "MediaUsageType" ADD VALUE 'PORTFOLIO';

-- CreateIndex
CREATE UNIQUE INDEX "athletes_full_name_key" ON "athletes"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "media_url_key" ON "media"("url");

-- CreateIndex
CREATE INDEX "service_providers_name_idx" ON "service_providers"("name");
