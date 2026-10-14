# Schema v2 Audit Report

Read-only audit. No files were modified and nothing was installed or executed.

**Audited files**

- Current schema: `apps/web/prisma/schema.prisma`
- Proposed schema: `docs/architecture/proposals/schema_v2.prisma`
- Design decisions: `docs/architecture/proposals/schema_v2_review.md`

**Path note:** the proposal files are in `docs/architecture/proposals/` at the repo root, not under `apps/web/docs/…` as the task stated.

---

## 1. Executive Summary

Schema v2 is conceptually sound. It supports the stated business scenarios, and the data model is close to right. Its main weaknesses are:

- **Migration hazards.** Several changes are destructive or fail on existing data.
- **Date model.** It stores the same fact twice and enforces nothing.
- **Organizer override rule.** It is a footgun and complicates queries.
- **Slug collisions.** The "multiple editions per year" feature will hit duplicate slugs in the admin form.

---

## 2. Prisma Validation Results

**`prisma validate` could not be run.** `apps/web/node_modules` does not exist, and there is no global `prisma` or `pnpm`. Installing or downloading was not allowed. This matches `schema_v2_review.md:55`.

The schema was checked by hand instead. This is not equivalent to the CLI.

- **Counts:** v2 has 30 models and 16 enums, as the review says. No missing opposite relations were found. The `EditionLocation` and `CompetitionLocation` relation names match on both sides.
- **Unique constraints:** `@@unique([id, eventEditionId])` on `EventServiceProvider` (line 1246) is present, as the composite relation needs.
- **Composite foreign key (unverified, MEDIUM):** `EventResource.eventServiceProvider` (line 745) uses `[eventServiceProviderId, eventEditionId]`, where `eventEditionId` is also used by the `eventEdition` relation.
  - It should be valid. The optional field makes the relation optional, `Restrict` is legal, and Postgres skips a `MATCH SIMPLE` foreign key when a column is NULL.
  - Nested `connect` writes touching both relations are the likely friction. This needs `prisma validate` and a test write.
- **Cosmetic (LOW):** the doc-comment blocks for `EventEdition` and `Competition` sit above `EventSeriesOrganizer` (557–575) and `EventEditionOrganizer` (644–660). Prisma attaches them to the wrong models. The formatting is also unaligned, so `prisma format` is needed.

---

## 3. Critical Architectural Issues

### C1. `EventEditionStatus` conversion is destructive

**Severity:** CRITICAL (verified)

- **Affected model:** `EventEdition.status`
- **Evidence:** v1 is `DRAFT/PUBLISHED/COMPLETED/CANCELLED` (`init/migration.sql:8`). v2 is `SCHEDULED/POSTPONED/COMPLETED/CANCELLED` plus a new `publicationStatus` (v2:123, 619–620).
- **Why it matters:** Prisma cannot map `DRAFT` or `PUBLISHED` to the new values. A generated migration fails or drops data.
  - Postgres cannot use a newly added enum value in the same transaction. The migration needs hand-written SQL: add columns, backfill, then recreate the enum.
  - The mapping is undefined for `COMPLETED` and `CANCELLED` rows. Which `publicationStatus` do they get? Seed data is all `PUBLISHED` (`event-editions.data.ts:23,50`).
- **Recommended correction:** define the mapping table, then write the SQL by hand.

### C2. Removing `EventSeries.organizerId` breaks the series module and the seed

**Severity:** CRITICAL for sequencing

- **Affected model:** `EventSeries`
- **Evidence:** `event-series.schema.ts:4`, `create-event-series.ts:19`, `update-event-series.ts:26`, `get-event-series.ts:10`, `get-event-series-by-id.ts:11`, `event-series-table.tsx:20,61`, `event-series-form.tsx:64–144`, `app/admin/event-series/[id]/edit/page.tsx:37`, `prisma/seeds/event-series.seed.ts:64,70`.
- **Recommended correction:** migrate in this order: create `EventSeriesOrganizer`, backfill `PRIMARY`, switch code and seed, then drop the column.

---

## 4. Data Integrity and Relationship Issues

### D1. Dual date model with no consistency rule

**Severity:** HIGH (verified)

- **Affected model:** `EventEdition`
- **Evidence:** `startsOn`/`endsOn` (Date) and `startsAt`/`endsAt` (timestamp) both exist, and all four are nullable (v2:606–609).
- **Why it matters:**
  - An edition can have no date at all and still be published.
  - Existing code sorts by `startsAt DESC` (`get-event-editions.ts:26`, `get-event-edition-options.ts:9`). Postgres puts NULLs first on DESC, so date-only editions float to the top.
  - `edit/page.tsx:47` calls `.startsAt.toISOString()`, which crashes on null.
  - The form uses `datetime-local` with `toISOString().slice(0,16)`, which shifts the time to UTC. Nothing uses `timeZone`.
- **Recommended correction:**
  - Make `startsOn` the canonical field for sorting and discovery, and treat `startsAt` as an optional time-of-day.
  - Add SQL CHECK constraints: `endsOn >= startsOn`, and published implies `startsOn` is not null.
  - Drop `timeZone` for the MVP, since it is a single-country project.

### D2. Duplicate slugs defeat "multiple editions per year"

**Severity:** HIGH (verified)

- **Affected model:** `EventEdition.slug`
- **Evidence:**
  - The edition slug is globally unique (v2:603).
  - The form auto-generates `"{series} {year}"` as the name (`event-edition-form.tsx:101–104`) and derives the slug from that name (`:107–108`).
  - `create-event-edition.ts` has no P2002 handling, unlike `create-event-series.ts`.
- **Why it matters:** a second edition in the same year gets an identical slug, and v2 offers nothing to tell the two editions apart.
- **Recommended correction:** add a P2002 catch plus a slug suffix or name hint in the form. A small optional `label` field (e.g. "Edición II") is justified, because it is the concrete business case.

### D3. Organizer override semantics

**Severity:** HIGH (architectural; PRIMARY enforcement is a verified gap)

- **Affected models:** `EventSeriesOrganizer`, `EventEditionOrganizer`
- **Evidence:** v2:6–7, v2:577, `schema_v2_review.md:41`.
- **Why it matters:**
  - Edition organizers replace the series organizers whenever any exist. Adding one co-organizer to an edition silently drops the series organizers.
  - "Events by organizer X" needs this query shape: `OR[edition.organizers.some(X), edition.organizers.none AND series.organizers.some(X)]`. That is hard to index.
  - PRIMARY uniqueness is app-level only. The assignment tables have no `deletedAt`, yet the header talks about "active PRIMARY" and "restore".
- **Recommended correction:**
  - Simpler alternative: make `EventEditionOrganizer` the single source of truth. Pre-fill it from the series or the previous edition when creating an edition. Series organizers become optional.
  - If the model is kept, add a partial unique index in the migration: `WHERE role='PRIMARY'`.

### D4. `EventResource` loses all duplicate protection

**Severity:** MEDIUM (verified)

- **Affected model:** `EventResource`
- **Evidence:** the global URL unique was dropped (v2:751), and nothing replaces it.
- **Why it matters:** the same URL can be added twice to the same edition. `slug @unique` on external links is also friction.
- **Recommended correction:** add `@@unique([eventEditionId, url])`. Use that rather than a key that includes the nullable provider column, because Postgres treats NULLs as distinct. Consider dropping the required `slug`.

### D5. Soft delete

**Severity:** MEDIUM (mostly pre-existing)

- **Evidence:** `delete-event-edition.ts`, `delete-event-series.ts`, `get-event-series.ts:10`.
- **Why it matters:**
  - Deletes are soft, but a parent's deletion does not cascade to its children.
  - Nested includes do not filter `deletedAt`. v2 adds more nested joins with the same gap.
  - Slugs and unique keys stay reserved by soft-deleted rows.
  - Gallery resources of a soft-deleted `EventServiceProvider` remain visible unless the app filters them.

### D6. `Athlete.fullName` unique removed

**Severity:** LOW for the product, HIGH for the seed

- **Why it matters:** there is no replacement key, so seeds cannot stay idempotent. See M4.

### D7. Referential actions

**Severity:** LOW

- v2 removes `Cascade` from `EventResource`→edition (v2:744). That is consistent with soft delete.
- All other relations use implicit `Restrict`. Optional relations use `SetNull`, which is fine given soft deletes.
- The polymorphic `Favorite` and `SeoMeta` models have no foreign keys (unchanged).

---

## 5. Compatibility with Existing CRUD Modules

| Module | Breaking item | Evidence |
|---|---|---|
| EventSeries | `organizerId` field, `organizer` relation, organizer picker | see C2 |
| EventEdition | Status enum and options (`DRAFT`/`PUBLISHED`) | `event-edition.schema.ts:26`, `event-edition-status.ts`, `event-edition-form.tsx:73`, `status-badge.tsx` |
| EventEdition | `startsAt` now nullable and required by the form | `event-edition.schema.ts:14`, `create-event-edition.ts:27`, `update-event-edition.ts:34`, `edit/page.tsx:47` |
| EventEdition | New fields have no UI or Zod coverage | `publicationStatus`, `registrationStatus`, `startsOn`/`endsOn` |
| Competition | No break. New fields (`participationType`, `distanceMeters`, …) are absent from `competition.schema.ts` and the form | — |
| Organizer, Location | No break. `eventSeries`/`eventEditions` relation names are not used in their code | — |

The Competition metadata types define `distanceKm` and `elevationGainMeters` in JSON (`competition-metadata.ts`), and the seed writes `distanceKm` (`competitions.data.ts:27,46`). v2 adds `distanceMeters` and `elevationGainMeters` as columns.

- That creates two sources of truth in different units (km versus m).
- It needs a backfill, and the metadata types should be trimmed.

---

## 6. Migration and Seed Risks

Five migrations exist. The unique-constraint migrations (`20260526…`, `20260527…`) show the project already hit "will fail if duplicates exist" warnings. Nothing conflicts structurally, because v2 is an unapplied diff.

| ID | Severity | Issue | Evidence and detail |
|---|---|---|---|
| M1 | HIGH (verified) | `event_resources` column renames cause data loss | The v1 table uses camelCase columns: `"eventEditionId"`, `"submittedByName"`, `"createdAt"` (`20260527023116/migration.sql`). v2 adds `@map` snake_case names (v2:737–749). Prisma generates drop and add, so the table loses its data. The foreign key and index names change as well. **Fix:** either remove the new `@map`s, or hand-write `RENAME COLUMN`. |
| M2 | HIGH (verified) | `ServiceProviderRole` conversion | Old values `OFFICIAL_PHOTOGRAPHER` and `UNOFFICIAL_PHOTOGRAPHER` are removed (used at `event-service-providers.data.ts:27,55`). Collapsing them into `PHOTOGRAPHER` breaks `@@unique([eventEditionId, providerId, role])` if one provider has both roles on one edition. **Fix:** backfill `accreditation` from the old role before the collapse. |
| M3 | HIGH (verified) | `externalUrl` removal | The column is dropped, but the seed and data set it (`event-service-providers.seed.ts` upsert, `event-service-providers.data.ts:30`). Those URLs must become `EventResource` rows first. Re-pointing `EventResource.serviceProviderId` to `eventServiceProviderId` is ambiguous when a provider has several roles on one edition. |
| M4 | HIGH | Seed breakage | `athletes.seed.ts:13–15` upserts by `fullName`, which loses its unique key, so the seed will not compile or run. `event-series.seed.ts:64,70` writes `organizerId`. `event-editions.seed.ts` writes the old status values. `event-resources.seed.ts` writes `serviceProviderId`. |
| M5 | MEDIUM | Media junction `type` String to enum | Prisma will typically emit drop and add column, losing data. The seed uses enum constants, so seeded data is probably fine. The change is unrelated to any stated requirement and the MVP hosts no media. **Fix:** defer it or put it in its own migration. |
| M6 | MEDIUM | Competition and organizer backfills | `distanceKm × 1000` into `distanceMeters`, and `organizerId` into `EventSeriesOrganizer` with `PRIMARY`. |

---

## 7. Business Scenario Coverage

| Scenario | Supported? | Note |
|---|---|---|
| Multiple editions per year | Schema yes, admin form no | See D2 |
| Multiple organizers and changes between editions | Yes | Override rule is awkward (D3) |
| Multi-day events | Yes | `startsOn`/`endsOn` |
| Different competition start times | Yes | `Competition.startsAt` |
| Competitive and recreational | Yes | `ParticipationType` |
| Postponed and cancelled | Yes | `POSTPONED` plus `rescheduledFromOn` (tracks a single prior date only, which is fine for the MVP) |
| Independent photographer, multiple events | Yes | `EventServiceProvider` with `INDEPENDENT` |
| Multiple galleries per photographer and event | Yes | `EventResource` to `EventServiceProvider` is 1:N |
| Gallery without photographer | Yes | Null link plus `submittedBy*` |
| Historical athlete results | Yes | `Result`→`Competition`; no stable athlete key |
| Search by organizer, city, location, discipline | Yes, with caveats | Organizer search needs override logic. Location search must check both the edition and `Competition.locationId`. City is free text, case-sensitive. |

---

## 8. Recommended Schema Changes

These are corrections only. No replacement schema is proposed.

| # | Severity | Recommendation |
|---|---|---|
| 1 | HIGH | Pick `startsOn`/`endsOn` as canonical and add CHECK constraints (D1). |
| 2 | HIGH | Resolve organizer modeling: either an edition-only source of truth, or keep both tables with a partial unique PRIMARY index (D3). |
| 3 | HIGH | Add a slug-collision strategy for same-year editions, and a P2002 handler (D2). |
| 4 | HIGH | Fix `EventResource` column mapping (M1), and write the status and role migrations by hand (C1, M2, M3). |
| 5 | MEDIUM | Add `@@unique([eventEditionId, url])` on `EventResource`, and reconsider the required slug (D4). |
| 6 | MEDIUM | Defer the media `type` enum change (M5). |
| 7 | MEDIUM | Choose one home for distance and elevation, either columns or metadata (§5). |
| 8 | LOW | Consider removing `Competition.locationId` and `registrationUrl` unless multi-city routes are real (architectural preference). Dropping `timeZone` is covered under D1. |
| 9 | LOW | Marketplace generics, the polymorphic `Favorite`/`SeoMeta`, and `Status` are unused by the MVP. Keep them, but do not build on them yet. |
| 10 | LOW | Run `prisma format` on v2. |

---

## 9. Final Verdict

**B. Adopt after specific corrections.** The structure is sound and needs no reconsideration. Before adoption:

1. Run the real `prisma validate` and `migrate diff` against a local database.
2. Fix D1–D3.
3. Plan the hand-written migration sequence (C1–C2, M1–M3, M6).
4. Update the CRUDs and seeds listed in §5 and M4.
