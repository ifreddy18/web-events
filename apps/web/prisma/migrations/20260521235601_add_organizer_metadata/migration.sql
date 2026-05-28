/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `locations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "organizers" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");
