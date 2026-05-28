-- CreateEnum
CREATE TYPE "EventResourceType" AS ENUM ('PHOTO_GALLERY', 'VIDEO', 'RESULTS', 'REGISTRATION', 'LIVE_TRACKING', 'OFFICIAL_WEBSITE', 'SOCIAL_POST', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceProvider" AS ENUM ('GOOGLE_DRIVE', 'GOOGLE_PHOTOS', 'DROPBOX', 'PIXIESET', 'SMUGMUG', 'FLICKR', 'YOUTUBE', 'INSTAGRAM', 'VIMEO', 'STRAVA', 'GARMIN', 'WEBSITE', 'OTHER');

-- CreateTable
CREATE TABLE "event_resources" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "EventResourceType" NOT NULL,
    "provider" "ResourceProvider" NOT NULL,
    "url" TEXT NOT NULL,
    "section" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "submittedByName" TEXT,
    "submittedByInstagram" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "eventEditionId" UUID NOT NULL,
    "serviceProviderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_resources_slug_key" ON "event_resources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "event_resources_url_key" ON "event_resources"("url");

-- CreateIndex
CREATE INDEX "event_resources_eventEditionId_idx" ON "event_resources"("eventEditionId");

-- CreateIndex
CREATE INDEX "event_resources_serviceProviderId_idx" ON "event_resources"("serviceProviderId");

-- CreateIndex
CREATE INDEX "event_resources_type_idx" ON "event_resources"("type");

-- CreateIndex
CREATE INDEX "event_resources_provider_idx" ON "event_resources"("provider");

-- AddForeignKey
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_eventEditionId_fkey" FOREIGN KEY ("eventEditionId") REFERENCES "event_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
