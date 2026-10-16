# Event photographers (assignments)

Manages which photographers covered an `EventEdition`. There is no admin route of its own: the **Photographers** section
of `/admin/event-editions/[id]/edit` (`components/edition-photographers.tsx`) hosts everything, like Competitions does.
No schema or migration was added; the feature only uses the approved `EventServiceProvider` model.

## Responsibilities and relationships
- `EventServiceProvider` is one provider's **appearance at one edition** (`eventEditionId`, `providerId`, `role`,
  `accreditation`, `description`, soft delete). This feature manages the rows with `role = PHOTOGRAPHER`; rows of other
  roles are never listed, updated or removed here.
- **EventEdition** and **ServiceProvider** stay independent: nothing here edits either of them. The photographer profile is
  edited in `features/photographers` (the only link from here is a "create it in Photographers" link in the picker);
  the edition by `features/event-editions`.
- A provider counts as a photographer when it is linked to the `photographer` `ServiceProviderType`
  (`PHOTOGRAPHER_TYPE_SLUG`, imported from the photographers feature).
- Future `EventResource` galleries point at an appearance through `eventServiceProviderId` (composite FK with the edition).
  That is why an appearance row keeps its id for life and why removal is blocked while active resources use it.

## Rules
- **Identity** is `(edition, provider, role)`. A photographer may cover many editions (also several of one series, also
  historical or completed ones) and an edition may have any number of photographers, including none or a mix of official and
  independent ones. No organizer relationship and no gallery URL is needed to assign.
- **Participation** is `accreditation`: `OFFICIAL`, `INDEPENDENT` or `UNKNOWN` ("Not specified", the default). The schema
  defines nothing beyond the names and that the same photographer may be official in one edition and independent in another,
  so the help text only states the recorded designation; no accreditation process is modelled. It is per edition, never a
  property of the profile.
- **Editable after creation:** accreditation and the optional note (`description`, 500 chars). The photographer, edition and
  role are the identity and cannot change; to "move" an assignment, remove it and add it elsewhere.
- **Duplicates:** one active row per identity. A second add returns `conflict` (field `providerId`).
- **Removal** is a soft delete (`deletedAt`). It never touches the profile, the edition or other assignments. It is blocked
  (`conflict`) while active `EventResource` rows are attributed to the assignment.
- **Re-adding a removed photographer restores the reserved row** instead of inserting (the unique key covers deleted rows):
  same id, `deletedAt` cleared, accreditation and note replaced by the newly submitted values. This follows the schema
  decision "restore rather than insert duplicates".
- **Candidates** (`searchPhotographersForEdition`): active photographers only (not deleted, linked to the photographer type),
  matched by case-insensitive substring of name or Instagram (leading `@` ignored); Instagram is optional. Results are
  server-side paginated (20 per page, "Show more") so nothing is capped; already-assigned photographers are listed but
  disabled. Same-named photographers show Instagram, city/country and the unique profile slug.
- Photographers cannot be created from the dialog. Deleting a profile stays blocked while it has an active assignment on a
  live edition (`deletePhotographer`).

## Transactions and lock order
Every write is one transaction: lock, re-check, then write. Lock order, always:

1. edition row `FOR SHARE` (re-check `deleted_at IS NULL`);
2. provider row `FOR SHARE` (re-check `deleted_at IS NULL`; skipped for the deleted check on removal);
3. assignment row `FOR UPDATE`.

Why this order and these modes:
- Edition `FOR SHARE` conflicts with the `FOR UPDATE` taken by `updateEventEdition` / `deleteEventEdition`, so an assignment
  can never appear under an edition being deleted (the delete either commits first and we return `not_found`, or it waits and
  then sees our row and refuses). It is also the first lock competitions take, so both child features share one order.
- Provider `FOR SHARE` pairs with the `FOR UPDATE` of `deletePhotographer`, which counts active assignments: exactly one of
  "assign" and "delete the profile" wins; the invariant "no active assignment on a deleted profile" cannot be broken.
- The assignment row lock serializes concurrent restore/update/remove of the same row. A brand-new row has nothing to lock;
  two concurrent inserts are resolved by the unique index (`P2002` -> `conflict`).
- No path takes these in another order (editions never lock providers; profile deletion locks only its own row), so there is
  no cycle. Share locks do not conflict with each other, so different photographers/editions are processed in parallel.
- `P2002` -> "already assigned"; `P2003` -> "edition or photographer no longer available"; missing/deleted -> `not_found`
  (edition, assignment) or a `validation` error on `providerId` (photographer).
- Future code that creates an `EventResource` for an appearance must take the assignment row `FOR SHARE` and re-check
  `deleted_at` (after the edition lock, same order), pairing with the check in `removeEventPhotographer`.

## Authorization
`addEventPhotographer`, `updateEventPhotographer`, `removeEventPhotographer` and the read action
`searchEditionPhotographerCandidates` call `denied()` first. The section is only rendered inside the admin layout, but the
actions are the security boundary. There are no public endpoints.

## Not included
Gallery links (`EventResource`), other roles (videographers, medical, …), editing the profile from here, bulk assignment,
restore of a removed assignment other than by adding the photographer again, public pages, self-registration.

## Testing
Unit: `tests/unit/event-photographer-schemas.test.ts`. Integration (`events_test`): `tests/integration/event-photographers.test.ts`
(authorization, lifecycle, restore, search, locks; concurrency tests hold a competing transaction open and check the action
waits). Removing a `FOR SHARE` clause makes four of them fail. E2E: one journey in `tests/e2e/admin-forms.smoke.spec.ts`,
fixtures in `scripts/e2e-admin.ts`.
