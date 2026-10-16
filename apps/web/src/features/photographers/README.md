# Photographers (admin)

Admin CRUD for photographer profiles at `/admin/photographers`. There is no Photographer model: a photographer is a
`ServiceProvider` row.

## Architecture
- **Classification.** A provider is a photographer when it has a `ServiceProviderToType` link to the
  `ServiceProviderType` with slug `photographer` (`PHOTOGRAPHER_TYPE_SLUG`). The type is seeded by `pnpm db:seed`
  (`seedProviderTypes`, idempotent, `events_dev` only, never updates existing rows). Create fails with a clear message when it is
  missing. Every query in this feature filters by that link, so other provider categories never show up here.
- **Fields.** Written columns of `ServiceProvider`: name, slug, description (biography), instagram, website, email, phone,
  profileImageUrl, city, countryCode (ISO alpha-2). Every contact field is optional (Instagram-only profiles are valid).
  Individual vs studio vs team is not modelled (the schema has no such field); the name may be any of them.
- **Disciplines.** `ServiceProviderDiscipline` (unique per provider + discipline). Independent of events.
- **Left untouched by edits:** other `ServiceProviderToType` links, `metadata`, `ServiceProviderMedia`, `ServiceProviderTag`,
  `EventServiceProvider`.

## Rules
- Duplicates are detected on Instagram handle, website or email among non-deleted providers (no DB constraint exists, so a
  simultaneous double submit could still slip through). Names are never compared; a generated slug gets `-2`, `-3`… on
  collision, an explicit slug collision is an error. Slugs of deleted profiles stay reserved.
- Referenced disciplines must be active (discipline and sport not deleted); re-checked under `FOR SHARE` in the transaction.
- Writes use one transaction: provider row `FOR UPDATE` -> discipline rows `FOR SHARE` (ordered). Discipline assignments are
  diffed (`diffDisciplineIds`), so unchanged rows keep their id/`createdAt`. P2002/P2003 map to `conflict` results.
- **Soft delete** sets `deletedAt`. It is blocked (`conflict`: unassign first) while the provider has an `EventServiceProvider`
  row with `deletedAt` null on an edition with `deletedAt` null. Deleted assignments/editions are history: they never block and
  are never modified. Nothing is physically deleted. No restore yet.
- **Lock contract for future EventServiceProvider mutations:** take the provider row `FOR SHARE` (re-checking
  `deleted_at IS NULL`) in the same transaction as the insert/update; `deletePhotographer` takes it `FOR UPDATE`.

## Profile media
Only `profileImageUrl` (an external URL, no upload) is managed. `ServiceProviderMedia` (portfolio/gallery images through
`Media`, unique URL, usage type, sort order) is deferred: it needs its own list editor and is not part of the base profile.
Event photo galleries are `EventResource` and belong to a later stage.

## Reusing the model for other provider categories
Add a `ServiceProviderType` seed entry and a feature that filters on its slug the same way; reuse the field schemas and the
discipline diff. Do not add type-specific columns: put them in `ServiceProvider.metadata` with a validated schema.

## Deferred
Event assignments (`EventServiceProvider`), event galleries (`EventResource`), portfolio media, restore, public pages,
self-registration/claiming.

## Tests
Unit: `tests/unit/photographer-schemas.test.ts`. Integration (`events_test`): `tests/integration/photographers.test.ts`,
provider-type seed in `catalog-seed.test.ts`. E2E: photographer journey in `admin-forms.smoke.spec.ts`.
