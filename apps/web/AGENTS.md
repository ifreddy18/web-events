<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project guidelines

## Purpose and MVP scope
Sports events platform (Venezuela-focused): `EventSeries → EventEdition → Competition`, organizers, locations, and external photo-gallery links per photographer/event. MVP = an admin area to manage these, then a public read layer. Deferred: public registration, favorites, media hosting, athletes/results, SEO tooling. Do not build deferred features. Roadmap and decisions: `docs/architecture/rebuild-plan.md`; data model decisions: `docs/architecture/proposals/schema_v2_2_decisions.md`. The legacy app lives in branch `main_v1` (`git show main_v1:<path>`); do not copy it wholesale.

## Stack and tooling
Next.js 16 (App Router, `--webpack`), React 19, TypeScript strict, Prisma 6 + PostgreSQL 17, Zod 4, Tailwind 4 + shadcn, Vitest, Playwright. Package manager: **pnpm 10.34.7 via Corepack** (Node 22; see `.node-version`). Never use npm/yarn or upgrade unrelated dependencies. Keep dependencies minimal; justify each new one.

## Architecture
```
app/                     routes only: thin pages/layouts that call features
src/features/<feature>/  one folder per domain area (organizers, locations, event-series, event-editions, competitions, photographers)
  schemas.ts             Zod input validation; types via z.infer
  queries.ts             DB reads (import "server-only")
  actions.ts             "use server" mutations
  rules.ts               pure business rules, only when reusable
  components/            UI for this feature
src/shared/              cross-feature helpers (local-date, action-result)
src/server/              server-only infrastructure (db/prisma.ts; auth later)
src/components/ui/       shadcn
tests/{unit,integration,e2e,support}
```
- Create files only when needed; no empty folders, no repository/service/DTO layers. Start with single files; split a file into a folder only when it outgrows one.
- Features do not import each other's internals; share via `src/shared`.
- Use the `@/` alias (`src/`). Files are kebab-case; types/components PascalCase; functions/variables camelCase; DB enums UPPER_SNAKE as in Prisma.
- Prefer named exports, `type` imports, no `any`, no non-null `!` without a reason.

## Data and database safety
- `prisma/schema.prisma` is the approved v2.2 schema. Changing it needs a new entry in the decisions doc and a new migration; never edit an applied migration.
- Use only the singleton `src/server/db/prisma.ts`; DB code is `server-only`.
- Soft deletes: filter `deletedAt: null` everywhere, including nested relations; restore instead of re-inserting reserved slugs/URLs. Handle `P2002` for slug/URL collisions.
- Date-only values are `YYYY-MM-DD` strings and times `HH:mm` strings (`src/shared/local-date.ts`); never `toISOString()` them. Competition date/location inheritance goes through `features/competitions/rules.ts`.
- Sport-specific attributes live only in `Competition.metadata`, validated per discipline by Zod.
- **Never** run `prisma migrate reset`, truncate tables, or run tests against `events_dev`, Supabase, or `accounting_system_*`. Use the pnpm scripts (`db:migrate` = dev DB, `db:migrate:test` = test DB); they go through `scripts/with-db-env.ts` and the guard in `tests/support/db-safety.ts`.

## Authorization, validation, errors
- Every Server Action and mutating route re-checks authorization itself by calling `requireAdmin()` (`src/server/auth/session.ts`) FIRST; layouts/redirects are navigation only, not the boundary. Actions are public endpoints. `requireAdmin()` throws `AuthorizationError` (`code`: `unauthorized` | `forbidden`): in actions catch it and return `fail(e.code, e.message)`; in Route Handlers map to 401/403.
- Auth is Better Auth (email + password, admin plugin, `role: "admin"`), no public sign-up, no OAuth. Never write custom session/password code, never enable sign-up; create admins only with `pnpm auth:create-admin`. Deactivate admins with the admin plugin `banned` flag.
- Validate all external input with Zod on the server, then apply business rules, then write (in a transaction when several rows change).
- Expected failures (validation, unauthorized, not found, conflict) return `ActionResult` from `src/shared/action-result.ts`; unexpected errors are thrown, not swallowed. Never leak raw DB errors to the client.

## Testing
- Unit tests (`tests/unit`, `pnpm test:unit`): pure rules, schemas, helpers; no DB.
- Integration tests (`tests/integration`, `pnpm test:integration`): real `events_test` only, `itest-` prefixed fixtures, prefix-scoped cleanup, serial.
- E2E (`tests/e2e`, `pnpm test:e2e`): a few critical flows only.
- Business rules and constraints get tests before the UI that uses them.

## Definition of Done
A feature is done when: input is validated by Zod; authorization is enforced server-side; expected errors return `ActionResult`; soft-delete and uniqueness cases are handled; unit tests cover rules and integration tests cover DB behavior; `pnpm typecheck`, `pnpm lint`, `pnpm test` pass; no unrelated files changed; docs updated if conventions or decisions changed.

## Readability and maintainability
A human must be able to understand, maintain and extend this code without AI help; this is a quality requirement.
- Use descriptive names for variables, functions, parameters, types and interfaces. No unnecessary abbreviations or generic names (`data`, `item`, `tmp`, `s`); use domain terms (Sport, Discipline, EventSeries, Competition) consistently.
- Prefer explicit, readable logic over clever one-liners. Keep functions focused and reasonably small.
- JSDoc for complex business rules, reusable public utilities and non-obvious behavior. Explain *why* (business constraint, architectural decision), not what the code already says; no comments that repeat the code.
- Document transaction boundaries, concurrency considerations and lock ordering where they apply.
- Test names describe the expected behavior (`"rejects a duplicate slug within the same discipline"`).
- Feature documentation: simple features need none. A complex feature gets a concise `README.md` in its folder covering purpose and responsibilities, key business rules, relationships and dependencies, non-obvious decisions, and testing notes. Do not create READMEs unnecessarily.

## Documentation
Keep this file short and current. Record a stage's outcome in `docs/architecture/rebuild-plan.md`; record schema decisions only in the decisions doc. Do not duplicate content between docs, and do not commit unless asked.
