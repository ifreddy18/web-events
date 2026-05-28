-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EventSeriesStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventEditionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('FINISHED', 'DNF', 'DNS', 'DQ');

-- CreateEnum
CREATE TYPE "ServiceProviderRole" AS ENUM ('OFFICIAL_PHOTOGRAPHER', 'UNOFFICIAL_PHOTOGRAPHER', 'RECOVERY_PARTNER', 'MEDICAL_SUPPORT', 'COACH_GUEST');

-- CreateEnum
CREATE TYPE "MediaUsageType" AS ENUM ('PROFILE', 'COVER', 'GALLERY', 'BANNER', 'POSTER', 'LOGO', 'ROUTE_MAP', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "FavoriteEntityType" AS ENUM ('EVENT_SERIES', 'ATHLETE', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

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
    "organizer_id" UUID NOT NULL,
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
CREATE TABLE "event_editions" (
    "id" UUID NOT NULL,
    "event_series_id" UUID NOT NULL,
    "location_id" UUID,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "registration_open_at" TIMESTAMP(3),
    "registration_close_at" TIMESTAMP(3),
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "registration_url" TEXT,
    "results_url" TEXT,
    "status" "EventEditionStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "event_edition_id" UUID NOT NULL,
    "discipline_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT,
    "country_code" TEXT,
    "birth_date" TIMESTAMP(3),
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
    "type_id" UUID NOT NULL,
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
    "description" TEXT,
    "external_url" TEXT,
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
CREATE INDEX "sports_slug_idx" ON "sports"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "disciplines_slug_key" ON "disciplines"("slug");

-- CreateIndex
CREATE INDEX "disciplines_sport_id_idx" ON "disciplines"("sport_id");

-- CreateIndex
CREATE INDEX "disciplines_slug_idx" ON "disciplines"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizers_slug_key" ON "organizers"("slug");

-- CreateIndex
CREATE INDEX "organizers_slug_idx" ON "organizers"("slug");

-- CreateIndex
CREATE INDEX "locations_country_idx" ON "locations"("country");

-- CreateIndex
CREATE INDEX "locations_state_idx" ON "locations"("state");

-- CreateIndex
CREATE INDEX "locations_city_idx" ON "locations"("city");

-- CreateIndex
CREATE UNIQUE INDEX "event_series_slug_key" ON "event_series"("slug");

-- CreateIndex
CREATE INDEX "event_series_organizer_id_idx" ON "event_series"("organizer_id");

-- CreateIndex
CREATE INDEX "event_series_discipline_id_idx" ON "event_series"("discipline_id");

-- CreateIndex
CREATE INDEX "event_series_slug_idx" ON "event_series"("slug");

-- CreateIndex
CREATE INDEX "event_series_status_idx" ON "event_series"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_editions_slug_key" ON "event_editions"("slug");

-- CreateIndex
CREATE INDEX "event_editions_event_series_id_starts_at_idx" ON "event_editions"("event_series_id", "starts_at");

-- CreateIndex
CREATE INDEX "event_editions_event_series_id_idx" ON "event_editions"("event_series_id");

-- CreateIndex
CREATE INDEX "event_editions_location_id_idx" ON "event_editions"("location_id");

-- CreateIndex
CREATE INDEX "event_editions_status_idx" ON "event_editions"("status");

-- CreateIndex
CREATE INDEX "event_editions_starts_at_idx" ON "event_editions"("starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_editions_event_series_id_year_key" ON "event_editions"("event_series_id", "year");

-- CreateIndex
CREATE INDEX "competitions_event_edition_id_idx" ON "competitions"("event_edition_id");

-- CreateIndex
CREATE INDEX "competitions_discipline_id_idx" ON "competitions"("discipline_id");

-- CreateIndex
CREATE INDEX "competitions_status_idx" ON "competitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_event_edition_id_slug_key" ON "competitions"("event_edition_id", "slug");

-- CreateIndex
CREATE INDEX "athletes_full_name_idx" ON "athletes"("full_name");

-- CreateIndex
CREATE INDEX "athletes_country_code_idx" ON "athletes"("country_code");

-- CreateIndex
CREATE INDEX "results_competition_id_idx" ON "results"("competition_id");

-- CreateIndex
CREATE INDEX "results_athlete_id_idx" ON "results"("athlete_id");

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
CREATE INDEX "service_provider_types_slug_idx" ON "service_provider_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_slug_key" ON "service_providers"("slug");

-- CreateIndex
CREATE INDEX "service_providers_type_id_city_idx" ON "service_providers"("type_id", "city");

-- CreateIndex
CREATE INDEX "service_providers_type_id_idx" ON "service_providers"("type_id");

-- CreateIndex
CREATE INDEX "service_providers_slug_idx" ON "service_providers"("slug");

-- CreateIndex
CREATE INDEX "service_providers_country_code_idx" ON "service_providers"("country_code");

-- CreateIndex
CREATE INDEX "service_providers_city_idx" ON "service_providers"("city");

-- CreateIndex
CREATE INDEX "service_provider_disciplines_provider_id_idx" ON "service_provider_disciplines"("provider_id");

-- CreateIndex
CREATE INDEX "service_provider_disciplines_discipline_id_idx" ON "service_provider_disciplines"("discipline_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_disciplines_provider_id_discipline_id_key" ON "service_provider_disciplines"("provider_id", "discipline_id");

-- CreateIndex
CREATE INDEX "event_service_providers_event_edition_id_idx" ON "event_service_providers"("event_edition_id");

-- CreateIndex
CREATE INDEX "event_service_providers_provider_id_idx" ON "event_service_providers"("provider_id");

-- CreateIndex
CREATE INDEX "event_service_providers_role_idx" ON "event_service_providers"("role");

-- CreateIndex
CREATE UNIQUE INDEX "event_service_providers_event_edition_id_provider_id_role_key" ON "event_service_providers"("event_edition_id", "provider_id", "role");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "service_provider_media_provider_id_idx" ON "service_provider_media"("provider_id");

-- CreateIndex
CREATE INDEX "service_provider_media_type_idx" ON "service_provider_media"("type");

-- CreateIndex
CREATE INDEX "service_provider_media_provider_id_sort_order_idx" ON "service_provider_media"("provider_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_media_provider_id_media_id_key" ON "service_provider_media"("provider_id", "media_id");

-- CreateIndex
CREATE INDEX "event_series_media_event_series_id_idx" ON "event_series_media"("event_series_id");

-- CreateIndex
CREATE INDEX "event_series_media_type_idx" ON "event_series_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "event_series_media_event_series_id_media_id_key" ON "event_series_media"("event_series_id", "media_id");

-- CreateIndex
CREATE INDEX "event_edition_media_event_edition_id_idx" ON "event_edition_media"("event_edition_id");

-- CreateIndex
CREATE INDEX "event_edition_media_type_idx" ON "event_edition_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "event_edition_media_event_edition_id_media_id_key" ON "event_edition_media"("event_edition_id", "media_id");

-- CreateIndex
CREATE INDEX "athlete_media_athlete_id_idx" ON "athlete_media"("athlete_id");

-- CreateIndex
CREATE INDEX "athlete_media_type_idx" ON "athlete_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_media_athlete_id_media_id_key" ON "athlete_media"("athlete_id", "media_id");

-- CreateIndex
CREATE INDEX "organizer_media_organizer_id_idx" ON "organizer_media"("organizer_id");

-- CreateIndex
CREATE INDEX "organizer_media_type_idx" ON "organizer_media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_media_organizer_id_media_id_key" ON "organizer_media"("organizer_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "tags"("slug");

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
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

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
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_editions" ADD CONSTRAINT "event_editions_event_series_id_fkey" FOREIGN KEY ("event_series_id") REFERENCES "event_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_editions" ADD CONSTRAINT "event_editions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_event_edition_id_fkey" FOREIGN KEY ("event_edition_id") REFERENCES "event_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "service_provider_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
