# Event editions

Admin CRUD for `EventEdition`: one occurrence of an `EventSeries` (e.g. "Maratón del Sol 2030, Primavera").
Routes: `/admin/event-editions`, `/new`, `/[id]/edit`. Competitions are a separate feature (`features/competitions`),
but the edit page embeds its Competitions section (see below) and the Photographers section (`features/event-photographers`).

## Responsibilities

- Create, edit, list (search, filters, pagination) and soft-delete editions.
- Own the edition's organizer assignments (`EventEditionOrganizer`).
- Validate dates, statuses and references; map conflicts to `ActionResult` errors.
- It does **not** create or edit Locations, Series, Organizers, Competitions or photographer assignments itself; the edit page only hosts those features' sections.

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

## Name, label and historical editions

- **Name** is the public name of the edition (usually the series name). **Label** is an optional free-text identifier such as
  "8th edition", "Night edition" or "Anniversary"; it is only required to tell two editions of one series and year apart.
  The year and label are never appended to the name automatically.
- **Name autofill (create only).** Selecting a series suggests its name (`name-suggestion.ts`, a small reducer with an
  `edited` flag). Changing the series updates the suggestion until the admin types in the field; after that the typed value
  is never replaced, and clearing it does not restore a suggestion (the empty value is reported by validation). Existing
  editions start with `edited: true`, so the saved name is untouched. Slug rules are unchanged.
- **Historical editions may be entered in any order.** `year` is the edition's identity and `label` its optional identifier;
  neither is derived from `createdAt`, insertion order, the number of editions or the latest edition, and there is no
  automatic edition number (no `editionNumber` column). Listings sort by `year desc`, then `startsOn desc` (undated first),
  then name and id (`listEventEditions`); nothing relies on insertion order. Tested with editions created as
  2026, 2027, 2024, 2023, 2025.

## Contextual help

Forms explain non-obvious fields with visible helper text linked through `aria-describedby` (so it works on mobile and
with screen readers; no hover-only tooltips). The wording follows the rules in this README: edition year vs. event dates,
event dates vs. registration dates, original date vs. current date, publication vs. event status vs. registration status
(OPEN needs no URL), and Competition inheritance (dates and location inherited, times never). The edition form is grouped
into General information, Status, Event schedule, Postponement, Registration and results, Organizers and Competitions.

## Time zone and creation flow

- `timeZone` is chosen in a searchable selector (`SearchableSelect`, options from `shared/time-zones.ts`): Latin American zones
  first, then every zone the runtime knows. New editions default to `America/Caracas`; an existing value is always kept
  (unlisted values such as `UTC` appear as "Current value"). Only the IANA identifier is stored; fixed offsets are rejected.
- Creating an edition saves it and opens its edit page (`?notice=created`), where competitions are added in the
  Competitions section. Editing an edition returns to the list as before. There is no combined save.
- The Competitions section (`features/competitions/components/edition-competitions.tsx`) fixes the edition and reuses the
  standalone Competition form and actions, so every Competition rule applies unchanged. It is rendered outside the edition
  `<form>`; do not nest it inside, because dialog submit events bubble through portals.

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
**Code that adds children to an edition (competitions and photographer assignments do; resources and media must) takes the edition row
`FOR SHARE` and re-checks `deletedAt` in its transaction**, otherwise it can race with `deleteEventEdition`.

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
