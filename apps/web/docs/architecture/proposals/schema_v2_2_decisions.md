# Sports events platform — Schema v2.2 decisions and implementation notes

**Status:** Proposed, not applied or formally validated by the Prisma CLI. Based on the v2.1 schema, the v2 and v2.1 Claude audits, and the product decisions agreed in conversation. **Target:** Prisma 6 + PostgreSQL; local PostgreSQL for development. Keep Supabase untouched.

## Accepted design decisions

1. **Event identity and recurrence.** `EventSeries -> EventEdition -> Competition` remains. A series may have multiple editions within one year: no unique constraint on `(eventSeriesId, year)`. `EventEdition.label` provides optional differentiators (e.g., "Primavera", "II"); `slug` remains globally unique. The admin must derive a collision-safe slug and handle `P2002`, without assuming `{series}-{year}` is unique.
2. **Organizer assignments.** `EventSeriesOrganizer` is a template only. When creating an edition, copy the template organizers to `EventEditionOrganizer`; from that point, the edition's own assignments are the **sole source of truth** for edition-level search and display. Do not merge or inherit organizer assignments at read time. Enforce **at most one PRIMARY** in SQL (partial unique indexes) and **one PRIMARY when nonempty** in application transactions. To replace a PRIMARY, demote the old assignment before promoting the new one inside a transaction.
3. **Canonical dates and times.** `EventEdition.startsOn` / `endsOn` are calendar `DATE`s, possibly NULL (TBA). `startTime` / `endTime` are optional validated local `HH:mm`; `timeZone` is an IANA time-zone identifier. Do not store redundant `startsAt` timestamps for these facts. On an edition, when `endsOn` is NULL the effective end date is `startsOn`. Midnight is not a stand-in for unknown times. An event spanning midnight must set `endsOn` explicitly.
4. **Competition date and location inheritance.** `Competition.startsOn`, `endsOn`, `startTime`, and `endTime` are optional overrides.
   - Effective start date: `competition.startsOn ?? edition.startsOn`.
   - Effective end date: `competition.endsOn ?? effectiveStartDate`. A competition spanning multiple days **must** define `endsOn` explicitly; it never implicitly spans the whole edition.
   - Effective location: `competition.locationId ?? edition.locationId`. Discovery by venue or city must search both edition and competition locations.
   - A `startTime` or `endTime` requires a resolvable effective date (own or inherited).
   - **Shared server-side validation** (one function used by create/update, display and queries; a single-table SQL CHECK cannot validate dates in another table):
     - Competition dates must respect known edition boundaries.
     - Effective end date cannot precede effective start date.
     - Same-day end time cannot precede start time (checked on effective dates).
     - Competition times require a resolvable effective date.
     - Date inheritance must be covered by automated tests, including competitions outside the edition window, inherited dates with inverted times, and `endsOn` without `startsOn`.
   - Display dates as local calendar dates without `.toISOString()` UTC shifts.
5. **Publication vs. lifecycle.** Keep separate `publicationStatus` (`DRAFT/PUBLISHED`), `EventEdition.status` (`SCHEDULED/POSTPONED/COMPLETED/CANCELLED`) and `registrationStatus`. Published TBA events are allowed. `registrationOpenAt` and `registrationCloseAt` represent instants; their ordering is checked by SQL, even when one or both are NULL.
6. **Discipline-specific metadata.** `Competition.metadata` (JSONB) holds distance, elevation, swim/bike/run legs, OCR obstacles, HYROX/CrossFit formats, etc.; **no duplicate metric columns**. Validate with Zod per discipline. Common fields (foreign keys, names, dates, statuses, location) remain relational. Introduce JSON expression indexes only for real filters needed by users.
7. **Photographers and gallery links.** `ServiceProvider` owns the persistent profile. `EventServiceProvider` represents an edition appearance, with independent `role` and `accreditation`. `EventResource` owns external links; optionally points to the edition appearance. Unknown authors are allowed. Multiple links per appearance are allowed. The same URL may be reused by different editions, but `@@unique([eventEditionId, url])` rejects duplicate URLs within the same edition. For soft-deleted duplicates, restore the existing resource rather than insert a new one. The composite FK enforces that the resource and appearance belong to the same edition; **verify it with `prisma validate` and an actual database write before adoption**.
8. **Canonical external URLs.** `EventEdition.registrationUrl` / `resultsUrl` are the edition's main links. `Competition.registrationUrl` overrides registration for that competition only. `EventResource` entries of type `REGISTRATION` / `RESULTS` represent **additional** resources; do not copy the main URLs into them without an explicit reason. This avoids multiple conflicting sources of truth.
9. **Athlete identity and results.** Names are not unique; no unique slug derived from names. `Athlete.birthDate` is a `DATE` rather than a timestamp; treat birth dates as private unless explicitly needed. For fixture seeds, use fixed UUIDs or a deterministic ID mapping; never `upsert` by name. Deduplication of real imported athletes needs a source-specific identity strategy later. `Result` maintains future results support.
10. **Preserve existing media types.** Restore the original `MediaUsageType` enum with its 10 existing values; `ServiceProviderMedia.type` uses it with `@default(GALLERY)`. `EventSeriesMedia`, `EventEditionMedia`, `AthleteMedia` and `OrganizerMedia` continue to use `String @default("gallery")`, just as in v1. This fixes the seed import regression from v2.1 without introducing an unrelated migration.
11. **Soft deletes.** Unique slugs and assignment keys remain reserved when soft-deleted; restore rather than insert duplicates. Query code must filter nested `deletedAt: null` on organizers, provider appearances and linked entities, because `onDelete` rules apply to hard deletes only. Server Actions must handle restore vs. create clearly.
12. **Indexes.** Remove clearly redundant indexes such as `@@index([slug])` when `slug` already has `@unique`, and foreign-key-prefix indexes already covered by a composite unique. Keep necessary indexes for organizer/provider reverse lookups, date and status filtering, location, and results.
13. **Deferred features.** Retain `User`, `Favorite`, `SeoMeta`, `Media`, `Athlete` and `Result` for future functionality without implementing public registration, photo hosting or ranking features now. Remove only unused `Status` enum. No additional domain tables solely for theoretical event types.

## PostgreSQL-only constraints

`schema_v2_2_constraints.sql` is part of the **proposed** first migration and cannot be expressed completely in Prisma 6 syntax. It includes:

- Partial unique indexes allowing at most one `PRIMARY` organizer per series template and edition.
- Checks for ordered edition date ranges, valid local `HH:mm` strings, and same-day time ordering.
- Check that edition registration close is not earlier than registration open.
- Competition date/time checks that do not prohibit valid inheritance of the edition's date.

The **existence** of a primary organizer and competition/edition cross-table date consistency are service-level transactional validations, not established by these SQL constraints. The operator must ensure that manual SQL constraints are included in the migration history used for clean local DB creation; this companion file alone has no effect.

## Compatibility changes required outside the Prisma schema

| Area | Required adaptation |
|---|---|
| Organizer and Location admin | No substantial field-level change expected; verify filters on soft-deleted linked records. |
| EventSeries admin | Replace `organizerId` with a multi-organizer editor, designate one PRIMARY, and persist template assignments transactionally. |
| EventEdition admin | Replace `startsAt` / `endsAt` with `startsOn` / `endsOn` and local times; split publication/lifecycle/registration statuses; create independent organizer assignments; add optional `label` and collision-safe slugs; update list sorting using `startsOn` with explicit NULL ordering. |
| Competition admin | Use optional competition-local dates and times with edition fallback, retain metadata Zod types and allow sport-specific values only there. |
| Resources / providers seeds | Change gallery attribution to `eventServiceProviderId`; use `(eventEditionId, url)` as the upsert identity, drop resource slug; seed provider accreditation separately from role. |
| EventSeries / EventEdition seeds | Insert organizer assignments; populate local date/time and new enums. |
| Athlete seeds | Fixed UUIDs or deterministic source IDs; drop full-name upsert. |
| Media seeds | Keep the existing `MediaUsageType` import and enum-valued `ServiceProviderMedia.type`. The other media relationships keep String `type`. |
| Server-side read filters | Apply `deletedAt: null` throughout nested relation queries; use explicit `nulls: 'last'` where needed. |
| Source documentation | Update metadata TypeScript/Zod definitions to match `Competition.metadata`; never add duplicate metric columns. |

## Clean implementation sequence (non-destructive to Supabase)

1. **Do not replace `apps/web/prisma/schema.prisma` yet.** Keep v2.2 files in `apps/web/docs/architecture/proposals/` for review.
2. In the actual project environment, install existing dependencies via the lockfile, run `prisma format` on a **working copy** and `prisma validate` against that copy. Fix errors, notably the shared-scalar composite FK.
3. Configure a fresh **local PostgreSQL** instance and verify its `DATABASE_URL` does not point to Supabase.
4. Archive old migrations safely in Git or a clearly labeled archive directory; generate one new **initial migration** against the empty local DB, integrating the companion SQL constraints into migration SQL. Test application and regeneration.
5. Adapt existing seeds and the five CRUD modules. Run `prisma generate`, TypeScript build/lint, seed twice, and tests covering recurrence, organizers, dates, galleries and soft-delete/restore.
6. Before any future public deployment, add server-side authorization to all administrative mutations. No Supabase changes are required during this work.

## Acceptance checks

- [x] `prisma validate` passes using installed Prisma 6 (6.19.3).
- [x] The generated DDL and companion SQL run cleanly on a fresh local PostgreSQL database (17.11). Still pending: the same through a real Prisma initial migration.
- [ ] Fresh seeds run twice without duplicates or broken references, including MediaUsageType usage and seeded athletes.
- [ ] Admin creates 2 editions of 1 series in the same year without slug collisions.
- [ ] An edition has multiple organizers, only one PRIMARY; changing PRIMARY within a transaction succeeds.
- [ ] A multi-day event and a competition with inherited edition date produce correct calendar dates.
- [ ] A photographer is OFFICIAL in one edition and INDEPENDENT in another; links appear from both directions.
- [ ] Duplicate resource URL is rejected inside one edition but accepted across editions.
- [ ] A resource attributed to a provider appearance from another edition is rejected by FK.
- [ ] Dates and HH:mm values are serialized/displayed correctly without UTC shifts.
- [ ] All five admin CRUDs work against the clean local DB.

**Validation status** (see `../audits/schema-v2.2-audit.md`):

- Prisma 6.19.3 validation: **PASSED**.
- PostgreSQL 17.11 DDL execution: **PASSED**.
- Companion SQL constraints: **PASSED**.
- 25 database behavioral tests: **PASSED**.
- Remaining application-level validation: **PENDING** (Prisma Client nested writes with the shared-scalar composite FK, migration workflow with the companion SQL, date serialization, Zod metadata validation, and the shared effective-date validator).
