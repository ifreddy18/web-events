# Schema v2.1 Validation Report

**Verdict: REQUIRES CHANGES.** The structure is sound. There is one confirmed decision/schema mismatch, and `prisma validate` has not been run.

**Audited files**
- `apps/web/docs/architecture/proposals/schema_v2_1.prisma` (referred to as `P`)
- `apps/web/docs/architecture/proposals/schema_v2_1_decisions.md`
- `apps/web/docs/architecture/proposals/schema_v2_1_constraints.sql`
- Compared against `apps/web/prisma/schema.prisma` (referred to as `C`)

**Path note:** the proposal files are in `apps/web/docs/architecture/proposals/`, not the repo root.

**Scope:** read-only analysis. No files were modified, no dependencies installed, no migrations or seeds run, and no database connection made. This report covers new or unresolved issues only and does not repeat `schema-v2-audit.md`.

---

## 1. Prisma validation: not run

`apps/web/node_modules` does not exist, and there is no global `prisma` or `pnpm`. Installing was prohibited, so `prisma validate` could not be run. This is the same blocker the earlier audit hit.

Checked by hand, with nothing found that should fail validation:
- Every relation has its opposite side.
- The relation names `EditionLocation` and `CompetitionLocation` match on both sides (P:187–188, 261, 313).
- The composite FK target `@@unique([id, eventEditionId])` exists (P:486).
- The optional relation `EventResource.eventServiceProvider` (P:343) mixes an optional and a required scalar. Prisma allows that, and `onDelete: Restrict` is valid for it.
- Every `@@map`, `@map` and `@db.*` use is well formed.

**Still unverified:** the composite FK where `eventEditionId` also backs the `eventEdition` relation (P:340, 342–343). Run `prisma validate` in the development environment.

---

## 2. Confirmed errors

### E1. Decision 9 is wrong, and the schema breaks the seed data
**Severity:** HIGH (verified)

- Decision 9 says the media `type` stays a `String` "as in v1" (`schema_v2_1_decisions.md`, item 9).
- `ServiceProviderMedia.type` is currently `MediaUsageType @default(GALLERY)` (C:1598). The init migration confirms it (`init/migration.sql:269`).
- P:517 turns it into `String`, and P drops the `MediaUsageType` enum entirely.
- Three data files import that enum, so seeds fail to compile and run:
  - `prisma/data/media/event-series-media.data.ts:1,11,31,39`
  - `prisma/data/media/service-provider-media.data.ts`
  - `prisma/data/media/event-edition-media.data.ts`
- The decisions file's impact table omits these files.
- **Fix:** keep `MediaUsageType` for `ServiceProviderMedia` (and the other junctions), or rewrite the data files and correct decision 9.

### SQL consistency check: no errors
The SQL file and the Prisma schema are consistent:
- Table and column names match the `@@map`/`@map` values.
- The partial indexes on `role = 'PRIMARY'` are valid PostgreSQL.
- The comma-chained `ALTER TABLE ... ADD CONSTRAINT` statements are valid.
- The `HH:mm` regex on a `VarChar(5)` column and the lexicographic time comparison both work.

---

## 3. Remaining issues (new, not in the earlier audit)

| # | Severity | Issue |
|---|---|---|
| 1 | MEDIUM | **Competition times need their own date.** The SQL requires `starts_on` whenever `start_time` is set (`schema_v2_1_constraints.sql:28–29`, `37–38`). A single-day event whose competitions only have a start time must duplicate the date onto every competition. Alternatively, define a fallback to the edition date, or relax the check. The decisions file does not say which. |
| 2 | MEDIUM | **PRIMARY organizer swap.** The partial unique index cannot be deferred (`schema_v2_1_constraints.sql:8–14`). Changing the PRIMARY organizer must demote the old row before promoting the new one inside one transaction, or it hits a unique violation. |
| 3 | MEDIUM | **Soft deletes leave dangling references.** `Organizer` (P:172) is soft-deleted (`delete-organizer.ts`), but the assignment tables have no `deletedAt`. Edition and series organizer reads must filter `organizer.deletedAt: null`. The same applies to a soft-deleted `EventServiceProvider` that still has `EventResource` rows pointing at it (P:343). `Restrict` only guards hard deletes. |
| 4 | MEDIUM | **Composite FK write limitation.** `eventEditionId` is shared by two relations (P:342–343), so Prisma nested `connect` cannot set both. Writes must use the unchecked scalar-ID form. The default `onUpdate` is Cascade. |
| 5 | MEDIUM | **No stable Athlete key.** `fullName` is no longer unique (P:360). Decision 8 says to seed by "stable IDs or an external key", but the model has no slug or `externalId`. `athletes.seed.ts:15,31` upserts by `fullName` and will break. |
| 6 | LOW | **Constraints with no check.** There is no CHECK on `registration_close_at >= registration_open_at` (P:252–253). `year` can disagree with `starts_on` (P:240, 246). Competition dates are not bounded by the edition range, which cannot be a CHECK, so it needs application validation. |
| 7 | LOW | **Duplicate sources for registration and results URLs.** Both `EventEdition.registrationUrl`/`resultsUrl` (P:255–256) and `EventResource` types `REGISTRATION`/`RESULTS` (P:46–47) exist. `Competition.registrationUrl` (P:307) is a third place. |
| 8 | LOW | **Redundant indexes.** `@@index([slug])` duplicates `@unique` on Sport, Discipline, ServiceProviderType, ServiceProvider and Tag (P:135, 154, 413, 439, 616). Several `@@index([parentId])` entries duplicate the prefix of a unique on the junction tables (e.g. P:545, 563, 581, 599). `Result @@index([competitionId])` (P:396) is also redundant. |
| 9 | LOW | **Athlete.birthDate is a timestamp.** It lacks `@db.Date` (P:363), which contradicts the date-only convention of decision 3. |
| 10 | LOW | **Unused enum.** `Status` (P:19) is not referenced by any model. |
| 11 | LOW (unverified) | **Migration drift.** It is unclear whether `prisma migrate dev` flags the manual partial indexes as drift. CHECK constraints are ignored by Prisma. Test this when generating the initial migration. |

**Resolved from the earlier audit:** the distance and elevation columns are gone, and `Competition.metadata` is the single source, which matches the seed's `distanceKm`.

---

## 4. Compatibility with existing CRUDs and seeds

Items the decisions file's impact table omits:

- **`orderBy: { startsAt }`** in `src/features/competitions/queries/get-event-edition-options.ts:9` and `src/features/event-editions/queries/get-event-editions.ts:26` breaks. `startsOn` is nullable, so use `{ sort: 'desc', nulls: 'last' }`, because Postgres puts NULLs first on DESC.
- **Event edition code:**
  - `event-edition.schema.ts`, `create-event-edition.ts`, `update-event-edition.ts`, `event-edition-form.tsx`, `constants/event-edition-status.ts` and `status-badge.tsx` use `startsAt` and `DRAFT`/`PUBLISHED`.
  - The seed `event-editions.seed.ts:54,67` also writes `startsAt`.
- **EventSeries code:** `event-series.schema.ts`, `create-event-series.ts` and `update-event-series.ts` use `organizerId`. The seed `event-series.seed.ts` and `event-series-form.tsx` do too.
- **Resources and providers:**
  - `event-resources.seed.ts:52,71` upserts by `slug` and writes `serviceProviderId`. It needs `eventEditionId_url` and `eventServiceProviderId`.
  - `event-service-providers.seed.ts:50–55` uses `eventEditionId_providerId_role`, which still exists. It needs the new `accreditation`.
- **Competition and Organizer CRUD:**
  - `competitions.seed.ts` upserts on `eventEditionId_slug`, which still exists.
  - The Organizer code does not touch the relations that changed.

---

## 5. Recommended corrections

1. Decide the `MediaUsageType` question, then fix P:517 or the three data files and decision 9 (E1).
2. Run `prisma format` and `prisma validate` locally, then generate the initial migration. Check drift behavior for the partial indexes (issue 11).
3. Resolve the competition time/date rule (issue 1) and add an `Athlete` stable key such as `slug @unique` (issue 5).
4. Optionally add the registration-order CHECK (issue 6). Document the PRIMARY swap order (issue 2) and the soft-delete read filters (issue 3).
5. Add the missing items to the decisions impact table: the `startsAt` orderBy queries, the media seed data, and the seed upsert keys (section 4).

---

## 6. Final verdict

**REQUIRES CHANGES.** The structure is sound, but E1 is a confirmed mismatch between decision 9 and the schema that breaks the media seed data, and formal `prisma validate` has not been run.
