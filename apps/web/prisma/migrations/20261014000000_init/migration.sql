-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventSeriesStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventEditionStatus" AS ENUM ('SCHEDULED', 'POSTPONED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventResourceType" AS ENUM ('PHOTO_GALLERY', 'VIDEO', 'RESULTS', 'REGISTRATION', 'LIVE_TRACKING', 'OFFICIAL_WEBSITE', 'SOCIAL_POST', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceProvider" AS ENUM ('GOOGLE_DRIVE', 'GOOGLE_PHOTOS', 'DROPBOX', 'PIXIESET', 'SMUGMUG', 'FLICKR', 'YOUTUBE', 'INSTAGRAM', 'VIMEO', 'STRAVA', 'GARMIN', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('FINISHED', 'DNF', 'DNS', 'DQ');

-- CreateEnum
CREATE TYPE "ServiceProviderRole" AS ENUM ('PHOTOGRAPHER', 'VIDEOGRAPHER', 'RECOVERY_PARTNER', 'MEDICAL_SUPPORT', 'COACH_GUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "FavoriteEntityType" AS ENUM ('EVENT_SERIES', 'ATHLETE', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaUsageType" AS ENUM ('PROFILE', 'COVER', 'GALLERY', 'BANNER', 'POSTER', 'LOGO', 'ROUTE_MAP', 'PROMOTIONAL', 'ELEVATION_PROFILE', 'PORTFOLIO');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "OrganizerRole" AS ENUM ('PRIMARY', 'CO_ORGANIZER');

-- CreateEnum
CREATE TYPE "ProviderAccreditation" AS ENUM ('UNKNOWN', 'OFFICIAL', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('UNKNOWN', 'NOT_OPEN', 'OPEN', 'CLOSED', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "ParticipationType" AS ENUM ('COMPETITIVE', 'RECREATIONAL');

-- CreateTable
CREATE TABLE "sports" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplines" (
    "id" UUID NOT NULL,
    "sport_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "logo_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT,
    "city" TEXT,
    "venue_name" TEXT,
    "address" TEXT,
    "slug" TEXT NOT NULL,
    "metadata" JSONB,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_series" (
    "id" UUID NOT NULL,
    "discipline_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "official_website" TEXT,
    "instagram" TEXT,
    "status" "EventSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_series_organizers" (
    "id" UUID NOT NULL,
    "event_series_id" UUID NOT NULL,
    "organizer_id" UUID NOT NULL,
    "role" "OrganizerRole" NOT NULL DEFAULT 'CO_ORGANIZER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_series_organizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_editions" (
    "id" UUID NOT NULL,
    "event_series_id" UUID NOT NULL,
    "location_id" UUID,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT,
    "starts_on" DATE,
    "ends_on" DATE,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "time_zone" TEXT NOT NULL DEFAULT 'America/Caracas',
    "rescheduled_from_on" DATE,
    "registration_open_at" TIMESTAMP(3),
    "registration_close_at" TIMESTAMP(3),
    "registration_status" "RegistrationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "registration_url" TEXT,
    "results_url" TEXT,
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "status" "EventEditionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_edition_organizers" (
    "id" UUID NOT NULL,
    "event_edition_id" UUID NOT NULL,
    "organizer_id" UUID NOT NULL,
    "role" "OrganizerRole" NOT NULL DEFAULT 'CO_ORGANIZER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_edition_organizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "event_edition_id" UUID NOT NULL,
    "discipline_id" UUID NOT NULL,
    "location_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "participation_type" "ParticipationType" NOT NULL DEFAULT 'COMPETITIVE',
    "starts_on" DATE,
    "ends_on" DATE,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "registration_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_resources" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventResourceType" NOT NULL,
    "provider" "ResourceProvider" NOT NULL,
    "url" TEXT NOT NULL,
    "section" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "submitted_by_name" TEXT,
    "submitted_by_instagram" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "event_edition_id" UUID NOT NULL,
    "event_service_provider_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "country_code" TEXT,
    "birth_date" DATE,
    "instagram" TEXT,
    "bio" TEXT,
    "profile_image_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "bib_number" TEXT,
    "official_time_seconds" INTEGER,
    "chip_time_seconds" INTEGER,
    "overall_rank" INTEGER,
    "gender_rank" INTEGER,
    "category_rank" INTEGER,
    "status" "ResultStatus" NOT NULL DEFAULT 'FINISHED',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_providers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "profile_image_url" TEXT,
    "city" TEXT,
    "country_code" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_to_types" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_provider_to_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_disciplines" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "discipline_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_provider_disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_service_providers" (
    "id" UUID NOT NULL,
    "event_edition_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "role" "ServiceProviderRole" NOT NULL,
    "accreditation" "ProviderAccreditation" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_service_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "alt_text" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_media" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "type" "MediaUsageType" NOT NULL DEFAULT 'GALLERY',
    "caption" TEXT,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_provider_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_series_media" (
    "id" UUID NOT NULL,
    "event_series_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'gallery',
    "caption" TEXT,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_series_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_edition_media" (
    "id" UUID NOT NULL,
    "event_edition_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'gallery',
    "caption" TEXT,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_edition_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_media" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'gallery',
    "caption" TEXT,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "athlete_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_media" (
    "id" UUID NOT NULL,
    "organizer_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'gallery',
    "caption" TEXT,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizer_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_series_tags" (
    "id" UUID NOT NULL,
    "event_series_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_series_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_tags" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_provider_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" "FavoriteEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_meta" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "seo_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sports_slug_key" ON "sports"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "disciplines_slug_key" ON "disciplines"("slug");

-- CreateIndex
CREATE INDEX "disciplines_sport_id_idx" ON "disciplines"("sport_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizers_slug_key" ON "organizers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE INDEX "locations_country_idx" ON "locations"("country");

-- CreateIndex
CREATE INDEX "locations_state_idx" ON "locations"("state");

-- CreateIndex
CREATE INDEX "locations_city_idx" ON "locations"("city");

-- CreateIndex
CREATE UNIQUE INDEX "event_series_slug_key" ON "event_series"("slug");

-- CreateIndex
CREATE INDEX "event_series_discipline_id_idx" ON "event_series"("discipline_id");

-- CreateIndex
CREATE INDEX "event_series_status_idx" ON "event_series"("status");

-- CreateIndex
CREATE INDEX "event_series_organizers_organizer_id_idx" ON "event_series_organizers"("organizer_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_series_organizers_event_series_id_organizer_id_key" ON "event_series_organizers"("event_series_id", "organizer_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_editions_slug_key" ON "event_editions"("slug");

-- CreateIndex
CREATE INDEX "event_editions_event_series_id_year_idx" ON "event_editions"("event_series_id", "year");

-- CreateIndex
CREATE INDEX "event_editions_publication_status_starts_on_idx" ON "event_editions"("publication_status", "starts_on");

-- CreateIndex
CREATE INDEX "event_editions_status_starts_on_idx" ON "event_editions"("status", "starts_on");

-- CreateIndex
CREATE INDEX "event_editions_location_id_starts_on_idx" ON "event_editions"("location_id", "starts_on");

-- CreateIndex
CREATE INDEX "event_editions_starts_on_idx" ON "event_editions"("starts_on");

-- CreateIndex
CREATE INDEX "event_edition_organizers_organizer_id_idx" ON "event_edition_organizers"("organizer_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_edition_organizers_event_edition_id_organizer_id_key" ON "event_edition_organizers"("event_edition_id", "organizer_id");

-- CreateIndex
CREATE INDEX "competitions_discipline_id_idx" ON "competitions"("discipline_id");

-- CreateIndex
CREATE INDEX "competitions_location_id_idx" ON "competitions"("location_id");

-- CreateIndex
CREATE INDEX "competitions_status_idx" ON "competitions"("status");

-- CreateIndex
CREATE INDEX "competitions_event_edition_id_starts_on_idx" ON "competitions"("event_edition_id", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_event_edition_id_slug_key" ON "competitions"("event_edition_id", "slug");

-- CreateIndex
CREATE INDEX "event_resources_event_edition_id_type_idx" ON "event_resources"("event_edition_id", "type");

-- CreateIndex
CREATE INDEX "event_resources_event_service_provider_id_idx" ON "event_resources"("event_service_provider_id");

-- CreateIndex
CREATE INDEX "event_resources_provider_idx" ON "event_resources"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "event_resources_event_edition_id_url_key" ON "event_resources"("event_edition_id", "url");

-- CreateIndex
CREATE INDEX "athletes_full_name_idx" ON "athletes"("full_name");

-- CreateIndex
CREATE INDEX "athletes_country_code_idx" ON "athletes"("country_code");

-- CreateIndex
CREATE INDEX "results_athlete_id_official_time_seconds_idx" ON "results"("athlete_id", "official_time_seconds");

-- CreateIndex
CREATE INDEX "results_competition_id_overall_rank_idx" ON "results"("competition_id", "overall_rank");

-- CreateIndex
CREATE INDEX "results_competition_id_bib_number_idx" ON "results"("competition_id", "bib_number");

-- CreateIndex
CREATE INDEX "results_status_idx" ON "results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "results_competition_id_athlete_id_key" ON "results"("competition_id", "athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_types_slug_key" ON "service_provider_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_slug_key" ON "service_providers"("slug");

-- CreateIndex
CREATE INDEX "service_providers_name_idx" ON "service_providers"("name");

-- CreateIndex
CREATE INDEX "service_providers_country_code_idx" ON "service_providers"("country_code");

-- CreateIndex
CREATE INDEX "service_providers_city_idx" ON "service_providers"("city");

-- CreateIndex
CREATE INDEX "service_provider_to_types_type_id_idx" ON "service_provider_to_types"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_to_types_provider_id_type_id_key" ON "service_provider_to_types"("provider_id", "type_id");

-- CreateIndex
CREATE INDEX "service_provider_disciplines_discipline_id_idx" ON "service_provider_disciplines"("discipline_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_disciplines_provider_id_discipline_id_key" ON "service_provider_disciplines"("provider_id", "discipline_id");

-- CreateIndex
CREATE INDEX "event_service_providers_provider_id_role_idx" ON "event_service_providers"("provider_id", "role");

-- CreateIndex
CREATE INDEX "event_service_providers_event_edition_id_role_accreditation_idx" ON "event_service_providers"("event_edition_id", "role", "accreditation");

-- CreateIndex
CREATE UNIQUE INDEX "event_service_providers_id_event_edition_id_key" ON "event_service_providers"("id", "event_edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_service_providers_event_edition_id_provider_id_role_key" ON "event_service_providers"("event_edition_id", "provider_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "media_url_key" ON "media"("url");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "service_provider_media_type_idx" ON "service_provider_media"("type");

-- CreateIndex
CREATE INDEX "service_provider_media_provider_id_sort_order_idx" ON "service_provider_media"("provider_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_media_provider_id_media_id_key" ON "service_provider_media"("provider_id", "media_id");

-- CreateIndex
CREATE INDEX "event_series_media_type_idx" ON "event_series_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "event_series_media_event_series_id_media_id_key" ON "event_series_media"("event_series_id", "media_id");

-- CreateIndex
CREATE INDEX "event_edition_media_type_idx" ON "event_edition_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "event_edition_media_event_edition_id_media_id_key" ON "event_edition_media"("event_edition_id", "media_id");

-- CreateIndex
CREATE INDEX "athlete_media_type_idx" ON "athlete_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_media_athlete_id_media_id_key" ON "athlete_media"("athlete_id", "media_id");

-- CreateIndex
CREATE INDEX "organizer_media_type_idx" ON "organizer_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_media_organizer_id_media_id_key" ON "organizer_media"("organizer_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_category_idx" ON "tags"("category");

-- CreateIndex
CREATE INDEX "event_series_tags_tag_id_idx" ON "event_series_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_series_tags_event_series_id_tag_id_key" ON "event_series_tags"("event_series_id", "tag_id");

-- CreateIndex
CREATE INDEX "service_provider_tags_tag_id_idx" ON "service_provider_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_tags_provider_id_tag_id_key" ON "service_provider_tags"("provider_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "favorites_entity_type_entity_id_idx" ON "favorites"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_entity_type_entity_id_key" ON "favorites"("user_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "seo_meta_entity_type_entity_id_idx" ON "seo_meta"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series_organizers" ADD CONSTRAINT "event_series_organizers_event_series_id_fkey" FOREIGN KEY ("event_series_id") REFERENCES "event_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series_organizers" ADD CONSTRAINT "event_series_organizers_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_editions" ADD CONSTRAINT "event_editions_event_series_id_fkey" FOREIGN KEY ("event_series_id") REFERENCES "event_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_editions" ADD CONSTRAINT "event_editions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_edition_organizers" ADD CONSTRAINT "event_edition_organizers_event_edition_id_fkey" FOREIGN KEY ("event_edition_id") REFERENCES "event_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_edition_organizers" ADD CONSTRAINT "event_edition_organizers_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_event_edition_id_fkey" FOREIGN KEY ("event_edition_id") REFERENCES "event_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_event_edition_id_fkey" FOREIGN KEY ("event_edition_id") REFERENCES "event_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_event_service_provider_id_event_edition_id_fkey" FOREIGN KEY ("event_service_provider_id", "event_edition_id") REFERENCES "event_service_providers"("id", "event_edition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_to_types" ADD CONSTRAINT "service_provider_to_types_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_to_types" ADD CONSTRAINT "service_provider_to_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "service_provider_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_disciplines" ADD CONSTRAINT "service_provider_disciplines_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_disciplines" ADD CONSTRAINT "service_provider_disciplines_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_service_providers" ADD CONSTRAINT "event_service_providers_event_edition_id_fkey" FOREIGN KEY ("event_edition_id") REFERENCES "event_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_service_providers" ADD CONSTRAINT "event_service_providers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_media" ADD CONSTRAINT "service_provider_media_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_media" ADD CONSTRAINT "service_provider_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series_media" ADD CONSTRAINT "event_series_media_event_series_id_fkey" FOREIGN KEY ("event_series_id") REFERENCES "event_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series_media" ADD CONSTRAINT "event_series_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_edition_media" ADD CONSTRAINT "event_edition_media_event_edition_id_fkey" FOREIGN KEY ("event_edition_id") REFERENCES "event_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_edition_media" ADD CONSTRAINT "event_edition_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_media" ADD CONSTRAINT "athlete_media_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_media" ADD CONSTRAINT "athlete_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_media" ADD CONSTRAINT "organizer_media_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_media" ADD CONSTRAINT "organizer_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series_tags" ADD CONSTRAINT "event_series_tags_event_series_id_fkey" FOREIGN KEY ("event_series_id") REFERENCES "event_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series_tags" ADD CONSTRAINT "event_series_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_tags" ADD CONSTRAINT "service_provider_tags_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_tags" ADD CONSTRAINT "service_provider_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ===== Companion constraints (schema_v2_2_constraints.sql) =====
-- Sports events platform v2.2: PostgreSQL constraints not expressible in Prisma schema.
-- REVIEW ONLY. Integrate into a NEW LOCAL Prisma initial migration AFTER table creation.
-- Never run directly against the existing Supabase database.
-- Keep this file in version control and test repeated `migrate deploy` on a clean database.

-- Prevent two PRIMARY assignments in the same series template or edition.
-- Exactly one PRIMARY in a nonempty organizer set is an application transaction rule.
-- When replacing a PRIMARY, demote/remove the current PRIMARY first, then promote
-- the new PRIMARY in the SAME transaction (these indexes are not deferrable).
CREATE UNIQUE INDEX event_series_organizers_one_primary
  ON event_series_organizers (event_series_id)
  WHERE role = 'PRIMARY';

CREATE UNIQUE INDEX event_edition_organizers_one_primary
  ON event_edition_organizers (event_edition_id)
  WHERE role = 'PRIMARY';

-- EventEdition: date-only events, unknown/TBA dates, and optional local times.
-- ends_on is inclusive. When ends_on is absent, the effective end date is starts_on.
-- A start/end time without a known edition starts_on is not meaningful.
-- Overnight events must specify an ends_on later than starts_on.
ALTER TABLE event_editions
  ADD CONSTRAINT event_editions_date_order
    CHECK (ends_on IS NULL OR (starts_on IS NOT NULL AND ends_on >= starts_on)),
  ADD CONSTRAINT event_editions_start_time_format
    CHECK (start_time IS NULL OR (starts_on IS NOT NULL
      AND start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')),
  ADD CONSTRAINT event_editions_end_time_format
    CHECK (end_time IS NULL OR (starts_on IS NOT NULL
      AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')),
  ADD CONSTRAINT event_editions_same_day_time_order
    CHECK (start_time IS NULL OR end_time IS NULL
      OR (ends_on IS NOT NULL AND ends_on > starts_on)
      OR end_time >= start_time),
  ADD CONSTRAINT event_editions_registration_date_order
    CHECK (registration_open_at IS NULL OR registration_close_at IS NULL
      OR registration_close_at >= registration_open_at);

-- Competition: dates/times override the edition where supplied.
-- Effective start date = starts_on ?? edition.starts_on.
-- Effective end date   = ends_on ?? effective start date (multi-day competitions
-- must set ends_on explicitly). Times require a resolvable effective date.
-- Effective location   = competitions.location_id ?? event_editions.location_id.
-- The cross-table checks (effective date exists, dates within edition window,
-- effective end >= effective start, same-day time order on effective dates) CANNOT
-- be expressed here and MUST run in the shared server-side validation, in the
-- same transaction that creates/updates the competition.
ALTER TABLE competitions
  ADD CONSTRAINT competitions_date_order
    CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on),
  ADD CONSTRAINT competitions_start_time_format
    CHECK (start_time IS NULL OR start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT competitions_end_time_format
    CHECK (end_time IS NULL OR end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT competitions_explicit_same_day_time_order
    CHECK (start_time IS NULL OR end_time IS NULL
      OR starts_on IS NULL OR (ends_on IS NOT NULL AND ends_on > starts_on)
      OR end_time >= start_time);
