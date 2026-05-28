/*
  Warnings:

  - You are about to drop the column `type_id` on the `service_providers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "service_providers" DROP CONSTRAINT "service_providers_type_id_fkey";

-- DropIndex
DROP INDEX "service_providers_type_id_city_idx";

-- DropIndex
DROP INDEX "service_providers_type_id_idx";

-- AlterTable
ALTER TABLE "service_providers" DROP COLUMN "type_id";

-- CreateTable
CREATE TABLE "service_provider_to_types" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_provider_to_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_provider_to_types_provider_id_idx" ON "service_provider_to_types"("provider_id");

-- CreateIndex
CREATE INDEX "service_provider_to_types_type_id_idx" ON "service_provider_to_types"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_to_types_provider_id_type_id_key" ON "service_provider_to_types"("provider_id", "type_id");

-- AddForeignKey
ALTER TABLE "service_provider_to_types" ADD CONSTRAINT "service_provider_to_types_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_to_types" ADD CONSTRAINT "service_provider_to_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "service_provider_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
