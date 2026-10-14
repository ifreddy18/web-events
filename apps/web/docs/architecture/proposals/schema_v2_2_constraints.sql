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
