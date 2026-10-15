# Event editions

Admin CRUD for `EventEdition`: one occurrence of an `EventSeries` (e.g. "Maratón del Sol 2030, Primavera").
Routes: `/admin/event-editions`, `/new`, `/[id]/edit`. Competitions are a separate, later feature.

## Responsibilities

- Create, edit, list (search, filters, pagination) and soft-delete editions.
- Own the edition's organizer assignments (`EventEditionOrganizer`).
- Validate dates, statuses and references; map conflicts to `ActionResult` errors.
- It does **not** create or edit Locations, Series, Organizers or Competitions.

## Identity: several editions per series and year

There is no unique `(series, year)`. Two active editions of one series and year must differ by `label`
(case-insensitive; "no label" counts as a value), otherwise the action returns `conflict` asking for a label.
The slug is globally unique and **reserved by soft-deleted rows**. When left empty it is derived from
`name + label + year` (`deriveEditionSlug`); a collision is reported, never fixed with a suffix.
The series cannot be changed after creation.

## Organizer assignments

- `EventSeriesOrganizer` is only a template. On create the form pre-fills the series template and the admin may edit it;
  if a caller omits `primaryOrganizerId` (and co-organizers), the server copies the template itself
  (deleted organizers are skipped; no active PRIMARY → validation error).
- From then on `EventEditionOrganizer` is the only source of truth. Editing an edition never touches the series
  and editing the series never touches existing editions.
- Exactly one PRIMARY (SQL partial unique index for "at most one", the schema for "at least one"), no duplicates,
  organizers must be active. Updates apply a minimal diff in the order remove → demote → promote → add so the
  index is never violated and untouched rows keep their ids.

## Dates and times

- `startsOn`/`endsOn` are `YYYY-MM-DD` strings end to end (`src/shared/local-date.ts`); times are `HH:mm`.
  `endsOn` is inclusive; an overnight event needs a later `endsOn`.
- TBA editions have no dates. An end date or a time of day requires a start date; a COMPLETED edition needs a start date.
- `year` is the edition's **identity**, not a date: it is never compared with `startsOn`, and changing the dates never
  changes `year` or `slug`. A 2026 edition postponed to 2027 stays "2026" (history, URLs and relations are preserved).
- `rescheduledFromOn` must differ from `startsOn`; it is allowed with any status (POSTPONED is the usual one).
- `registrationOpenAt`/`CloseAt` are instants typed as wall-clock time in the edition's `timeZone`
  (default `America/Caracas`) and converted with Intl, never with the server's or browser's zone.
- The rules live in `rules.ts` and mirror the SQL CHECKs so the user gets field errors instead of a DB error.
- Changing the dates re-validates the edition's active competitions with `competitions/rules.ts`
  (only when the dates actually change).

## Status and publication

Three independent enums: `publicationStatus`, `status` (lifecycle) and `registrationStatus`. Any combination is
allowed: published TBA, postponed and cancelled editions, and **published with registration OPEN and no
`registrationUrl`** (people may register by WhatsApp, Instagram, phone or in person; the URL is just an optional
link). The only status-related rule is that a COMPLETED edition needs a start date. There are no publish gates
beyond the normal validation every save goes through.

## Transactions and locking

Every write is one transaction, checks first and writes last, so a lost slug race (`P2002`) rolls back
assignment changes as well. Lock order, always:

1. series row `FOR UPDATE` (same lock EventSeries edits/deletes use: serializes edition creation against
   "delete the series", template changes and the distinguishability check, which the DB cannot enforce);
2. edition row `FOR UPDATE`;
3. location row `FOR SHARE` (paired with `FOR UPDATE` in `deleteLocation`);
4. organizer rows `FOR SHARE`, `ORDER BY id` (paired with `deleteOrganizer`).

Deleting a location or organizer takes only its own row, so no cycle is possible. Delete locks only the edition row.
**Future code that adds children to an edition (competitions, providers, resources, media) must take the edition row
`FOR SHARE` and re-check `deletedAt` in its transaction**, otherwise it can race with `deleteEventEdition`.

## Deletion

Soft delete, blocked while the edition has active competitions, service providers, resources or media.
Organizer assignments, slug and all historical rows are kept. No restore yet.

## Not exposed in the form

`metadata` (preserved on update) and the competitions/providers/resources/media relations.

## Testing

- Unit (`tests/unit/event-edition-schemas.test.ts`, `local-date.test.ts`): rules, schemas, slug derivation, time zones.
- Integration (`tests/integration/event-editions.test.ts`, `events_test` only): actions end to end including
  authorization, races and rollback. Lost-slug races are simulated with a second transaction that holds an
  uncommitted row (`holdUncommittedEdition`); keep its short sleep if you refactor.
- E2E (`tests/e2e/admin-forms.smoke.spec.ts`): one journey; it relies on fixtures from `scripts/e2e-admin.ts`
  (template series with Alpha/Beta, a venue). Wait for hydration after GET-form searches before clicking dialogs.
