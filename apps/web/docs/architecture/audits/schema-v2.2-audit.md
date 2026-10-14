# Schema v2.2 Final Architecture and Validation Audit

**Verdict: READY WITH MINOR CHANGES.** The schema passes official Prisma validation, its generated DDL and companion SQL apply cleanly to PostgreSQL 17, and the integrity rules behave as documented in 25 behavioral tests. No CRITICAL or HIGH defects were found. Two MEDIUM items are about specifying date inheritance and its validation, not the schema structure.

**Audited files** (`apps/web/docs/architecture/proposals/`)
- `schema_v2_2.prisma` (referred to as `P`, 700 lines)
- `schema_v2_2_decisions.md` (referred to as `D`)
- `schema_v2_2_constraints.sql` (referred to as `SQL`)

**Scope:** evaluated as a new database design for a clean rebuild. Migration paths, backfills, existing CRUD compatibility and seed compatibility were deliberately excluded. Earlier v2 and v2.1 audits were used only to check which open items remain.

---

## 1. Executive Summary

- The v2.1 confirmed defect (E1, `MediaUsageType` removed while seeds import it) is **fixed**: the enum is restored for `ServiceProviderMedia.type` (P:95–106, 528) and matches decision 10.
- v2.1 items fixed: registration date-order CHECK, competition times no longer require their own date, `Athlete.birthDate` is now `@db.Date` (P:379), the unused `Status` enum is gone, and redundant indexes are removed. A catalog query found **no remaining prefix-redundant indexes**.
- Drift worry from v2.1 (issue 11) is **resolved for `prisma migrate diff`**: against a database built from the generated DDL plus `SQL`, the diff to `P` is empty. The partial unique indexes and CHECK constraints do not produce drift.
- Remaining findings are all MEDIUM or LOW. The most important are an ambiguous competition end-date inheritance rule (M1) and cross-table date rules that the database cannot enforce (M2).
- `D` still says the schema was "not formally validated" (`D:70`). That is now outdated.

---

## 2. Official Prisma Validation Results

| Check | Result |
|---|---|
| Environment | Dependencies installed from `apps/web/pnpm-lock.yaml` with `corepack pnpm@10 install --frozen-lockfile --ignore-scripts`. Prisma **6.19.3**. No version or lockfile change (`git status`: only `apps/web/docs/` untracked). |
| `prisma validate --schema …/schema_v2_2.prisma` | **PASS**: "The schema is valid". No errors. |
| Composite FK with shared scalar (`P:358`) | **PASS** in validate. The earlier "unverified" item is closed. |
| `prisma migrate diff --from-empty --to-schema-datamodel` | **PASS**: 846 lines of DDL generated. |
| DDL + `SQL` applied to a throwaway local PostgreSQL 17.11 cluster (in the scratchpad, port 54329, not the project DB, not Supabase) | **PASS**: both applied with `ON_ERROR_STOP`, no errors. 16 CHECK constraints present. |
| `prisma migrate diff` from that database to `P` | **Empty migration**: no drift from the partial indexes or CHECKs. |
| Behavioral tests | 25 scenarios, all matched expectations (section 6). The throwaway cluster was stopped afterwards. |

Not modified: the schema, SQL files, any other project file. Only `apps/web/node_modules` was created (git-ignored). The proposal files were validated in place, and `prisma format` was not run, so they are unchanged.

**Tooling note (LOW, unrelated to the schema):** `package.json#prisma` is deprecated and overridden by `prisma.config.ts` (Prisma 7 warning). Migrate the seed config when convenient.

### Still unverified (needs generated client and/or an application)
1. Prisma Client behavior for the shared-scalar composite relation: nested `connect` on both `eventEdition` and `eventServiceProvider` is expected not to work, and the scalar-ID (unchecked) write form is expected to. `P:496` and `D:13` already say to prefer scalar IDs. The database-level FK itself is verified.
2. `prisma migrate dev` shadow-database workflow and repeated `migrate deploy` with `SQL` merged into the initial migration. The `migrate diff` result is only strong evidence.
3. `DATE` serialization and display in `America/Caracas` without UTC shifts (application layer).
4. Zod validation of `Competition.metadata` per discipline (application layer).
5. Performance of the indexes under realistic data volume.

---

## 3. Confirmed Schema Errors

**None.** No syntax, relation, referential action, default, enum or mapping error was found. Every relation has its opposite side, `@@map`/`@map` names match the SQL file, and the generated FKs are:
- Required relations: `ON DELETE RESTRICT ON UPDATE CASCADE`.
- Optional `locationId` on editions and competitions: `ON DELETE SET NULL` (see L4).
- `event_resources` composite FK: `ON DELETE RESTRICT ON UPDATE CASCADE`.

---

## 4. Data Integrity Issues

### M1. Competition effective end-date rule is ambiguous (MEDIUM, confirmed documentation defect)
- **Evidence:** `D:10` defines the effective end date as `Competition.endsOn ?? Competition.startsOn ?? EventEdition.endsOn ?? EventEdition.startsOn`. `P:315–317` and `SQL:36–38` describe inheritance only of the start date or "calendar date". `SQL:48–55` allows `start_time`/`end_time` with no own dates.
- **Explanation:** a competition that sets only times (e.g. 10K, 08:00–10:00) on a 3-day edition resolves to *start = edition start, end = edition end*, i.e. spanning the whole edition. That is almost certainly not the intent, and the same-day time-order check is silently skipped for it (test T16).
- **Recommendation:** define one rule in `D`. Suggested: effective start = `comp.startsOn ?? edition.startsOn`; effective end = `comp.endsOn ?? effective start`. A competition spanning the whole edition must set `endsOn` explicitly. Then apply the same-day time order check to the effective dates in the shared server validator.

### M2. Cross-table date integrity is not enforced by the database (MEDIUM, confirmed gap, accepted by design)
- **Evidence (behavioral tests):** the database accepted a competition dated outside its edition window (T15), a competition with `end_time < start_time` and no own dates (T16), and a competition with `ends_on` but no `starts_on` (T17). `D:10` and `SQL:36–38` state these are server-side rules.
- **Explanation:** the design is consistent and the single-table checks work, but all of the inheritance rules depend on one shared validator.
- **Recommendation:** implement one effective-date function used by create/update validation, display and queries, and cover T15–T17 in tests. Do not add triggers for the MVP.

### L1. Soft delete leaves orphaned active references (LOW, design, documented)
- **Evidence:** `D:17` states `onDelete` applies to hard deletes only. Assignment tables (`EventSeriesOrganizer`, `EventEditionOrganizer`) have no `deletedAt`, while `Organizer` does (P:181). `EventResource` rows can point to a soft-deleted `EventServiceProvider` (P:358, 505).
- **Recommendation:** keep the documented nested `deletedAt: null` filters, and when soft-deleting an appearance or organizer decide whether dependents are hidden or blocked.

### L2. `year` can disagree with `starts_on`; `timeZone` accepts invalid values (LOW, confirmed)
- **Evidence:** test T24 accepted `time_zone='Mars/Olympus'` and `year=1999` with a 2026 date. `P:250, 260`.
- **Recommendation:** validate in Zod (IANA zone list, `year` equals `starts_on` year when known). A CHECK for `year` is optional and should allow TBA.

### L3. Media foreign keys without a supporting index (LOW, confirmed)
- **Evidence:** catalog query: `media_id` FKs on `service_provider_media`, `event_series_media`, `event_edition_media`, `athlete_media`, `organizer_media` have no leading index.
- **Explanation:** only matters for "where is this media used" lookups or hard-deleting a `Media` row. Negligible for the MVP.

### L4. Location FK action is `SET NULL`, unlike all other relations (LOW, design preference)
- **Evidence:** `P:272, 328` optional relations use Prisma's default; the catalog shows `confdeltype = 'n'`.
- **Explanation:** a hard delete of a `Location` would silently null the location of editions and competitions. Locations are soft-deleted in practice.
- **Recommendation:** add explicit `onDelete: Restrict` for consistency if hard deletes are ever possible.

### L5. Competition location inheritance is undocumented (LOW)
- **Evidence:** `D` documents date inheritance only (`D:10`). `Competition.locationId` is optional (P:307).
- **Recommendation:** state that effective location = `competition.locationId ?? edition.locationId`, and that city/venue discovery must search both.

### L6. Visibility gating exists only on `EventEdition` (LOW, design preference)
- **Evidence:** `publicationStatus` is on `EventEdition` only. `EventSeries.status` is ACTIVE/ARCHIVED/CANCELLED, with no draft state.
- **Explanation:** a new series cannot be hidden before publication except through its editions. Acceptable if the public site lists only published editions.

### L7. Athlete identity relies on fixed IDs (LOW, accepted by `D:15`)
- **Evidence:** `Athlete.fullName` is non-unique (P:376, 389) and the model has no external key.
- **Explanation:** fine for the MVP with fixture UUIDs. Imported real data will need a source-specific key later. `Result` uniqueness on `(competitionId, athleteId)` is correct.

### L8. Polymorphic `Favorite` and `SeoMeta` have no FK to their targets (LOW, deferred by `D:19`)
- **Evidence:** `P:665–689`.
- **Explanation:** cannot cascade or guarantee existence. Unused in the MVP.

### L9. Media `type` is an enum in one junction and a free `String` in the others (LOW, design decision 10)
- **Evidence:** `P:528` vs `type String @default("gallery")` in the other four junctions.
- **Explanation:** intentional and documented, but inconsistent. Revisit when media features are built.

---

## 5. Business Requirements Coverage

| Requirement | Supported | Evidence |
|---|---|---|
| Multiple editions of one series in the same year | Yes (verified T1) | No unique on `(eventSeriesId, year)` (P:282–283); `label` and global unique `slug` (P:253). Admin must disambiguate slugs. |
| Multiple organizers per series and edition | Yes (verified T3/T4) | Join tables with `@@unique([parent, organizerId])` and partial unique PRIMARY indexes. |
| Organizer changes between editions | Yes | Edition assignments are the sole source of truth (`D:6`). |
| Multi-day events | Yes (T7) | `startsOn`/`endsOn` `DATE`, overnight needs explicit `endsOn`. |
| Competitions with own or inherited dates | Yes, with rule gap (M1, M2) | `P:315–321`; `SQL:36–55`. |
| Competitive and recreational | Yes | `ParticipationType` on `Competition`. |
| Postponed, cancelled, completed | Yes | `EventEditionStatus`, `rescheduledFromOn`, separate `publicationStatus` and `registrationStatus`. |
| Discovery by organizer, location, city, sport, discipline, date | Yes | Indexes: organizer reverse lookups, `Location` (country/state/city), `[locationId, startsOn]`, `[publicationStatus, startsOn]`, `Discipline.sportId`, `EventSeries.disciplineId`, `Competition.disciplineId`/`locationId`. City search is case-sensitive without an expression index (see section 7). |
| Athlete profiles and historical results | Yes | `Athlete`, `Result` with unique `(competitionId, athleteId)`. |
| Official and independent photographers | Yes (T23) | `EventServiceProvider.accreditation` per edition appearance; one provider/role per edition. |
| Bidirectional event–photographer relationship | Yes | `EventEdition.eventServiceProviders` and `ServiceProvider.eventAssignments`. |
| Multiple galleries per photographer and event | Yes (T19) | `EventResource` N:1 to the appearance. |
| Galleries without an identified photographer | Yes (T18) | Nullable `eventServiceProviderId` (MATCH SIMPLE). |
| Same-edition integrity of attribution | Yes (T20, T22) | Composite FK `(eventServiceProviderId, eventEditionId)` rejects another edition's appearance. |
| No duplicate URL per edition; reuse across editions | Yes (T21) | `@@unique([eventEditionId, url])`. |
| External hosting, no local gallery storage | Yes | `EventResource` stores links only. |
| Discipline-specific metrics in metadata | Yes | No distance or elevation columns; `Competition.metadata` JSONB (P:325). |
| No duplicate sources of truth | Mostly | Registration/results URLs are canonical on the edition; resources hold only supplements (`D:14`). Dates are single-sourced. |

---

## 6. SQL Constraints Review (`schema_v2_2_constraints.sql`)

**PostgreSQL compatibility: confirmed.** Applied cleanly on PostgreSQL 17.11 after the Prisma-generated DDL. Table and column names match the `@@map`/`@map` values. The partial unique indexes compare an enum column with a literal and the comma-chained `ALTER TABLE … ADD CONSTRAINT` statements are valid.

**Consistency with `P` and `D`: consistent**, apart from M1.

| Test | Expectation | Result |
|---|---|---|
| T3 second PRIMARY on one edition | reject | Rejected (`event_edition_organizers_one_primary`) |
| T4 demote old PRIMARY then promote another in one transaction | accept | Accepted |
| T5 edition `start_time` with no `starts_on` | reject | Rejected |
| T6 `ends_on < starts_on` | reject | Rejected |
| T7 overnight multi-day with `end_time < start_time` | accept | Accepted |
| T8 same-day `end_time < start_time`, no `ends_on` | reject | Rejected |
| T9 `24:00` and `9:5` | reject | Both rejected |
| T10 registration close before open | reject | Rejected |
| T11 valid same-day times | accept | Accepted |
| T12 competition `start_time` only (inherits date) | accept | Accepted |
| T13 competition `ends_on < starts_on` | reject | Rejected |
| T14 competition same-day `end_time < start_time` | reject | Rejected |
| T15–T17 cross-table cases (outside window, inherited inversion, `ends_on` without `starts_on`) | DB cannot catch | Accepted (expected gap, M2) |
| T18–T23 resources, FK and uniqueness cases | as documented | All as expected |
| T24 invalid time zone and year mismatch | no DB rule | Accepted (L2) |

Observations:
- The PRIMARY indexes are not deferrable, as `SQL:6–8` correctly warns. A PRIMARY swap must demote before promoting (T4 passes in that order).
- "Exactly one PRIMARY when nonempty" is not database-enforced, as documented (`D:30`).
- The lexicographic comparison of zero-padded `HH:mm` strings is correct because the format CHECK guarantees padding.
- Prisma generates UUID defaults client-side, so raw SQL inserts (seeds, scripts, tests) must supply `id` and `updated_at`.

---

## 7. Architectural Improvements (only where justified)

None are required for the schema structure. Justified optional items:
1. **Case-insensitive city search.** `Location.city` is plain text with a plain index. If city search must be case-insensitive at scale, add a normalized column or an expression index later (`D` item 10 of v2.1 already anticipates this). Not an MVP blocker.
2. Defer everything else (JSON expression indexes, `year` CHECK, `Media` FK indexes) until a real need appears.

No tables should be added or removed.

---

## 8. Recommended Corrections

1. **(MEDIUM, M1)** Rewrite `D:10` and the `P:315–317` comment with the single start/end inheritance rule, and align `SQL:36–55` comments.
2. **(MEDIUM, M2)** Plan one shared effective-date validator and tests for T15–T17.
3. **(LOW)** Update `D:70` ("Validation status at delivery") to record that validation and the SQL tests now pass, and add the L5 location inheritance statement.
4. **(LOW)** Optionally add `onDelete: Restrict` to the two optional `locationId` relations (L4).
5. **(LOW)** Validate `timeZone` and `year` in Zod (L2).
6. Complete the remaining unverified checks in the application environment (section 2) before the first public deployment.

---

## 9. Final Verdict

**READY WITH MINOR CHANGES.**

Official validation passes, the generated DDL and companion constraints apply cleanly on PostgreSQL, the integrity rules and composite FK work in the database, and every listed business requirement is supported without unnecessary tables. Remaining work is limited to clarifying the competition date inheritance rule (M1), committing to server-side validation of cross-table date rules (M2), and minor documentation and hygiene items.

---

## 10. Resolution Addendum

Documentation-only follow-up (commit `docs: finalize Prisma v2.2 architecture`). No models, fields, relations, indexes, enums or SQL behavior changed.

- **M1 resolved (documentation):** effective start date = `competition.startsOn ?? edition.startsOn`; effective end date = `competition.endsOn ?? effectiveStartDate`; multi-day competitions must set `endsOn` explicitly. Recorded in `schema_v2_2_decisions.md` (item 4), `schema_v2_2.prisma` and `schema_v2_2_constraints.sql` comments.
- **M2 documented:** shared server-side validation requirements (edition boundaries, end not before start, same-day time order, resolvable effective date, inheritance tests) are listed in decision 4. Implementation remains **pending**.
- **L5 resolved:** effective location = `competition.locationId ?? edition.locationId`.
- **Validation status** in the decisions file now records the passed checks and the pending application-level validation.
- Final verdict is unchanged: **READY WITH MINOR CHANGES**. The remaining items are implementation tasks.
