# Competitions

Admin CRUD for `Competition`: one race or category inside an `EventEdition` (e.g. "21K", "Recreational 5K").
Routes: `/admin/competitions`, `/new`, `/[id]/edit`, plus the Competitions section on the edition edit page.
Results and athletes are separate, later features.

## Responsibilities

- Create, edit, list (search, filters, pagination) and soft-delete competitions.
- Validate the schedule, references, slug and discipline metadata; map conflicts to `ActionResult` errors.
- Own `rules.ts` (shared with the EventEdition feature) and `metadata.ts` (also used by client form code).
- It does **not** create Editions, Disciplines or Locations, and does not touch Results.

## Two entry points, one implementation

- **Standalone admin** (`/admin/competitions`): cross-edition search and filters; the edition is chosen on create.
- **Edition screen** (`EditionCompetitions` on `/admin/event-editions/[id]/edit`): lists that edition's competitions
  (`listEditionCompetitions`) and creates/edits them in a dialog with the edition fixed; deleting stays on the page.
  This is the faster path when entering an event.
- Both render the same `CompetitionForm` and call the same `createCompetition` / `updateCompetition` /
  `deleteCompetition`. The embedded mode is just `onSaved` + `onCancel` props (no navigation). There is no second CRUD;
  do not add rules to the dialog. Form element ids are prefixed per instance because the form shares a page with the
  edition form.

## Relationships

- **EventEdition (parent).** Chosen on create, **fixed afterwards**. Reassigning would need locks on two editions, would
  re-scope the `(edition, slug)` uniqueness and would move any results between events; creating a new competition in the
  other edition is the supported path. `updateCompetition` ignores `eventEditionId`.
- **Discipline.** Required and independent of the series' discipline (a series may run a trail race next to a road race).
  Must be active and belong to an active sport. It can be changed after creation (see metadata below).
- **Location.** Optional override; empty means "same as the edition".
- **Result.** The only table that references a competition; active results block deletion.

## Dates and location inheritance

All rules live in `rules.ts` (`resolveEffectiveSchedule`, `validateCompetitionSchedule`); the action never re-implements them.

| Value | Effective value |
|---|---|
| start date | `competition.startsOn ?? edition.startsOn` |
| end date | `competition.endsOn ?? effective start date` (a multi-day competition must set `endsOn`) |
| location | `competition.locationId ?? edition.locationId` |
| times | the competition's own; **never inherited** |

The action validates after the edition is locked, against the edition read in the same transaction: end before start,
dates inside the edition window, same-day time order, and "an end date or a time needs an effective start date"
(an edition with dates still to be announced is fine for undated competitions). Dates are `YYYY-MM-DD` strings and times
`HH:mm` strings end to end; they are converted to DB `DATE` only with `localDateToDb`. Changing an *edition's* dates
re-validates its competitions (see `event-editions/actions.ts`), so the two features enforce the same rules.

## Metadata (sport-specific attributes)

Sport-specific attributes live only in `Competition.metadata` (JSONB); the Prisma model has no distance/elevation columns.
`metadata.ts` holds one **strict** Zod schema per discipline slug (today: `trail-running`).

- Submitted metadata is validated by the discipline's strict schema (unknown keys are rejected); the form never sends
  arbitrary JSON through. The shape check in `schemas.ts` only guarantees "an object".
- Every Trail Running detail is optional, including `distanceKm`: a race can be announced before its course is confirmed.
  No distance is ever defaulted or invented; when given it must be positive.
- A discipline without a schema accepts **empty** metadata only (`null`, omitted or `{}` are stored as SQL `NULL`).
- `resolveCompetitionMetadata` decides what is stored on create/update:
  - `metadata` omitted (`undefined`) → stored value untouched (what disciplines without a form send);
  - stored properties the schema does not manage (legacy or future keys) are **carried over**, never silently dropped;
  - changing the discipline while metadata is stored requires `discardStoredMetadata: true` (a checkbox in the form),
    because stored metadata belongs to one discipline.
- Trail Running form: `trail-running-metadata-fields.tsx` edits text; `trailRunningFormToMetadata` /
  `trailRunningMetadataToForm` convert it (decimal commas accepted, blanks omitted, comma-separated lists). The server
  validates the result; its errors come back as `metadata.<key>` field errors.

### Adding another discipline

1. Add a strict schema and register it by discipline slug in `metadataSchemas` (`metadata.ts`). Slugs come from the catalog seed.
2. Add form codec helpers next to the Trail Running ones and a fields component (copy `trail-running-metadata-fields.tsx`).
3. Render it in `competition-form.tsx` where `TRAIL_RUNNING` is used, and send its metadata in `onSubmit`.
4. Add cases to `tests/unit/competition-metadata.test.ts`. No migration is needed; the server already validates by slug.

There is deliberately no generic dynamic form engine: each discipline gets an explicit, readable form.

## Statuses and types

`participationType` (COMPETITIVE | RECREATIONAL) and `status` (ACTIVE | COMPLETED | CANCELLED) are the Prisma enums.
Recreational competitions need no results; nothing in this feature requires results for any type.

## Slugs

Unique per edition (`@@unique([eventEditionId, slug])`), so two editions can both have a `10k`. When empty the slug is
derived from the name; a collision is reported, never suffixed. Soft-deleted competitions keep their slug reserved
(the unique index includes them); the message says so. `P2002` (lost race) maps to the same `conflict`, `P2003` to
"selection no longer available".

## Transactions and locking

Every write is one transaction: lock, check, write last. Lock order, always:

1. edition row `FOR SHARE` (active only);
2. competition row `FOR UPDATE` (update and delete);
3. location row `FOR SHARE` (paired with `FOR UPDATE` in `deleteLocation`).

Why `FOR SHARE` on the edition: it conflicts with the `FOR UPDATE` that edition updates and deletes take, so an edition
cannot change its dates or be deleted between "read the edition window" and commit, while competitions of the same
edition still write in parallel. The edition's dates are read **after** the lock (READ COMMITTED gives the statement a fresh
snapshot), which is what makes a date change that committed while we waited visible. In the other direction,
`updateEventEdition` takes `FOR UPDATE` first and then reads the competitions, so it sees every competition committed
before it and waits for any in flight. The competition row lock makes the metadata read-merge-write atomic.
Deleting a competition takes only its own row, so it cannot take part in a lock cycle. **Code that adds Results must take
the competition row `FOR SHARE` and re-check `deletedAt`.** Disciplines are read without a lock because nothing deletes
them yet; add a `FOR SHARE` here if a discipline delete is ever built.

## Deletion

Soft delete, blocked while the competition has active results. The slug and soft-deleted results are kept as history.
No restore yet.

## Authorization

Every action calls `denied()` (`requireAdmin()`) first; the admin layout is navigation only.

## Testing

- Unit: `competition-rules`, `competition-schemas`, `competition-metadata` (resolution, codec).
- Integration (`tests/integration/competitions.test.ts`, `events_test` only): actions end to end. Concurrency is simulated
  with `holdTransaction`, a second transaction that holds the lock or uncommitted row another admin's write would hold;
  `staysBlocked` asserts the action really waits. The suite needs a discipline with the real slug `trail-running`; it
  creates one under an `itest-` sport and `cleanupFixtures` removes it only from there.
- Integration also covers `listEditionCompetitions` (scoping to the edition, deleted rows, same rules from the edition screen).
- E2E (`tests/e2e/admin-forms.smoke.spec.ts`): the standalone journey plus the edition-screen journey, using fixtures from `scripts/e2e-admin.ts` (fixture edition,
  trail discipline, venue). Wait for hydration after GET-form searches before clicking dialogs.
