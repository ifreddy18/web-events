# Rebuild plan — Sports events platform (clean foundation)

## Progress

- **Stage 1 done:** local PostgreSQL 17 (Homebrew), databases `events_dev` / `events_test`, `.env` / `.env.test` (ignored) + `.env.example`, v1 admin/features code removed (v1 preserved in `main_v1`).
- **Stage 2 done:** `prisma/schema.prisma` = approved v2.2; v1 migrations, seeds and fixtures removed (recover via `git show main_v1:<path>`); single initial migration `prisma/migrations/20261014000000_init` = `prisma migrate diff` output + appended `schema_v2_2_constraints.sql` (30 tables, 36 FKs, 9 CHECKs, 2 partial unique indexes). Applied with `migrate deploy` to both DBs; schemas identical; Prisma Client 6.19.3 generated. `dotenv` added as a direct dependency; `package.json#prisma` seed config removed. Still open: composite-FK write test on `EventResource`, test-DB guard, Vitest/Playwright, `src/types/metadata` (v1 reference) and `src/server/db/prisma.tsx` rename.
- **Stage 3 done:** Vitest + Playwright foundation, test-DB safety guard, integration tests, pnpm pinned (see "Stage 3" at the end). `prisma.tsx` renamed to `prisma.ts`; guard and composite-FK test resolved.
- **Stage 4 done:** AGENTS.md guidelines, shared date/action-result helpers, competition schedule rules, metadata validation example (see "Stage 4" at the end).
- **Stage 5 done:** Better Auth admin authentication (see "Stage 5" at the end).
- **Stages 6–8.5 done:** Locations, Organizers, EventSeries admin CRUD and the catalog seed (see the sections at the end).
- **Stage 9 done:** EventEdition admin CRUD (see "Stage 9" at the end).
- **Stage 10 done:** Competition admin CRUD (see "Stage 10" at the end).
- **Stage 10.6 done:** Admin navigation shell (see "Stage 10.6" at the end).
- **Stage 10.7 done:** Admin data-entry UX: selectors, inline competitions, contextual help, name autofill (see "Stage 10.7" at the end).

**Status:** Proposal, nothing applied. Baseline: `main` @ `c4d8605` (Prisma v2.2 docs approved); v1 preserved on `main_v1`.
**Inputs inspected:** `apps/web` tree, `package.json`, configs (`prisma.config.ts`, `tsconfig.json`, `components.json`, `next.config.ts`), `src/server/db/prisma.tsx`, v2.2 proposal files (`schema_v2_2.prisma`, `_decisions.md`, `_constraints.sql`).

## Findings from inspection

- Layout: git root contains `README.md`, `docs/roadmap.md`, `apps/web` (single app, no workspace file). pnpm lockfile lives in `apps/web`.
- Stack present: Next 16.2.6, React 19.2, Prisma 6 (`prisma-client-js`), Zod 4, RHF 7 + resolvers, Tailwind 4, shadcn (`radix-nova`, `rsc: false`), pg, tanstack table.
- **Missing:** Vitest, Playwright, any auth, `.env`/`.env.example`, Docker (not installed). Local `psql` 17.11 via Homebrew is available.
- `prisma/schema.prisma` + 5 migrations are v1 (superseded by v2.2). `prisma.config.ts` reads `DATABASE_URL` through `dotenv/config` (`dotenv` is not a direct dependency; it works only transitively — add it).
- `dev` script uses `next dev --webpack`; reason unknown (check against v1 history before keeping).
- v1 has 5 admin CRUDs (organizers, locations, event-series, event-editions, competitions) under `src/features/*/{actions,components,queries,schemas}`; the pattern is sound but tied to the v1 schema. `src/types/metadata/*` is sport-specific JSON typing worth reviewing for reuse.
- `AGENTS.md` instructs reading `node_modules/next/dist/docs/` before writing Next code — follow it in every stage.
- `shadcn` and `tsx` are in dependencies/devDependencies; `shadcn` CLI belongs in neither at runtime (use `pnpm dlx shadcn`).

## 1. Repository cleanup strategy

Safe because `main_v1` preserves everything. Do it in one commit on a branch `rebuild/foundation` (not on `main` directly), using `git rm`, never `reset`/`clean`.

**Remove (v1-specific):**
- `prisma/schema.prisma`, `prisma/base_schema copy.prisma`, `prisma/migrations/*`, `prisma/seed.ts`, `prisma/seeds/`, `prisma/utils/`, `prisma/data/` (fixtures reference v1 shapes; rewrite small v2.2 seed later).
- `app/admin/**` (all v1 routes), `src/features/**`, `src/constants/*-status.ts` (re-derive from Prisma enums), `src/lib/admin-navigation.ts`.
- `src/components/admin/`, `src/components/form/`, `src/components/layout/` (rebuild alongside first feature; review before deleting for anything generic).
- `src/types/metadata/**` — **move to a temp reference** (read from `main_v1` when needed) rather than carrying over; v2.2 puts validation in per-discipline Zod schemas.
- `README.md` sections describing v1; `docs/roadmap.md` — rewrite/update.
- Dependencies: `@tanstack/react-table`, `cmdk`, `date-fns`, `slugify`, `pg` (Prisma 6 engine does not need it) — re-add only when a stage needs them.

**Keep:**
- `docs/architecture/**` (untouched), `AGENTS.md`, `CLAUDE.md`.
- Config: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `.gitignore`, `prisma.config.ts` (path stays `prisma/schema.prisma`).
- `app/globals.css`, `app/layout.tsx` (review), `public/`.
- `src/components/ui/*` shadcn primitives (button, card, input, select, dialog, sheet, table, textarea, badge, skeleton, popover, dropdown-menu, input-group, command). Keep only those used by stage 3-4; delete the rest and re-add via CLI.
- `src/lib/utils.ts` (`cn`), `src/server/db/prisma.tsx` → rename to `prisma.ts` (no JSX).

## 2. Proposed directory structure

Feature-based, minimal layers: `schemas` (Zod, shared client+server), `service` (business rules, pure where possible), `actions` (Server Actions: auth + parse + call service), `queries` (reads), `components`.

```
apps/web/
├─ app/
│  ├─ (public)/                 # future SEO pages: events, series, editions
│  ├─ admin/
│  │  ├─ layout.tsx             # server-side auth gate
│  │  └─ <feature>/page.tsx, new/, [id]/edit/
│  ├─ api/                      # only if needed (health, webhooks)
│  ├─ layout.tsx  globals.css
├─ src/
│  ├─ features/
│  │  └─ <feature>/             # organizers, locations, event-series, event-editions, competitions
│  │     ├─ schemas.ts          # Zod; types via z.infer
│  │     ├─ rules.ts            # pure business rules (date inheritance, etc.)
│  │     ├─ queries.ts          # read functions (server-only)
│  │     ├─ actions.ts          # "use server": requireAdmin → validate → write
│  │     ├─ components/         # forms, tables
│  │     └─ *.test.ts           # colocated unit tests
│  ├─ shared/
│  │  ├─ metadata/              # per-discipline Zod metadata schemas + registry
│  │  ├─ dates.ts  slug.ts      # shared helpers (local dates, HH:mm, collision-safe slug)
│  │  └─ action-result.ts       # { ok, data | fieldErrors } type
│  ├─ server/
│  │  ├─ db.ts                  # Prisma singleton
│  │  ├─ auth.ts                # requireAdmin() / getSession()
│  │  └─ env.ts                 # Zod-validated process.env
│  ├─ components/ui/            # shadcn
│  └─ lib/utils.ts
├─ prisma/
│  ├─ schema.prisma             # copy of schema_v2_2.prisma
│  ├─ migrations/               # 1 initial migration + hand-appended constraints SQL
│  └─ seed.ts                   # small deterministic fixtures (fixed UUIDs)
├─ tests/
│  ├─ integration/              # Vitest + real DB
│  └─ e2e/                      # Playwright
├─ docs/architecture/           # approved docs + this plan
├─ vitest.config.ts  playwright.config.ts  .env.example
```

Rules: features do not import each other's internals (only `schemas`/types); `server/*` and `queries/actions` import `server-only`; no repository/DTO/service-interface layers.

## 3. Development environment configuration

- **PostgreSQL 17 local via Homebrew** (no Docker installed): `brew services start postgresql@17`.
- Two databases, same server, never Supabase:
  - `events_dev` (app)
  - `events_test` (integration + e2e; reset per run)
- `.env.example` (committed), `.env` / `.env.test` (ignored; `.gitignore` already has `.env*` — add exception `!.env.example`):
  ```
  DATABASE_URL="postgresql://<user>@localhost:5432/events_dev"
  # test: events_test (separate file, loaded by vitest/playwright)
  AUTH_SECRET=""            # decision pending, see stage 2
  ADMIN_EMAILS=""           # decision pending
  ```
- Guard: `server/env.ts` + a test-setup check that aborts if `DATABASE_URL` doesn't contain `localhost` and `_test` when running tests (prevents wiping dev/remote DB).
- Scripts (`package.json`): `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test`, `test:int`, `test:e2e`, `db:generate`, `db:migrate`, `db:reset`, `db:seed`, `db:test:reset` (`prisma migrate reset --force --skip-seed` against test URL), `ci` (lint+typecheck+test+build).
- Migration: generate the single initial migration from the v2.2 schema, then append `schema_v2_2_constraints.sql` to that same migration file before applying (Prisma cannot express partial unique indexes/CHECKs). Verify with `prisma validate` and a real write of the composite FK in `EventResource` (decision #7).
- Revisit `next dev --webpack`; default to Turbopack unless v1 showed a concrete issue.

## 4. Testing strategy

Pyramid, minimal tooling, tests land with the first feature:

1. **Unit (Vitest, node env)** — pure code: Zod schemas, `rules.ts` (date/time inheritance cases from decision #4: competition outside edition window, inverted inherited times, `endsOn` without `startsOn`, midnight-spanning), slug generation, metadata schemas per discipline. Colocated `*.test.ts`. Fast, no DB.
2. **Integration (Vitest + real Postgres test DB)** — actions/queries and DB constraints: partial unique PRIMARY organizer, CHECK constraints from the SQL file, soft-delete + restore, `P2002` slug collision handling, organizer template → edition copy, EventResource composite FK. Each test file wraps in a transaction or truncates tables; run serially (`pool: forks`, `singleFork`). Mock only `next/cache`/`next/headers`; auth is tested by calling actions with/without a session.
3. **Authorization tests** — every admin action rejects unauthenticated/non-admin callers (table-driven across all actions) — this is the server-side authorization guarantee.
4. **E2E (Playwright, Chromium only)** — few critical flows: admin login, create series → edition → competition, validation errors shown, unauthorized redirect, later public page renders with metadata. Runs against `next build && next start` + test DB; seed via `prisma/seed.ts` or API-free DB helper. Smoke only; logic belongs to lower layers.
5. Component tests (RTL) **not** included in MVP; add only if form logic outgrows e2e.

Conventions: schemas are the single source of truth shared by RHF (`zodResolver`) and Server Actions; actions return `{ok:false, fieldErrors}` instead of throwing for validation. Coverage not gated initially; CI gate is `lint + typecheck + unit + integration`, e2e on main/PR.

## 5. Required dependencies

**Keep:** `next`, `react`, `react-dom`, `@prisma/client@6`, `prisma@6` (dev), `zod`, `react-hook-form`, `@hookform/resolvers`, `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `radix-ui`, `typescript`, `eslint`, `eslint-config-next`, `tsx`, `@types/*`.

**Add:**
- `vitest`, `@vitest/coverage-v8` (optional), `vite-tsconfig-paths` (for `@/` alias)
- `@playwright/test`
- `server-only`
- `dotenv` (explicit; used by `prisma.config.ts`) and `dotenv-cli` or Vitest `env` config for `.env.test`
- Auth: **decision needed** (see risks). Lowest-dependency option: a single admin identity via signed session cookie using `jose` + password hash (`@node-rs/argon2` or `bcryptjs`) against `User`; heavier option: Auth.js/Better Auth. Recommend the minimal option for a single-admin MVP, behind `requireAdmin()` so it can be swapped.

**Remove:** `shadcn` (use `pnpm dlx`), `pg`, `slugify` (write ~10-line slug helper with transliteration via `String.normalize`), `@tanstack/react-table`, `cmdk`, `date-fns` until needed (dates are `DATE`/`HH:mm` strings; avoid timezone-shifting libs).

## 6. Implementation stages

Each stage ends green (`pnpm ci`) and in one reviewable commit/PR.

1. **Cleanup & tooling baseline.** Branch; remove v1 files; fix deps; add `.env.example`, scripts, strict TS check, Vitest + Playwright configs with one trivial test each; update README/roadmap. *Verify:* `pnpm install`, `lint`, `typecheck`, `test`, `build` pass; app serves a blank home.
2. **Database foundation.** Local Postgres + dev/test DBs; copy v2.2 schema; initial migration + appended constraints SQL; `server/db.ts`, `server/env.ts`; `db:test:reset`. *Verify:* `prisma validate`, migrate applies on both DBs, integration test asserts CHECKs and partial unique indexes reject bad rows, composite-FK write test.
3. **Shared core.** `shared/dates.ts`, `slug.ts`, `action-result.ts`, metadata registry (start with 1–2 disciplines), date/time rules module. *Verify:* unit tests covering decision #4 cases.
4. **Auth & admin shell.** Decide auth approach; `requireAdmin()`; admin layout gate; minimal nav; login page. *Verify:* authorization tests + Playwright unauth redirect + login flow.
5. **First feature vertical: Locations** (simplest, no parents). schemas → queries → actions → list/new/edit UI; soft delete + restore. Establishes the template. *Verify:* unit + integration + authz tests; one e2e CRUD flow. **Stop and review the pattern before replicating.**
6. **Organizers** (with metadata validation) — second pass validates the pattern; extract only genuinely duplicated helpers.
7. **EventSeries** (+ organizer template, status enum).
8. **EventEditions** (series FK, template→edition organizer copy in transaction, single PRIMARY rules, slug collision, publication vs lifecycle, dates/times). *Verify:* heaviest integration suite.
9. **Competitions** (date/location inheritance via shared rule, discipline metadata Zod validation).
10. **Seed & e2e happy path.** Small deterministic v2.2 seed (fixed UUIDs), full create-chain e2e.
11. **Public read layer (post-MVP admin).** `(public)` routes with Server Components, `generateMetadata`, sitemap/robots, filter `publicationStatus=PUBLISHED` and `deletedAt: null`. Deferred: ServiceProvider/EventResource/Athlete/Result admin.

## 7. Risks and precautions

- **Auth is unspecified** (none in v1; `User` exists in schema). Must be decided before stage 4; all mutations must call `requireAdmin()` inside the action itself — never rely on layout/middleware alone (layouts don't re-run on every Server Action call).
- **Constraints SQL not Prisma-expressible.** Appending to the initial migration means future `migrate dev` may drift-detect; keep it in the same migration file and document it. Never edit the file after it is applied; use new migrations.
- **Composite FK on `EventResource`** is flagged "verify before adoption" in the decisions file — test in stage 2 before building on it.
- **Test DB safety.** Enforce the localhost/`_test` guard; never point tests at Supabase or the dev DB.
- **Soft deletes.** Every query must filter `deletedAt: null`, including nested relations; centralize in query helpers and cover with tests; restore-vs-create logic for unique slugs/URLs.
- **Dates.** Use `DATE`/`HH:mm` as strings end to end; avoid `Date` → `toISOString()` shifts (decision #4). Parse Prisma `DATE` values as UTC and format without timezone conversion.
- **JSON metadata drift.** Registry keyed by discipline; unknown discipline = validation error; version field in metadata if schemas are expected to evolve.
- **Next 16 differences.** Read `node_modules/next/dist/docs/` for caching/async `params`/`searchParams`/`cookies()` before writing routes, per `AGENTS.md`; Server Actions are public endpoints, validate and authorize every call.
- **Slug collisions** (`P2002`) are expected (same-year editions allowed); handle with suffix retry in a transaction.
- **Scope creep.** Defer User registration, Favorites, SeoMeta tooling, media hosting, results, athletes. Do not copy v1 features not in the stage list.
- **Repo hygiene.** Don't edit approved docs; changes to the schema require a new decisions entry. Do cleanup on a branch; v1 stays recoverable from `main_v1` (reference with `git show main_v1:<path>`).
- **Open questions:** auth approach; whether `--webpack` is still required; whether to flatten repo (move `apps/web` to root) — recommend keeping as-is for now.

## Stage 3 — Testing and tooling foundation (complete)

**Toolchain.** pnpm 10.34.7 via Corepack, pinned in `packageManager` (the stage-2 lockfile churn came from a different pnpm major; regenerating from the committed lockfile with 10.34.7 yields only the `dotenv` addition). Added: `dotenv` (dependency, used by `prisma.config.ts`), `server-only`, `vitest`, `@playwright/test`. Removed (confirmed unused): `pg`, `tsx`, and the `prisma.seed` hook. Removed the `db:reset` script (`migrate reset` is forbidden). Playwright browsers are **not** installed; run `pnpm exec playwright install chromium` before the first real E2E.

**Commands** (run from `apps/web`)

| Script | Purpose |
|---|---|
| `lint`, `typecheck` | ESLint, `tsc --noEmit` |
| `test` | unit, then integration |
| `test:unit` | `tests/unit/**`, no database |
| `test:integration` | `tests/integration/**` against `events_test` (guarded) |
| `test:e2e` | Playwright (`tests/e2e`, app on port 3100 against `events_test`; passes with no tests) |
| `db:generate` | `prisma generate` |
| `db:migrate` / `db:studio` | dev DB only (`.env`, must be `events_dev`) |
| `db:migrate:test` | `prisma migrate deploy` on `events_test` (`.env.test`) |
| `db:seed` | idempotent Sport/Discipline catalog seed, `events_dev` only (stage 8.5) |

**Database safety rules.** `tests/support/db-safety.ts` validates `DATABASE_URL` and aborts on failure. Tests require: PostgreSQL URL, host exactly `localhost`/`127.0.0.1` (no `host=` override, no supabase/pooler/cloud markers), database exactly `events_test` (never `events_dev` or `accounting_system*`). `db:*` dev scripts require exactly `events_dev`. `scripts/with-db-env.ts` loads the right env file *overriding* any shell `DATABASE_URL`, validates, then runs the command; the integration setup file and `playwright.config.ts` do the same with `.env.test`. Integration helpers also confirm `current_database()` before cleanup. Fixtures use the `itest-` slug prefix and are removed with prefix-scoped `deleteMany` (children first) before and after the run: no reset, no truncate.

**Layout.** `src/server/db/prisma.ts` (singleton, `server-only`; stubbed in Vitest via alias), `vitest.config.mts` (unit), `vitest.integration.config.mts` (serial, `.env.test`), `tests/{unit,integration,e2e,support}`.

**Results.** Prisma validate OK; typecheck, lint clean; 15 unit tests (guard) and 16 integration tests pass (connection, same-year editions, one PRIMARY organizer, edition date/time CHECKs, composite-FK rejection, multiple galleries per photographer, duplicate URL per edition rejected, same URL across editions allowed). `events_dev` and `events_test` both accessible with the init migration applied, and `events_test` left empty after runs.

## Stage 4 — Shared architecture and guidelines (complete)

Conventions live in `AGENTS.md` (`CLAUDE.md` imports it). Deviations from the original structure sketch above: no `service` layer and no `shared/metadata` registry; features use flat `schemas.ts / queries.ts / actions.ts / rules.ts` files created on demand; unit tests live in `tests/unit` (not colocated).

**Implemented (no schema, migration or CRUD changes)**
- `src/shared/local-date.ts`: `LocalDate`/`LocalTime` string types, validation, `localDateFromDb`/`localDateToDb` (UTC getters, so no timezone shift).
- `src/shared/action-result.ts`: `ActionResult<T>` (`ok` | `{code, message, fieldErrors}`), `ok`, `fail`, `fromZodError`, `hasPrismaCode` (structural, for `P2002`/`P2003`).
- `src/features/competitions/rules.ts`: `resolveEffectiveSchedule` and `validateCompetitionSchedule` per decision #4. Returns all issues (`invalid_date`, `invalid_time`, `missing_start_date`, `end_before_start`, `outside_edition`, `time_order`) with the offending field.
- `src/features/competitions/metadata.ts`: `parseCompetitionMetadata(disciplineSlug, raw)` with one strict Zod schema (`trail-running`: `distanceKm` required at Stage 4 (optional since Stage 10), optional elevation/terrain/cutoff/tags/difficulty/beginnerFriendly).

**Decisions not covered elsewhere**
- Competition times are overrides only; they are not inherited from the edition.
- An edition with no `startsOn` (TBA) imposes no window; competition dates are then accepted, but times and `endsOn` still need a resolvable start date.
- Overnight times (end before start) are valid only when the effective end date is after the start date.
- Non-empty metadata for a discipline with no schema is rejected; empty metadata is always valid. Schemas are added per discipline when a feature needs it. The `trail-running` slug must match the seeded discipline slug.
- Existing `src/types/metadata/*` (v1 interfaces) are untouched reference material, not used yet.

**Results.** typecheck and lint clean; 45 unit tests (guard, dates, action results, schedule rules, metadata) and 16 integration tests pass.

## Stage 5 — Admin authentication (complete)

**Architecture.** Better Auth 1.7 with the Prisma adapter, email + password only, `disableSignUp: true`, no OAuth, no password recovery. Role management uses the Better Auth `admin` plugin (`role` = `admin` | `user`, `banned`). `nextCookies()` is enabled. Sessions are database-backed (7 days, refreshed daily) with no cookie cache, so deleting/revoking a session or banning a user takes effect on the next request. Sign-in is rate limited by Better Auth (5/min on `/sign-in/email`) because it goes through `/api/auth/[...all]`. Password hashing is Better Auth's default (scrypt); minimum length 12.

- `src/server/auth/auth.ts`: the single `auth` instance. `session.ts`: `getSession()`, `hasAdminRole()`, `requireAdmin()` + `AuthorizationError`. `provision.ts`: `createUserWithPassword()` (script/tests only).
- UI: `/login` (client form, Zod `loginSchema`, generic "Invalid email or password." message) and `/admin` (layout redirects unauthenticated/non-admin/banned users to `/login`; signed-in non-admins see a "no administrator access" message and a sign-out button). Authenticated admins hitting `/login` go to `/admin`. The layout is navigation only; authorization lives in `requireAdmin()`.
- Existing `User` model was reused (no second user entity): `email`/`name` now required; added `emailVerified`, `image`, `role`, `banned`, `banReason`, `banExpires`; new `Session`, `Account`, `Verification`. UUID ids via `advanced.database.generateId: "uuid"`. Migration `20261015002950_better_auth` (tables were empty), applied to `events_dev` and `events_test` only. Soft delete (`deletedAt`) is not seen by Better Auth: deactivate admins with `banned`.

**Environment variables** (`.env`, `.env.test`; see `.env.example`): `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥ 32 chars, distinct per environment; the app refuses to start without it), `BETTER_AUTH_URL` (dev `http://localhost:3000`, test/Playwright `http://localhost:3100`). Production needs its own values and HTTPS.

**Provisioning administrators.** The only way to create accounts is the local script, which targets `events_dev` only (guarded):
`pnpm auth:create-admin --email <email> --name "<name>"`: it prompts for the password (hidden; `ADMIN_PASSWORD` env for non-interactive use; never put it in a committed file). It fails if the email exists or the password is shorter than 12 characters. Use the same command to add a second administrator later. A future in-app "invite admin" screen would use the admin plugin `createUser` API behind `requireAdmin()`; do not enable sign-up for this.

**Requirements for future features.** Call `requireAdmin()` first in every Server Action/Route Handler; keep `/api/auth` as the only auth surface; test unauthenticated and non-admin denial for each new mutation.

**Verification.** Prisma validate, typecheck, lint and `next build` pass; 51 unit and 29 integration tests (unauthenticated/non-admin/admin/banned access, invalid credentials, sign-up disabled, hashed password, session validation, forged token, expiry, revocation, sign-out). A manual smoke test against a production build on `events_test` confirmed: `/admin` → 307 `/login`, bad login 401, sign-up rejected, login 200, `/admin` 200, `/login` → `/admin`; the smoke user was then removed.

## Stage 6 — Locations admin CRUD (complete)

First admin module; the pattern for the next ones. Files: `src/features/locations/{schemas,rules,queries,actions}.ts`, `components/{location-form,locations-table,delete-location-button}.tsx`, routes `app/admin/locations/{page,loading,new,[id]/edit}`. No schema/migration/auth changes; `metadata`, which has no UI, is never read or written by the form.

**Pattern (reuse for other modules)**
- Every action: `requireAdmin()` first (`denied()` helper maps `AuthorizationError` to `fail(code)`), then Zod parse, then business checks, then write. Actions accept `unknown` and validate on the server. Success is `ok({ id })`; clients navigate to the list with `?notice=created|updated|deleted` (shown as a status banner).
- Lists are server-rendered from URL `q`/`page` (plain GET search form, link-based pagination, 20/page, page clamped to the last page, stable ordering with `id` tiebreaker). Decimal columns are converted to numbers in queries.

**Decisions**
- *Slugs:* normalized with `generateSlug`; empty slug is derived from venue, city, state, country (`rules.ts`). Collisions are never auto-suffixed: the admin gets a `conflict` with a `slug` field error. Slugs of soft-deleted rows stay reserved (message says so); there is no restore UI yet.
- *Duplicates:* same country/state/city/venue/address (case-insensitive, null-aware, non-deleted) is rejected with a `conflict`, independent of slug. Pre-checks plus `P2002` handling cover races.
- *Delete:* soft delete only; blocked with `conflict` while active (non-deleted) editions or competitions use the location, so relations are never nulled or orphaned. Soft-deleted editions keep their `locationId`.
- *Update:* slug is editable and a changed slug is an explicit admin action; invalid ids and deleted rows return `not_found`.

**Tests.** 10 unit (schemas, slug rules, list params) and 18 integration (`events_test`, `itest-` fixtures; the harness mocks only the request-header source and `revalidatePath`): unauthenticated/non-admin denial for all three actions with no data change, create/derived slug/validation, slug and place duplicates (incl. soft-deleted reservation), update without self-conflict and with metadata preserved, soft delete, usage block, filtering, pagination, usage counts. `cleanupFixtures` now also removes `itest-` locations.

**Verification.** Prisma validate, typecheck, lint, `next build` pass; 61 unit and 47 integration tests pass. Not done: browser/E2E check of the forms and delete dialog.

## Stage 7 — Organizers admin CRUD (complete)

Second admin module, following the Stage 6 pattern. Files: `src/features/organizers/{schemas,rules,queries,actions}.ts`, `components/{organizer-form,organizers-table,delete-organizer-button}.tsx`, routes `app/admin/organizers/{page,loading,new,[id]/edit}`, dashboard link. No schema/migration/auth changes; `metadata` and assignments/media are never touched by the form.

**Shared extraction.** `denied()` moved from Locations to `src/server/auth/admin-guard.ts` (server-only); both modules import it. Nothing else was abstracted (forms/tables stay per feature).

**Decisions**
- *Fields:* name, slug, description, website, instagram, logoUrl (the model's columns). Website/logo must be http(s) URLs; Instagram accepts `@handle`, handle or profile URL and is stored as the lowercase bare handle.
- *Slugs:* same rules as Locations (derived from the name when empty, never auto-suffixed, soft-deleted slugs stay reserved, `P2002` handled).
- *Duplicates:* among non-deleted rows, same name (case-insensitive), same website or same Instagram handle is a `conflict`. Websites are compared as normalized URLs.
- *Delete:* soft delete, blocked with `conflict` while the organizer is assigned to a non-deleted series or edition; assignments to soft-deleted series/editions are kept. `OrganizerMedia` is not checked (retained with the soft-deleted row).
- *Search:* name, slug, Instagram, website, description.

**Tests.** 7 unit (schema, slug, list params) and 17 integration (`events_test`): denial of all three actions for unauthenticated/non-admin, normalization, validation, slug/name/website/Instagram conflicts, soft-deleted reservation, update preserving metadata and assignments, soft delete and relation blocking, search, pagination, counts. E2E smoke `tests/e2e/admin-forms.smoke.spec.ts` (see below).

**E2E verification (executed).** `pnpm test:e2e` passes 3/3 on Chromium against `next dev` on port 3100 and `events_test`: unauthenticated redirects to `/login` for admin routes; for both Organizers and Locations, validation errors, create, (organizer) edit, search, delete via the confirmation dialog, and success notices. Setup: `tests/e2e/global-setup.ts` generates a random `itest-e2e-*` admin and password per run (kept only in the process environment, never logged) and creates it through `createUserWithPassword` via `scripts/e2e-admin.ts`; teardown deletes the user (sessions cascade) and leftover `itest-e2e-` organizers/locations. The script and the config both go through `assertSafeTestDatabaseUrl` and verify `current_database()` is `events_test`; the Next server gets that URL plus the test auth secret/URL. A failed setup fails the run (no skip). Finding: interacting before hydration triggers a native form submit / dead buttons, so the spec waits for `networkidle` after navigations. Run `pnpm exec playwright install chromium` once beforehand.

## Stage 8 — EventSeries admin CRUD (complete)

Third admin module. Files: `src/features/event-series/{schemas,rules,queries,actions}.ts`, `components/{event-series-form,event-series-table,delete-event-series-button}.tsx`, routes `app/admin/event-series/{page,loading,new,[id]/edit}`, dashboard link, `src/shared/field-schemas.ts`. No schema/migration/auth changes. The approved `EventSeries` model has no location column, so none is offered; `metadata` is never read or written by the form.

**Shared extraction.** `clean`, `optionalText`, `optionalUrl`, `instagramHandle` moved from the organizers schema to `src/shared/field-schemas.ts` (features may not import each other); Organizers now imports them. Locations keeps its own copies (untouched).

**Organizer assignments (`EventSeriesOrganizer`, a template for future editions)**
- The form sends one PRIMARY (required) and 0–20 CO_ORGANIZERs; the same organizer twice (including primary also as co-organizer) is a validation error. All organizers, the discipline and its sport must exist and be non-deleted.
- Updates diff against current rows (`rules.diffAssignments`) and apply remove → demote → promote → add, so the DB's one-PRIMARY partial unique index is never violated and untouched rows keep their ids/`createdAt`.
- Everything runs in one transaction. The series row is locked `FOR UPDATE` (serializes edits/deletes), organizers are locked `FOR SHARE` and re-checked as active. `deleteOrganizer` now takes `FOR UPDATE` on the organizer before counting assignments, so "assign" and "delete organizer" cannot both pass on a stale check. Series fields are written last, so a slug `P2002` rolls back assignment changes too. `P2002`/`P2003` map to `conflict`.
- Future EventEdition creation must take the same `FOR UPDATE` lock on its series and copy the template; edition organizers then stand alone.

**Other decisions**
- *Duplicates:* same name within the same discipline (case-insensitive, non-deleted) → `conflict`; slug rules as in Organizers (reserved when deleted, never auto-suffixed).
- *Delete:* soft delete, blocked while active editions exist; assignments are kept as history and a deleted series no longer blocks deleting its organizers.
- *Lookups:* no Sport/Discipline CRUD. The form lists active disciplines (of active sports) and says to load the catalog seed when none exist (`pnpm db:seed`). Organizer pickers are native `select`/checkboxes, capped at 500 organizers.
- *List:* search over name, slug, description, Instagram, discipline, sport and organizer names; filters by status and discipline.

**Tests.** 10 unit (schema, assignment diff, list params) and 24 integration (`events_test`): denial of all actions, create with several co-organizers, validation, deleted/unknown organizers/disciplines/sports, slug/name conflicts, lost-slug-race and rollback, co-organizer add/remove, primary swap/replacement, metadata and row preservation, soft delete and edition block, organizer-delete interplay, search/filters/pagination/counts. E2E adds one flow (validation errors; create with primary + 2 co-organizers; swap primary and edit co-organizers; delete). `scripts/e2e-admin.ts` now also seeds and removes `itest-e2e-` sport, discipline and three organizers. Waits still use `networkidle` for hydration of forms; assertions are element-based.

**Lock order (reviewed).** Series mutations lock in the order series row (`FOR UPDATE`) → organizer rows (`FOR SHARE`, `ORDER BY id`). Organizer deletion takes only its own organizer row (`FOR UPDATE`) and then reads counts without locks, and never touches series rows, so there is no lock cycle; concurrent series transactions only take compatible share locks on organizers. Any future code that locks both must keep series → organizer.

**E2E flakiness risk.** `playwright.config.ts` sets a 60s per-test timeout because the first visit to each route compiles under `next dev`; one cold run after `next build` previously exceeded 30s. Form tests wait for `networkidle` before interacting (hydration). Remaining risk: a very slow cold compile or hydration could still time out; the fix would be running E2E against `next build && next start`.


## Stage 8.5 — Sport and Discipline catalog seed (complete)

Files: `prisma/seed/catalog.data.ts` (data), `prisma/seed/catalog.ts` (`seedCatalog(db)`), `scripts/seed-catalog.ts` (runner), `db:seed` in `package.json`. No schema, migration or auth changes; no other business records are touched.

**Catalog (6 sports, 13 disciplines).** Legacy `main_v1` slugs are kept for stability (`running`, `multisport`, `fitness`, `cycling` and their disciplines); swimming and OCR are new.
- Running: Road Running, Trail Running, Ultra Running
- Multisport: Triathlon, Duathlon, Aquathlon
- Cycling: Road Cycling, Mountain Biking
- Swimming: Pool Swimming, Open Water Swimming
- Obstacle Course Racing: Obstacle Course Racing (OCR)
- Fitness: CrossFit, Hyrox
Distances (5K, 10K, 21K, 42K) are not disciplines; they belong on Competition. Legacy `Discipline.metadata` was not carried over: sport-specific attributes live only in `Competition.metadata`.

**Run:** `pnpm db:seed`. It goes through `scripts/with-db-env.ts dev`, which loads `.env` and runs `assertSafeDevDatabaseUrl` (local host only, database exactly `events_dev`; rejects `events_test`, `accounting_system_*`, Supabase/pooler/remote markers, `host` query overrides). The runner re-validates and checks `current_database()` before writing. It never resets or truncates.

**Behaviour.** One transaction; sports are inserted before disciplines; rows are matched by unique `slug` using `createMany({ skipDuplicates: true })`. Existing rows are never updated (manual edits survive). A soft-deleted sport is left alone and its disciplines are skipped and reported. Output is a created/already-present summary; a rerun creates nothing.

**Adding a discipline:** append it to the matching sport in `catalog.data.ts` (new sport: add a sport entry), pick a permanent kebab-case slug, run `pnpm db:seed`. Existing rows are not renamed by the seed: rename or fix them in the database deliberately. Add a competition metadata schema (`features/competitions/metadata.ts`) only when a feature needs that discipline.

**Tests.** Unit: catalog data (unique/well-formed slugs, required fields, relationships, no distance disciplines) and dev-guard rejections. Integration (`events_test`, `itest-` fixtures with a custom catalog; the dev seed is never executed from tests): relations, idempotency, no overwrite of manual edits, soft-deleted sport handling.

**Verification.** Seed run twice on `events_dev`: first 6/13 created, second 0/0 created; `listDisciplineOptions` query returns all 13 `Sport · Discipline` options.

**Follow-up.** Aquathlon slug standardized to `aquathlon` (the `events_dev` row was renamed after confirming no EventSeries, Competition or provider referenced it). Readability conventions were added to `AGENTS.md`; the seed code got clearer names and transaction/`skipDuplicates` comments. Ultra Running is unchanged for now.


## Stage 9 — EventEdition admin CRUD (complete)

Fourth admin module. Files: `src/features/event-editions/{schemas,rules,queries,actions}.ts`, `components/{event-edition-form,event-editions-table,delete-event-edition-button}.tsx`, `README.md` (business rules, locking, testing notes), routes `app/admin/event-editions/{page,loading,new,[id]/edit}`, dashboard link. Shared: `src/shared/organizer-assignments.ts` (assignment diff, moved out of event-series; `event-series/rules.ts` re-exports it) and zoned wall-clock helpers in `src/shared/local-date.ts`. No schema, migration or auth changes. Small edits elsewhere: `deleteLocation` now takes `FOR UPDATE` on the location (pairs with the `FOR SHARE` edition writes take), and two E2E fixtures/waits (below).

**Decisions**
- *Identity:* several editions per series and year are allowed but must differ by `label` (case-insensitive, "no label" is a value); checked in the transaction under the series lock because the DB has no constraint. Slugs are derived from name + label + year, reserved by soft-deleted rows, never auto-suffixed; `P2002` → `conflict`. The series is fixed after creation.
- *Organizers:* the form pre-fills the series template; a caller omitting `primaryOrganizerId` gets the template copied server-side. After creation the edition's rows are the source of truth in both directions. Same remove → demote → promote → add diff as series, one PRIMARY, no duplicates, active organizers only.
- *Dates:* date-only and time-only strings via shared helpers; rules mirror the SQL CHECKs; TBA, multi-day, overnight (needs later `endsOn`) and postponed (`rescheduledFromOn`) supported. `year` is the edition's identity and is never compared with `startsOn` (approved rule): a 2026 edition postponed to 2027 keeps year 2026, and date changes never alter `year` or `slug`. Registration open/close are wall-clock in the edition's `timeZone` converted with Intl. Changing dates re-validates active competitions through `competitions/rules.ts`.
- *Statuses:* publication, lifecycle and registration stay independent and any combination is valid (approved rule): a published edition with registration OPEN does not need `registrationUrl`, because registration can happen via WhatsApp, Instagram, phone or in person. There are no publish gates; COMPLETED only needs a start date.
- *Delete:* soft, blocked by active competitions, providers, resources or media; assignments and slug kept; no restore.
- *Not in the form:* `metadata` (preserved), child relations.

**Lock order (reviewed).** series `FOR UPDATE` → edition `FOR UPDATE` → location `FOR SHARE` → organizers `FOR SHARE ORDER BY id`. Organizer/location deletes lock only their own row; edition delete only the edition row. Future edition children must take the edition row `FOR SHARE` and re-check `deletedAt`.

**Tests.** 29 new unit (rules, schemas, slug derivation, list params, zoned conversion) and 54 integration (`events_test`): authorization, create/TBA/multi-day/postponed, validation, same-year editions, slug conflicts incl. two simulated lost races with rollback, organizer inheritance and independence, PRIMARY swap/replace/demote, deleted refs, competition window check, soft delete and blockers, search/filters/ordering/pagination. One new E2E journey (validation, template pre-fill, edited assignments, edit round-trip, template untouched, same-year label conflict, delete). The existing series E2E test had an intermittent race (clicking Delete on a page not yet filtered/hydrated after a GET search); it now waits for the filtered URL and hydration.

**Limitations.** Series/location/organizer pickers are native selects capped at 500 rows. No restore, no bulk actions, no per-field audit. `COMPLETED` is not checked against today's date. Providers, resources and media have no admin UI yet; their delete blockers are exercised in integration tests with directly created rows.


## Stage 10 — Competition admin CRUD (complete, finalized)

Fifth admin module. Files: `src/features/competitions/{schemas,queries,actions}.ts` (new), `rules.ts` (+`deriveCompetitionSlug`) and `metadata.ts` (extended), `components/{competition-form,competitions-table,delete-competition-button,trail-running-metadata-fields}.tsx`, `README.md`, routes `app/admin/competitions/{page,loading,new,[id]/edit}`, dashboard link. Shared: `optionalLocalDate`/`optionalLocalTime`/`optionalUuid` moved from `event-editions/schemas.ts` to `src/shared/field-schemas.ts`. No schema, migration or auth changes.

**Decisions**
- *Parent edition:* chosen on create, fixed afterwards (reassigning would need two edition locks, re-scope slug uniqueness and move results); documented in the feature README.
- *Metadata:* strict per-discipline schema (all Trail Running fields optional, including `distanceKm`, so a race can be created before its course is confirmed; a given distance must be positive) (only `trail-running` so far), validated server-side by discipline slug; disciplines without a schema accept empty metadata only (stored as SQL NULL). `resolveCompetitionMetadata` preserves stored properties the schema does not manage and keeps metadata untouched when the form sends none; changing discipline with stored metadata requires an explicit `discardStoredMetadata` confirmation. The Trail Running form is an explicit component plus a text↔metadata codec (decimal commas, comma lists); no dynamic form engine.
- *Schedule:* all checks through the existing `rules.ts`, run in the transaction against the edition read after the lock. One small rule fix: an inherited end date outside the edition is no longer reported a second time under "End date" when only the start date is wrong.
- *Slugs:* unique per edition; derived from the name, never suffixed; soft-deleted slugs stay reserved; `P2002`→conflict, `P2003`→"selection no longer available".
- *Delete:* soft, blocked only by active Results (the sole table referencing a competition).
- *Search:* name, slug, edition, series, discipline and the effective location (own, or the edition's when the competition has none).

**Lock order (reviewed).** edition `FOR SHARE` → competition `FOR UPDATE` → location `FOR SHARE`. Edition update/delete keep `FOR UPDATE` on the edition (series → edition → location → organizers), so the only new edge is edition(S) → competition(X) → location(S), consistent with the existing order. Deleting a competition takes only its own row. A mutation check (removing the `FOR SHARE` clauses) makes the three concurrency tests fail. Future Result code must take the competition row `FOR SHARE`.

**Tests.** Unit: 35 new (schemas, metadata resolution and codec, rules). Integration (`events_test`): 82 new covering authorization, create/update/delete, inheritance, schedule rules, metadata (valid, invalid, empty, preservation, discipline change), slugs, rollback after a lost slug race, concurrent edition updates/deletes and location deletes, search/filters/pagination. `cleanupFixtures` now also removes results, `itest-` athletes and a `trail-running` discipline hanging off an `itest-` sport. One new E2E journey (validation, edition and discipline selection, Trail Running metadata errors then success, edit round-trip, delete); `scripts/e2e-admin.ts` seeds a fixture edition and a trail discipline and cleans them up.

**Final review.** Verified: all three actions call `denied()` first (covered by the authorization test); effective date/location inheritance (unit rules + integration); lock order edition → competition → location with the mutation check; metadata is only ever dropped by an explicit admin action (clearing a managed field, or `discardStoredMetadata` when changing discipline); soft delete keeps the row, slug and soft-deleted results. Approved correction applied: `distanceKm` is optional.

**Limitations.** Edition, discipline and location pickers are native selects (editions and locations capped at 500). Only Trail Running has a metadata form; other disciplines save without details. Unchecked "Beginner friendly" means "not set". `aidStations` appears in the legacy TypeScript interface but not in the approved Zod schema, so it is not editable (it is preserved if present). No restore, bulk actions or audit trail. The edition of a competition cannot be changed.

**Next.** Stage 11: seed and end-to-end happy path (the roadmap's "Seed & e2e happy path"), then the public read layer. Athlete/Result admin and provider/resource/media admin remain deferred.

## Stage 10.6 — Admin navigation shell (complete)

Persistent navigation for all `/admin` pages. Files: `src/features/admin-shell/navigation.ts` (config + pure helpers), `components/{admin-shell,admin-navigation-links,admin-mobile-navigation,admin-breadcrumbs}.tsx`; `app/admin/layout.tsx` keeps the session/role gate and renders `AdminShell`; dashboard reduced to a short landing page. No schema, migration, auth or CRUD changes.

**Decisions**
- *One config:* `ADMIN_NAVIGATION` (Dashboard; Events: Event Series, Event Editions, Competitions; Catalogs: Organizers, Locations) drives the sidebar, the drawer and the breadcrumbs. Adding a finished module is a one-entry change; unfinished modules are not listed.
- *Active item:* exact match for the dashboard, prefix match (`href` or `href/…`) for modules, so `new` and `[id]/edit` keep their module active. The active section label is emphasised.
- *Breadcrumbs:* derived, not declared per route: `[section >] module [> New | Edit]`. The record id is hidden; section labels are not links (no section pages exist).
- *Mobile:* the existing shadcn `Sheet` (side left) renders the same `AdminNavigationLinks`; it closes on link click, Escape returns focus to the trigger (Radix).

**Tests.** Unit: `admin-navigation.test.ts` (config, active detection, nested routes, breadcrumbs). E2E: `admin-navigation.smoke.spec.ts` (sidebar navigation without reload, active items, create-page breadcrumbs, mobile drawer and no horizontal overflow). Test infrastructure: global setup now signs in once and shares `storageState` (Better Auth limits sign-in to 5/min and the suite needed more); Playwright runs with `workers: 1` because parallel files made `next dev` reload pages mid-test; the forms spec's Edit-link locator became `exact` because the sidebar now has an "Event Editions" link.

**Limitations.** Sidebar is not collapsible; section labels are not links; breadcrumbs on a record show "Edit" without the record name.

## Stage 10.7 — Admin data entry UX (complete)

Three usability fixes found while entering real events. No schema, migration, auth or business-rule changes.

**Decisions**
- *Selector component:* one `SearchableSelect` (`src/components/searchable-select.tsx`: shadcn Popover + Command, hidden input so `FormData` forms keep working, `role="combobox"` trigger labelled by a normal `<label>`). Groups: "Current value", "Latin America", then everything else.
- *Time zone:* options come from `Intl.supportedValuesOf("timeZone")` plus a Latin American priority list (`src/shared/time-zones.ts`); Caracas first and the default for new editions. Only the IANA identifier is stored; the offset in the label is computed for display. A stored value the runtime does not list (e.g. `UTC`) is offered as "Current value", so editing never rewrites it. Schema change: `timeZone` now also rejects fixed offsets (`-04:00`), which `Intl` would otherwise accept.
- *Country:* a fixed ISO 3166-1 table (249 names, `src/shared/countries.ts`) instead of `Intl.DisplayNames`, so names cannot drift between ICU versions. The stored value stays the plain English name (`Venezuela`), identical to existing rows, so slugs, duplicate checks and filters are unchanged. The server schema still accepts any non-empty text on purpose: legacy rows (e.g. `venezuela`) must stay editable, and they are shown as "Current value" and never renamed. New locations have no default country.
- *Competitions in the edition screen:* `EditionCompetitions` renders the edition's competitions and hosts the existing `CompetitionForm` in a dialog with the edition fixed. The form, schemas, rules, metadata validation and Server Actions are the standalone feature's; `CompetitionForm` only gained `onSaved`/`onCancel` (stay on the page instead of navigating) and per-instance element ids (it now shares a page with the edition form). `DeleteCompetitionButton` gained `onDeleted`. The standalone `/admin/competitions` routes remain the cross-edition overview and still work for every competition.
- *New editions:* saving an edition no longer returns to the list; it opens the edition's edit page (`?notice=created`) so competitions can be added at once. Two separate saves, no combined transaction.

**Tests.** Unit: time zone options and validation, country table and compatibility. Integration: legacy country text survives edits and duplicates stay detected; `listEditionCompetitions` scopes to the edition, hides deleted rows, and creation from the edition screen applies the same schedule, slug and authorization rules. E2E: new journey (time zone default and search, create edition, add two competitions in the dialog, rule error in the dialog, edit, reload, standalone list shows the same rows, delete in place); the location journey now uses the country selector and the edition journeys expect the redirect to the edit page.

**Limitations.** The edition screen lists at most 200 competitions. Only the edition's competitions are edited there (no moving between editions). The country selector does not validate against the table on the server. Offsets in time zone labels reflect "now", not the event date. Editions and locations are still native selects elsewhere.

**Stage 10.7 completion (contextual help, name autofill, historical editions).**
- *Help:* helper text below non-obvious fields in the Edition, Competition, Location and Series forms, associated via `aria-describedby`, always visible (no hover-only tooltips). Edition form regrouped (General information, Status, Event schedule, Postponement, Registration and results, Organizers); registration status moved next to the registration dates. Wording only restates existing rules (edition year vs. dates, OPEN without URL, inheritance, times never inherited).
- *Name autofill:* creating an edition suggests the selected series' name through `editionNameReducer`; manual input is never overwritten, clearing does not restore it, edit pages keep the saved name. No year/label appended, slug rules unchanged.
- *Historical editions:* confirmed no query or rule depends on insertion order; listing is `year desc, startsOn desc, name, id`. Documented in the Event editions README; regression tests insert 2026, 2027, 2024, 2023, 2025. No schema change, no `editionNumber`.
- *Tests added:* 6 unit (name suggestion), 4 integration (historical editions), E2E assertions for autofill and accessible descriptions.
- *Limitation:* help text is static English; the series status hint only describes what the picker does because the schema defines no further semantics.

## Stage 11 — Photographer profiles admin (complete)

Admin CRUD at `/admin/photographers` (list with search + discipline filter + pagination, new, edit, soft delete with confirmation) on the existing `ServiceProvider` model. No schema, migration or auth changes. Details and rules: `src/features/photographers/README.md`.

**Decisions**
- *Classification:* ServiceProvider linked to `ServiceProviderType` slug `photographer`; type added to the idempotent seed (`seedProviderTypes`, run by `pnpm db:seed`). No ServiceProviderType CRUD.
- *Profile:* uses only existing columns; all contact fields optional (Instagram-only valid); disciplines via checkboxes grouped by sport and diffed in one transaction; other types, media, tags and event assignments are preserved.
- *Duplicates:* by Instagram/website/email only; same display names are allowed (auto slug gets a numeric suffix).
- *Soft delete:* blocked while the photographer has an active `EventServiceProvider` on a non-deleted edition; historical rows are kept and never block. Future assignment mutations must `FOR SHARE` the provider row. No restore.
- *Media:* external `profileImageUrl` only. `ServiceProviderMedia` portfolio editor and event galleries (`EventResource`) are deferred.
- Shared additions: `optionalEmail` (field-schemas), country-code helpers (countries), "Photographers" in the Catalogs navigation.

**Tests.** Unit: schemas and rules. Integration: authorization, create/update/delete, duplicates, discipline diff, rollback on lost slug race and on a discipline deleted mid-flight, delete blocked by active assignments and concurrent assign/delete, relationship preservation, search/filter/pagination, provider-type seed idempotency. E2E: one photographer journey; `scripts/e2e-admin.ts` seeds the provider type in `events_test` and removes `itest-e2e-` providers.

**Limitations.** Individual/studio/team is not a stored attribute. Duplicate checks have no DB constraint. Country is chosen by ISO code; no restore, bulk actions or audit trail.

**Next.** EventServiceProvider assignments (photographers per edition), then EventResource gallery links.

## Stage 12 — Event photographers (complete)

Photographers are assigned to editions from a **Photographers** section on `/admin/event-editions/[id]/edit` (no separate module). New feature `src/features/event-photographers/` (`schemas`, `rules`, `queries`, `actions`, `components/`, `README.md`) on the existing `EventServiceProvider` model. No schema, migration or auth changes; no changes to the photographers or edition actions. Rules, lifecycle and lock order: `src/features/event-photographers/README.md`.

**Model findings.** `EventServiceProvider` = a provider's appearance at an edition: `role` (`ServiceProviderRole`, this feature fixes `PHOTOGRAPHER`), `accreditation` (`OFFICIAL` / `INDEPENDENT` / `UNKNOWN`, per edition), `description`, `deletedAt`. `@@unique([eventEditionId, providerId, role])` also reserves soft-deleted rows; `@@unique([id, eventEditionId])` backs the future `EventResource` composite FK. Official/independent is therefore an attribute of the appearance, never of the profile.

**Decisions**
- *Re-adding a removed photographer restores the reserved row* (same id, new accreditation/note), following schema decision 11 ("restore rather than insert duplicates"); the id matters because galleries will reference it. No separate restore action.
- *Removal* is soft and is blocked while active `EventResource` rows use the assignment (same convention as deleting an edition with children). Moot until galleries exist; stated now so the later stage pairs it with a lock.
- *Editable fields:* accreditation and note only; the photographer, edition and role are the identity. `UNKNOWN` is shown as "Not specified" and is the default.
- *Picker:* server-side search (name or Instagram, `@` ignored) in the dialog through an admin-guarded action, 20 per page with "Show more", native radio group; already-assigned photographers are shown disabled; same names are told apart by Instagram, place and slug. No new profiles from the dialog, only a link to Photographers.
- *Help:* wording only restates what the schema defines (recorded designation per edition; the same person can be official in one edition and independent in another).
- *Lock order:* edition `FOR SHARE` → provider `FOR SHARE` → assignment `FOR UPDATE`. Edition share lock pairs with edition update/delete and is competitions' first lock; provider share lock implements the Stage 11 contract with `deletePhotographer`'s `FOR UPDATE`. No other path takes these in a different order. `P2002` → conflict, `P2003` → "no longer available".

**Tests.** Unit: 11 (schemas, search term, help text). Integration (`events_test`): 38 covering authorization of add/update/remove/search, official/independent/default creation, several photographers per edition, one photographer across editions (same series, historical), duplicates, invalid/deleted/non-photographer providers, invalid/deleted editions, other roles untouched, update and immutability, removal (other assignments, profile and edition untouched, profile deletable afterwards, blocked only by active galleries of that assignment), restore, listing, search/filter/pagination/flags, lost-race `P2002`, concurrent photographer deletion, concurrent edition deletion, update vs removal. Removing the `FOR SHARE` clauses makes four of them fail. One E2E journey (search by Instagram and name, independent + official, disabled duplicate, reload, edit, remove, other assignment and profile remain, mobile viewport); `scripts/e2e-admin.ts` seeds an edition and two photographers and removes their assignments on cleanup.

**Limitations.** No gallery links (`EventResource`), no other provider roles, no bulk assignment, no assignment history view. The edition page lists all of an edition's photographers (no cap) and the picker searches only name and Instagram. Two admins editing the same assignment get last-write-wins on accreditation/note (row-serialized, no version check).

**Next.** `EventResource` gallery links per photographer appearance (take the assignment row `FOR SHARE`), then the public read layer.
