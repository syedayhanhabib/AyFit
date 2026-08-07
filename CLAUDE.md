# AyFit — Project Foundation

## Current state
_Last updated: 2026-08-07_

**Keep this section under ~150 lines.** It answers "where am I," nothing
else. A durable lesson goes to Build conventions; a design decision goes to
DESIGN.md; history goes nowhere, because git has it. When this section
starts narrating how something was built rather than what is true now, cut
it. It reached 530 lines once and stopped being usable. Open items is the
part that legitimately grows and shrinks; everything above it should stay
roughly the size it is now.

### Status

Track, Summary, Calendar and Profile are all built and reading from
Supabase. Profile was the last unbuilt screen; it completed at `03298dd`.

**Track and Summary are still being dogfooded** on the Pixel 7 EAS build.
Issues have surfaced in Track and, less so, Summary, but the list isn't
final. Don't preemptively guess at or fix anything there.

Next action is an EAS build carrying Profile, then a device pass.

### Active guardrail

While dogfooding continues, do not modify: `exercises-repo.ts`,
`exercise-favourite-repo.ts`, `workout-set-repo.ts`, `summary-repo.ts`,
`exercise-list-grouping.ts`, anything under `src/app/category/` or
`src/app/exercise/`, Summary's card components, the shape of any existing
table in `schema.sql`, or `src/components/track/wheel-picker-modal.tsx` and
`value-chip.tsx` (the guardrailed logging screen consumes both).

Reading and importing any of these is fine. New read-only repo files, new
strictly-additive tables, and new components elsewhere are fine. Editing
what already exists is not, until dogfooding concludes.

This guardrail is Ayhan's own — he can move it. Its purpose is to keep the
surface under test from shifting mid-test.

### What's built

**Track** — muscle → exercise → set, freestyle, no templates. A muscle
picker sits between category tiles and the exercise list, shown only when a
category has more than one muscle. 189-exercise catalogue, explicit
favourites, Back's `movement_group` section labels. Per-set logging via
tappable `ValueChip` + `WheelPickerModal` wheels. v3 dark palette, glossary
InfoTips. Writes persist to Supabase; reopening an exercise mid-session
reads back today's sets.

**Summary** — all four cards wired to live computed data: Consistency,
Volume by muscle, Progression (e1RM line, exercise chips, range toggle),
Recent PRs. Nothing is stored precomputed; e1RM, volume and PRs are derived
on every read, so a deleted set can never leave a stale value behind.

**Calendar** — month grid with trained-day dots, `/day/[date]` detail with
session blocks and continuous per-exercise set numbering. Device-verified;
the 5c checklist and its resolution are recorded in `7c5cdcb`.

**Profile — "The Ledger"** (see DESIGN.md's Profile — Phase 4). A flowing
document, not cards: header with wordmark + identity line, then bodyweight,
BMI, relative strength, caloric maintenance, and a collapsed Details
section. Four sections; the three that derive from an input gate when that
input is missing, bodyweight never does because it IS the input. Utils are
covered by `scripts/verify-profile-utils.ts` — 104 assertions against the
real shipped files, including the live values.

### What's next

1. **EAS build** carrying Profile, then the device pass below.
2. **Track/Summary fix list** — compile from dogfooding, then fix.
3. **Offline support.** Writes currently fail outright with no
   connectivity. Must land before auth, so every write path only grows a
   queue/sync story once.
4. **Auth + RLS.** `user_id` columns exist and are nullable; `session`
   still needs the column added.
5. **Final EAS build**, then the APK goes to training partners.

Deferred, not scoped: Track's live PR gold-flash at set-insert time.

### Open items

**Profile device pass** (nothing here is browser-answerable):
- BMI marker (16px tall, `top: -4`) on an 8px track with `borderRadius: 4`
  relies on `overflow: 'visible'` — some Android RN versions clip against a
  rounded parent, which would render it as a stub.
- BMI marker and off-scale chevron may collide at BMI under 15 or over 40.
- "2500 kcal" measures 280.8px in a 331.2px container — the longest hero
  number, so first to break under Android font-size scaling.
- Cold-start reflow: four independent fetch chains resolve separately, so
  sections pop in and push later ones down.
- Exercise names truncate tail-first in relative strength, and the naming
  grammar puts the movement at the tail.
- Wordmark at 16 on Profile against Track's 30 / Summary's 26.
- Two-wheel 0.1kg picker scroll feel; whether the soft keyboard covers
  Details' Save button; fonts generally.
- `InfoTip`'s BMI paragraph has no internal scroll or max-height — fine at
  375×812, may overflow a shorter viewport.
- EXPECTED, NOT A BUG: caloric maintenance reads low. The 4-week window
  holds 4 trained dates all inside one week, so the average is 1 trained
  day/week and the multiplier bands to 1.375. That is `activity-repo.ts`'s
  documented understating characteristic, and the derivation line under the
  number states it. Do not "correct" the band.

**Unverified against real data:**
- `bodyweight_log` has only one row, so two things have never rendered
  their real values: the "Today" row label, and a non-dash figure in the
  recent list's change column. Both need a second weigh-in on a different
  date.
- Calendar's return-to-an-exercise-later block split and its numbering
  continuation. Needs a real session that doubles back on a lift.
- Commit 3's two checks: never-logged exercises still rendering as rows,
  and a trailing warm-up not displacing a working set in a subtitle.
- Whether a workout crossing local midnight produces two session rows on
  two dates (`getOrCreateTodaySession` keys off `todayLocalDate()`).

**For the offline phase** — it sets one app-wide stale-data policy, and
there are now four sites carrying that policy locally, not two: Calendar's
refetch-failure banner, Profile's four independent fetch chains, Profile's
weigh-in write (a successful write followed by a failed refetch takes the
success branch and leaves stale weight on screen), and the logging screen's
"Exercise not found" on a fetch failure. Also deferred here:
`workout_set.created_at` moving to client-side capture time.

**Parking lot** — cheap, do whenever:
- `session-repo.ts`'s `todayLocalDate()` onto `src/utils/local-date.ts`
  (`summary-repo.ts`'s copies stay parked; guardrailed).
- `day/[date].tsx` narrowing on `workingSetNumber === undefined` rather
  than on `isWarmup`, which the type system doesn't correlate.
- `weight-picker-modal.tsx` and `wheel-picker-modal.tsx` share snap-scroll
  logic; consolidate when the guardrail lifts.
- `range()` exists in both `profile.tsx` and `[exerciseId].tsx`;
  `sectionLabel` is near-duplicated in `profile.tsx` and
  `gated-section.tsx`. Both need a guardrailed file to fix properly.
- No way to DISCARD a dirty Profile draft, only to save it.
- Relative strength sorts descending by e1RM, which equals descending by
  ratio only while the denominator is constant. When per-row bodyweight
  lands, sort by the displayed value.
- `month-grid.ts`'s `new Date(y, m, d)` can roll back a day where DST
  transitions at midnight. Doesn't apply in Pakistan; recorded so it isn't
  rediscovered as a mystery elsewhere.

**AyFit** — a personal-first progressive overload tracker, built by Ayhan.
A gym app for logging workouts and measuring progressive overload.
Built freestyle-first: you create each workout on the fly, no fixed templates.

## Stack

- **Frontend:** Expo (React Native), TypeScript
- **Backend:** Supabase (Postgres + auth + storage), free tier
- **Distribution:** APK via EAS Build, shared directly (e.g. WhatsApp). No Play Store for v1.

## Core principle

The atomic unit is: **muscle → exercise → set.**
Everything else (day views, summaries, nav tiles) is just a different filter or
calculation over that same data. One source of truth.

## Data model

### muscle
- `id`
- `name` — e.g. chest, back, biceps, triceps, quads, hamstrings, front delt, side delt, rear delt
- `nav_category` — one of: Chest, Back, Arms, Legs, Shoulders (used for front-page tiles)
- `display_order` — integer, anatomical ordering **within** a nav_category, so the
  numbers repeat across categories (every category starts at 1). Legs reads
  quads → hamstrings → glutes → calves rather than alphabetically. Defaults to 0,
  and the app orders by `display_order` then `name`, so an unseeded database still
  falls back to the old alphabetical behaviour instead of an arbitrary one.

Note: `nav_category` groups muscles for browsing (Arms = biceps + triceps). We deliberately
dropped a fixed push/pull/legs tag — training is freestyle, so a "day type" is at most an
optional label the user adds later, never something the app enforces.

### exercise
- `id`
- `name` — e.g. Flat barbell bench press, Incline dumbbell press, Wide-grip lat pulldown.
  **GLOBALLY unique**, deliberately not unique-per-muscle. One movement gets exactly
  one row and exactly one home muscle, so its e1RM line and PR history can never
  fragment across duplicate rows. Consequence: if a lift feels like it belongs to two
  muscles, pick one — close-grip bench is filed under triceps; conventional and sumo
  deadlifts under back > lower back, while the RDL family sits under hamstrings.
- `muscle_id` — primary muscle worked
- `movement_group` — nullable text, populated for **back only**; NULL for every other
  muscle. Four permitted values, enforced by a named CHECK constraint
  (`exercise_movement_group_check`): `vertical pull`, `horizontal pull`, `traps`,
  `lower back`. Drives section labels on the exercise list. The *display* order of
  those four is a client-side constant — not alphabetical, and not stored here.
- ~~surfacing: when the user picks a muscle, show **most-recent / most-used exercises
  first** (this is the feature that makes logging "bench again" two taps instead of
  scrolling)~~ Superseded by **explicit favourites**, stored in `exercise_favourite`
  below. Implicit recency has a failure mode: a cable variation tried once floats to
  the top and displaces a staple. Frequency ranking avoids that but is both slower to
  react and impossible to reason about at a glance. Explicit favourites are
  predictable, under the user's control, and less code. **Two sections only —
  Favourites, then A–Z. No third "recents" section.**

### exercise_favourite
Explicit stars, replacing the implicit recency/frequency surfacing struck out above.
- `id`
- `user_id` — nullable, and **no FK**: auth doesn't exist yet, so there's no users
  table to point at. NULL for the single-user case. The column exists from day one,
  so it's correct after auth lands without a migration. Note this is the **first
  table to actually ship that column** — `session` only carries a comment
  *reserving* the idea ("user_id will be added here when auth/multi-user lands"),
  not the column itself, so `session` will still need a migration.
- `exercise_id` — `on delete cascade`. Correct *here* specifically because a favourite
  carries no history, so losing it with the exercise loses nothing. That is the
  opposite of `workout_set.exercise_id`, which stays deliberately restrictive so
  logged history can never be silently orphaned.
- `created_at`

Uniqueness needs **two** guards, not one: a `unique (user_id, exercise_id)` plus a
partial unique index on `(exercise_id) where user_id is null`. See Build conventions
for why the first alone constrains nothing while `user_id` is nullable.

### session
- `id`
- `date`
- (later) optional label, notes

### set
(The real table is **`workout_set`** — renamed because `set` is a reserved word in
SQL. This heading is the conceptual entity name; every reference in code, queries
and `schema.sql` is `workout_set`.)
- `id`
- `session_id`
- `exercise_id`
- `weight_kg` — load in kilograms
- `reps`
- `rpe` — rate of perceived exertion (1–10)
- `is_warmup` — manual toggle; warm-up sets are EXCLUDED from progression + volume math
- `created_at` — `timestamptz not null default now()`. Present in `schema.sql` since
  the table was created, but was missing from this doc — which nearly caused an
  unnecessary migration to be designed in the step 5a planning session. Load-bearing
  as Calendar's performed-order source (`session-blocks.ts` sorts by `created_at`
  then `id`).

### profile
Scalars only. Deliberately does NOT hold current bodyweight — see
`bodyweight_log`.
- `id` — uuid, `gen_random_uuid()`
- `user_id` — nullable, no FK (no users table yet), same as
  `exercise_favourite.user_id`
- `name` — nullable text. Becomes a mirror of the auth user record once auth
  lands, not the source of truth.
- `date_of_birth` — nullable date. Age is computed, never stored. No CHECK
  against `current_date`: that needs a non-immutable function inside a CHECK,
  which makes the constraint non-deterministic across dump/restore, so age
  validation lives in the app layer where the under-18 BMI case has to be
  handled anyway.
- `sex` — nullable text, CHECK `is null or in ('male','female')`
- `height_cm` — nullable `numeric(4,1)`, CHECK `is null or > 0`
- `goal_weight_kg` — nullable `numeric(6,2)`, CHECK `is null or > 0`
- `created_at` — `timestamptz not null default now()`
- Deliberately NO `updated_at` — nothing consumes it.

Uniqueness needs two guards: `unique (user_id)` plus a partial unique index
`profile_singleton_anon_idx` on `((user_id is null)) where user_id is null`.
The expression evaluates to `true` for every matching row, so a unique index
over it caps the table at one anon profile. Verified live: the second insert
fails with `Key ((user_id IS NULL))=(t) already exists`. Same `.upsert()`
unusability and read-then-insert-or-update write path as `bodyweight_log` —
see that section's note.

### bodyweight_log
A time series, not a column on `profile` — so history can never be
overwritten, which is what makes a bodyweight-over-time chart and
relative-strength math possible. Same computed-live philosophy as e1RM,
Volume and PRs: no stored current-weight value that can go stale.
- `id` — uuid, `gen_random_uuid()`
- `user_id` — nullable, no FK
- `date` — `date not null`. A LOCAL date, written via `todayLocalDate()`,
  never derived from a `timestamptz`'s UTC representation.
- `weight_kg` — `numeric(6,2) not null`, CHECK `> 0`. Same type as
  `workout_set.weight_kg` deliberately, so bodyweight and lifted weight can
  never differ by a rounding behaviour.
- `created_at` — `timestamptz not null default now()`

One canonical weigh-in per date. `.upsert()` is UNUSABLE here — the write
path is read-then-insert-or-update, for two independent reasons. First, the
real guard is a PARTIAL unique index, and Postgres cannot infer a partial
index for `ON CONFLICT`, because an INSERT carries no `WHERE` clause to match
against the index predicate. Second, even setting that aside, `onConflict`
on a nullable `user_id` won't match a row where `user_id IS NULL`, since
NULLs are distinct in a unique index. This inverts once auth lands and
`user_id` stops being nullable. Uniqueness again needs two guards:
`unique (user_id, date)` plus a partial unique index
`bodyweight_log_date_anon_idx` on `(date) where user_id is null`. Verified
live: the second same-date insert fails.

Both tables' constraints are ANONYMOUS in `schema.sql`, matching the file's
existing style (`workout_set.weight_kg`'s bare `check`,
`exercise_favourite`'s bare `unique`). Postgres auto-generates
`profile_sex_check`, `profile_user_id_key`,
`bodyweight_log_user_id_date_key` etc. — confirmed identical against
`pg_constraint` on the live dev DB, so explicit names bought nothing.
`exercise_movement_group_check` stays named because it is added via `ALTER`
inside a `DO`-block guard, which requires a name to filter on.

## Derived metrics (not stored — computed)

### Estimated 1RM (e1RM) — the progression metric
Formula (Epley): `e1RM = weight_kg * (1 + reps / 30)`
- Computed per working set; per session, take the **best working set's e1RM**.
- This is the primary "am I getting stronger" line, charted per *exercise* over time.
- Honest caveat: most accurate at <=10 reps, less precise for isolation moves.
  Trust the trend, not the exact number. Display as a smoothed line, not precision data.

### Volume — the "am I doing enough" metric
`volume = sum(weight_kg * reps)` across working sets.
- Charted per *muscle* per week (set count or tonnage).
- Justified by research: rep/volume progression drives hypertrophy comparably to load.

### PR detection
- App recomputes e1RM every set and remembers the best per exercise.
- A new best auto-surfaces as a PR card. No manual PR tagging.

## Screens (bottom tab nav)

### Track (build first)
The core loop. Everything else is useless without it.
`Pick muscle → pick exercise (recents float to top) → per set:
 weight (kg) x reps @ RPE, added as you go → save`

### Summary
Glanceable, top to bottom in priority order:
1. **Consistency** — sessions this week, streak
2. **Recent PRs** — auto-detected, e1RM-based
3. **Progression** — per-exercise e1RM line, with an exercise picker and a
   time-range toggle (week / month / all-time)
4. **Volume by muscle** — weekly set count per muscle

### Calendar (later)
Workout history by date. Tap a day, see what was logged.

### Profile (later, minimal)
Name, and bodyweight tracking ONLY if something consumes it
(e.g. bodyweight-over-time chart, or relative-strength math). Don't store unused data.
Now specced in full in DESIGN.md's "Profile — Phase 4" section, where the
"only if something consumes it" rule above is applied field by field.

## Cross-cutting feature: info tooltips / glossary

Anywhere a scientific or jargon term appears (RPE, e1RM, progressive overload, volume,
warm-up set), show a small tappable info icon. Tapping it opens a short plain-language
explainer. Makes the app usable by non-experts and teaches as you go.

Implementation: a single glossary map (term -> short description), and a reusable
"InfoTip" component that takes a term key. Add terms as they appear in the UI.

Starter glossary content:
- RPE — "Rate of Perceived Exertion. A 1-10 scale of how hard a set felt. ~10 = couldn't
  do another rep; lower numbers = more left in the tank."
- e1RM — "Estimated one-rep max. The weight you could theoretically lift once, calculated
  from the weight and reps you actually did. Used to track strength across different rep ranges."
- Progressive overload — "Gradually doing more over time (more weight, more reps, or more
  sets) so your muscles keep adapting. The core driver of progress."
- Volume — "Total work done, roughly weight x reps x sets. A key driver of muscle growth."
- Warm-up set — "Lighter preparatory sets done before your real working sets. Logged for
  completeness, but excluded from progress tracking (e1RM, volume, PRs) so easy sets don't
  skew your numbers."

## v1 scope (MVP)

IN:
- Single user, no auth (only the builder uses it at first)
- Track loop fully working
- Summary with consistency + e1RM progression + weekly volume + auto PRs
- Info tooltips / glossary for jargon terms
- Supabase persistence (so data survives + can sync later)

OUT (roadmap):
- Auth / multi-user (for sharing the APK with friends)
- Calendar view
- Bodyweight tracking
- Active overload "nudges" ("try 62.5kg or a 9th rep next session")
- Supersets, drop sets, rest timer

## Build conventions (fill in as we go)
- Expo has changed significantly since training data — read the versioned docs at
  https://docs.expo.dev/versions/v56.0.0/ before writing any Expo code.
- Supabase env vars use the `EXPO_PUBLIC_` prefix (`EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`) so Expo inlines them at build time. `.env` is
  gitignored and never committed; `.env.example` is the template — copy it to `.env`
  and fill in real values from Supabase Project Settings -> API.
- Before adding any small formatter/helper (number formatting, date
  formatting, derived-value math) locally in a component file, check
  `src/utils/` first — this project's convention is one shared copy, not
  per-file duplicates. (Caught twice on this: `fmt()` had drifted into
  three separate files before being unified into `format-number.ts`.)
- Expo Go 56.0.1 (Android, current Play Store build) has a known bug
  rejecting all SDK 56 projects ("incompatible version" error) —
  confirmed root cause is a version-string comparison bug in the
  client itself. Fix: sideload Expo Go 56.0.0 from
  github.com/expo/expo-go-releases/releases/tag/Expo-Go-56.0.0 instead.
  Watch for Play Store auto-update reintroducing 56.0.1.
- When filtering on a column inside a Postgrest embedded join (e.g.
  exercise -> muscle, workout_set -> session), use `!inner` on that
  join. Without it, a failing filter nulls the embed instead of
  excluding the row, silently including non-matching top-level rows.
  (Caught in an ad-hoc verification script during Volume work — the
  shipped `getVolumeByMuscle` already used `!inner` correctly.) **One
  deliberate exception:** `getLastLoggedSetsForMuscle` embeds `workout_set`
  WITHOUT `!inner`, because a never-logged exercise must still appear in
  the list — `!inner` would drop it entirely. The `is_warmup` filter is a
  separate embedded filter param, which PostgREST places inside the
  lateral subquery's WHERE, so it applies BEFORE the embedded limit and a
  trailing warm-up cannot surface as the last logged set. Same table,
  opposite requirement from `relative-strength-repo.ts`'s
  `exercise_favourite!inner` — both deliberate.
- Don't rely on `FlatList`'s `initialScrollIndex` (or a forwarded
  `onContentSizeChange`) inside a `Modal`. VirtualizedList drives both off
  its `_onContentSizeChange`, which react-native-web wires to the content
  container's `onLayout` — and that never fires in a modal, so the list
  silently stays at offset 0 while still *rendering* the right window,
  which looks like a styling bug rather than a scroll bug. Set the offset
  yourself in `useLayoutEffect` (see `wheel-picker-modal.tsx`). Related:
  `requestAnimationFrame` is not a safe substitute — it never fires at all
  in a browser that isn't compositing frames, which is exactly the case in
  the automated preview, so anything built on rAF is unverifiable there.
- Re-run `npx tsc --noEmit` after *every* edit in a multi-step refactor,
  not just at the end of one. Deleting a function while leaving a prop
  that referenced it type-checked fine at the previous checkpoint and blew
  up only as a runtime white-screen; tsc would have caught it instantly.
- CLAUDE.md's Current state is authoritative for decisions and design
  intent, but NOT for git state. Push status, branch position and what's
  committed must be verified against git itself — this section is prose and
  goes stale between sessions. A SHA as a *historical pointer* is durable
  and should stay (fd64f34 = "the commit that fixed the focus-refetch bug"
  is true forever); a SHA as a *state assertion* — branch tips, "pushed
  through X", ahead/behind counts — is what goes stale. (Caught when a
  stale "1 commit ahead" line was repeated as fact in a planning session.)
- Typed routes (`experiments.typedRoutes`) are generated into
  `.expo/types/router.d.ts`, and that file is only rewritten when the **dev
  server serves a request** — not by `npx tsc --noEmit`, and not by adding a
  route file. So adding a route makes tsc fail with a misleading
  `TS2820: Type '"/my/new/[route]"' is not assignable... Did you mean ...?`
  pointing at the *new* path as if it were the typo. It isn't a code error:
  start the dev server (or just curl `http://localhost:8081/`) once, then
  re-run tsc. Don't "fix" the href to match the stale union.
- `muscle.name` is load-bearing in three places at once: a display label
  (sentence-cased by `src/utils/format-muscle-name.ts`), a URL route param
  (`/category/[category]/[muscle]`), and a database lookup key
  (`fetchExercisesForMuscle` filters on `muscle.name`, not on an id).
  Consequences: renaming a muscle is a **breaking change**, not a cosmetic
  one; and the name must be globally unique, not merely unique within its
  nav_category — the route carries no id to disambiguate two muscles that
  share a name. Values are stored lowercase; capitalisation is display-only.
- Seed files under `supabase/seeds/` are **canonical for row data**;
  `schema.sql` carries **structure only**. Run order for a fresh database:
  `schema.sql` → `seeds/001_muscles.sql` → `seeds/002_exercises.sql`.
  `supabase/scripts/` holds one-time DESTRUCTIVE scripts and is deliberately
  **not** part of that run order.
- A `DO`-block guard around `ADD CONSTRAINT` must filter `pg_constraint` on
  **`conrelid` as well as `conname`**. `conname` is only unique per table, so a
  conname-only guard can false-positive against a same-named constraint on a
  different table and silently skip the add — leaving the table unconstrained
  with no error to notice.
- **Never execute anything that mutates the live database, and any
  DB-touching result must be reproduced by Ayhan in his own terminal
  before it counts as verified.** (Caught twice: it asserted
  already-applied DDL "still needs running".) `supabase/scripts/` is
  exactly why this matters — it's destructive and not idempotent, so
  nothing from there gets re-run on the strength of an unreproduced claim.
  Read-only exploration, by contrast, IS available and useful: a node
  script plus `.env` is read access, and it was used to verify step 5a
  live against the dev DB. An earlier version of this bullet wrongly
  claimed no read access at all.
- Postgres treats NULLs as **distinct** in a unique index. So a
  `unique (user_id, exercise_id)` with a nullable `user_id` does not constrain
  the single-user case at all — `(null, X)` can be inserted repeatedly. It
  needs a partial unique index on `(exercise_id) where user_id is null`
  alongside it. (`NULLS NOT DISTINCT` would also work but ties the schema to
  Postgres 15+.)
- **`undefined` vs `null` — keep them distinct even when both render identically.**
  `undefined` means *no such value exists*. A function with no result returns
  `undefined`, never `0` or `''`, so every consumer is forced to decide what
  absence renders as instead of silently showing a zero that reads like a real
  measurement. `bestE1rm()` (`src/utils/e1rm.ts`) is the precedent: an exercise
  with only warm-up sets returns `undefined`, and the logging screen renders
  `'—'` for it rather than `0kg`. Same shape in `getLastLoggedSet()` and in the
  `parseValid*()` input parsers, where `0` would additionally be *falsy* and
  collapse "empty field" into "zero entered".
  `null` is messier, and this is a known collision rather than a clean rule.
  It carries **two distinct meanings kept apart by POSITION, not by value**:
  in component state it means *not yet fetched* (every screen and Summary card
  does this — `useState<T | null>(null)`, branched on as `exercises === null` to
  show a spinner), and as a
  repo return it means *confirmed absent* — that's what `maybeSingle()` gives
  (`fetchExerciseById`, `getTodaySession`). Note this is the opposite way round
  from "undefined = not fetched, null = empty"; don't use `undefined` as a
  loading sentinel.
  Position stops being enough the moment a repo's `null` return is stored in a
  `null`-initialised state, and **that is already live** in
  `src/app/exercise/[exerciseId].tsx:78-92`: `fetchedExercise` is
  `useState<Exercise | null>(null)`, then `setFetchedExercise(result)` stores
  `fetchExerciseById`'s `null` for a missing row, and the `.catch` stores `null`
  again. Three states, one token — not-fetched, not-found, fetch-failed.
  What rescues it is a **separate boolean**, not the value: `isLoading`
  (line 79, cleared in `.finally()`) drives the render, so line 225 shows a
  spinner while loading and line 229 shows "Exercise not found" after, and
  line 80 normalises `fetchedExercise ?? undefined` so nothing downstream ever
  sees the `null`. The residual wart is the error path — a failed fetch renders
  "Exercise not found", indistinguishable from a genuinely missing row.
  So: when absence and not-yet-known must be told apart, carry a separate
  loading flag and normalise to `undefined` at the boundary. `previousSet`
  (line 109) is the clean version of this and already says so in a comment
  next to it.
  (`getTodaySession`'s only consumer, line 132, is fine — it lands in a local
  `const`, never in state, and converts to `undefined` at the call boundary.)
  **Corollary:** a `Record` keyed by id that OMITS keys for absent entries must
  be typed `Record<string, T | undefined>`. `noUncheckedIndexedAccess` is not
  enabled — it is not part of `strict`, and neither `tsconfig.json` nor the
  inherited `expo/tsconfig.base` sets it — so without the union a missing-key
  lookup types as `T` and a dropped guard produces no type error. See
  `getLastLoggedSetsForMuscle`.
- **Generalising the live-database-access bullet above: treat any
  claim about the state of a system not currently in view as unverified.** The
  live database, a file not opened this session, whether a migration ran — and
  conventions. This cuts **both ways**: if a prompt cites a convention as
  already being in CLAUDE.md, grep for it before relying on it. Conventions get
  cited from memory and sometimes were never written down. This bullet exists
  because the `undefined` rule above was cited across earlier sessions as
  established convention and turned out to be in no file at all — the code
  followed it, the doc had never recorded it.
- PostgREST silently truncates results at the API `Max rows` cap (default
  1000) with **no error**. So when a query only needs DISTINCT PARENTS,
  query the parent table with an `!inner` child embed rather than querying
  the children and deduping client-side. `getTrainedDaysInMonth` originally
  selected one row per SET for the whole month (~450 rows in a heavy
  month) purely to dedupe dates; flipped to `session` +
  `workout_set!inner(id)`, which is <=31 rows and puts the cap structurally
  out of reach. The failure mode mattered more than the payload size: a
  truncated set list means a day that WAS trained silently loses its dot —
  wrong but plausible, this project's recurring failure shape. Verified on
  real data (`calendar-repo.ts`) that the embedded
  `limit(1, { referencedTable })` does not interfere with `!inner`'s
  exclusion of childless parents — limited and unlimited runs returned
  identical date sets.
- Parsing a `.env` file by hand (e.g. in a throwaway script): split on
  `/\r?\n/` and strip a leading UTF-8 BOM before matching. This machine's
  `.env` has CRLF line endings, and a regex like `/^([A-Z0-9_]+)=(.*)$/`
  run against `'\n'`-split lines matches **nothing** — in JS, `.` does not
  match `'\r'` (it's a line terminator) and `$` without the `m` flag only
  matches at the end of the whole input. Every line silently fails to
  match and the parsed env object comes back empty, which surfaced not as
  a parse error but as an opaque `supabase-js` "supabaseUrl is required"
  stack trace three layers downstream. Same CRLF root cause as this
  machine's `git` CRLF warnings. Any script that reads env vars by hand
  should guard immediately after loading them: if a required var is
  missing or empty, print **which one** and exit, rather than letting a
  downstream library throw an unrelated-looking error.
- Local-date bucketing (`src/utils/local-date.ts`) is now confirmed
  against real data, not just reasoned about: a session dated `2026-07-30`
  carries `created_at` values from `2026-07-29T19:31Z` to
  `2026-07-29T20:17Z` — `00:31`–`01:17` **local** at UTC+5. A UTC-derived
  date key would have filed that entire session under July 29 instead. Any
  new date key or month boundary must be computed in local time via this
  file, not derived from a `timestamptz`'s UTC representation directly.
- Reserving layout space to avoid a shift is a FREQUENCY judgement, not a
  blanket rule. Reserve height for chrome that toggles OFTEN so the layout
  doesn't jump: `calendar.tsx` reserves the Today row's 48dp and the count
  line's 20dp, and dims the forward arrow rather than hiding it, because
  all three toggle on every month change. Do NOT reserve space for the
  EXCEPTIONAL: the fetch-error banner stays conditionally rendered, because
  permanently reserving ~29dp to avoid a shift that almost never happens
  pays the cost always to avoid it rarely. Same principle, opposite
  conclusions — decided by how often the thing actually appears, not by a
  rule that says "always reserve" or "never reserve." Recorded so a later
  pass doesn't "fix" this into false symmetry.
- Synthetic tests for a pure util test a COPY of it, not the shipped file,
  in this project — there's no TS test runner, so verification scripts
  (e.g. for `month-grid.ts`, `session-blocks.ts`) reimplement the function
  inline in a throwaway `.mjs`. That validates the ALGORITHM, not the file
  that actually ships; a divergence between the copy and the real file
  would go unnoticed. Acceptable for small files that are also read
  line-by-line in review, but "N assertions pass" is never, on its own,
  evidence that the shipped code is correct.
- **Claude Code's chat summaries truncate fenced code and diff blocks in the
  web-relay loop** — it says "here's the diff:" and nothing follows. So never
  rely on CC's rendering of code, a diff, or file contents; Ayhan runs
  `git --no-pager diff` or `cat` in his own terminal and pastes the raw
  output. The same applies to any claim about git state: CC's "pushed clean,
  X on top of Y" was right most times but is not evidence. Verify with
  `git status --porcelain; git status -sb; git --no-pager log --oneline -2`.
  Reading files is what CC is reliable at; SHOWING them through the relay is
  what is not.
- **The terminal is Windows PowerShell, not bash.** No `\` line
  continuations, no `do`/`done` loops, no `&&` chaining assumptions. Paths
  containing brackets need quoting or `-LiteralPath` — e.g.
  `src/app/day/[date].tsx` — because PowerShell and git both read `[...]` as
  a wildcard. **Parentheses need the same treatment, for a different
  reason:** PowerShell evaluates `(tabs)` as a subexpression, so
  `git add src/app/(tabs)/profile.tsx` fails unquoted, same as an
  unquoted bracket path fails. Any command written for Ayhan to paste must
  be PowerShell-valid as written.
- TypeScript's `-?` in a HOMOMORPHIC MAPPED TYPE also strips `undefined`
  from the property type, not just the optionality marker. So
  `{ [K in keyof T]-?: T[K] }` turns `string | undefined` into `string`,
  even where the source property writes `| undefined` explicitly. This
  shipped a broken `ProfileFields` in `e92ed58` and was fixed in `d760ba0`
  with a hand-written type. Verified with a minimal repro.
- **`.upsert()` is unusable on any table whose real uniqueness guard is a
  partial unique index** over a nullable `user_id` — this is a GENERAL rule,
  not just a `profile`/`bodyweight_log` quirk (both carry their own
  table-local note on it in the Data model above, but the rule itself
  belongs here). Two independent reasons: Postgres cannot infer a partial
  index for `ON CONFLICT` (an INSERT carries no `WHERE` clause to match
  against the index predicate), and `onConflict` on a nullable `user_id`
  will not match a row where `user_id IS NULL`, since NULLs are distinct in
  a unique index. The write path is read-then-insert-or-update. This
  inverts once auth lands and `user_id` stops being nullable.
- PostgREST's 1000-row `Max rows` cap applies to TOP-LEVEL rows only. An
  earlier note in this project claimed an embedded `.limit()` was
  truncation protection against that cap; it is not. What an embedded
  limit actually buys is bounded payload and latency. Whether the cap also
  applies to embedded rows is UNVERIFIED in this project and should not be
  asserted either way.
- **Yoga does not collapse adjacent margins the way CSS does — they sum.**
  This shipped a doubled gap under Profile's identity row, fixed in `2af8bbd`.
  Rule: vertical spacing between two elements belongs to ONE of them, never
  to both sides of the junction. Any new section dropped into an existing
  stack must carry the same outer spacing as what it replaced, and the way
  to know is to measure the gap above and below before and after the swap.
- **The lint bar changed.** `331721a` fixed the last pre-existing error, so
  `npm run lint` now passes FULLY GREEN. The bar is no longer "no new
  errors" — it is "lint passes." Any error is new.
- **`scripts/verify-profile-utils.ts` compiles and runs the real util files,**
  not reimplemented copies — so the "synthetic tests test a copy, not the
  shipped file" bullet above does NOT apply to
  `src/utils/{bmi,tdee,age,height,relative-strength}.ts`; those are
  genuinely covered. 104 assertions as of `03298dd`. Run with:
  `npx tsc scripts/verify-profile-utils.ts --outDir .tmp-verify --module commonjs --target es2022 --strict --ignoreConfig`
  then `node .tmp-verify/scripts/verify-profile-utils.js`. TS 6.0.3 needs
  `--ignoreConfig` when passing files on the CLI (TS5112). `.tmp-verify/`
  is gitignored.
- **Read and write get different error treatment, deliberately.** A failed READ
  swallows and falls back with no retry UI (all four Summary cards) —
  correct, because a stale or empty card asserts nothing false. A failed
  WRITE surfaces an inline error (Profile's weigh-in), because a silently
  failed write leaves the user believing data was saved. Corollary learned
  this phase: an empty state that makes a CLAIM (e.g. "Star a lift and log
  a working set") must never be reachable from a failed read — check the
  error flag BEFORE the empty check, or a network failure renders a false
  instruction. See `relative-strength-section.tsx` and
  `caloric-maintenance-section.tsx`.
- **Comparing a rounded float to zero.** Profile's goal delta rounds to 1dp
  BEFORE the `=== 0` comparison. 0.1 is not exactly representable in binary
  floating point — unlike the old 0.5-step wheel's 0.5 — so raw subtraction
  cannot be compared to zero directly once a 0.1 step exists.
- **Focus-based fetching, and why it is necessary.** The tab navigator keeps
  every tab's screen MOUNTED — native `NativeTabsView.android.js` maps over
  all tabs and `ScreenContent` calls `contentRenderer()` with no focus gate;
  on web `TabSlot`'s `loaded` map persists and `unmountOnBlur` is off. So
  `useEffect(..., [])` fires once ever and never again, and data logged on
  one tab stays stale on another until the app is force-closed. That was the
  `fd64f34` bug. The fix is `useFocusEffect` — imported from **`expo-router`**,
  which ships its own fork, NOT from `@react-navigation/native` directly. Its
  deps are `[effect, navigation, ...]`, so a `useCallback` keyed on state
  re-runs on focus AND on that state changing, which is how one hook covers
  both. Back-navigation hits this too, not just tab switches: a screen under
  a pushed route stays mounted. Any screen that fetches uses this.
- Two `NativeTabs` gotchas, both Android, both invisible on web (web uses
  `app-tabs.web.tsx`, which never touches `NativeTabs`). First,
  `labelVisibilityMode="labeled"` is required or Android collapses a 4-tab
  bar to showing only the selected tab's label. Second, `iconColor` is a
  **separate prop** from `labelStyle` — `labelStyle`'s nested
  `{default, selected}` covers TEXT ONLY, and icon colour has its own prop of
  the same shape, split internally into `iconColor`/`selectedIconColor`.
  Styling labels and expecting icons to follow leaves icons on Android's
  default `onSurfaceVariant` in both states. Confirmed against expo-router's
  real type defs, not guessed.
- expo-router's `Redirect` calls `router.replace`, NOT push — verified in
  its source. That is what makes the single-muscle auto-skip
  (`category/[category]/index.tsx`) safe: the picker leaves the stack, so
  back cannot bounce forward into a screen the user never chose. A push there
  would do exactly that.
- **PostgREST embed shape is asymmetric,** and the declared `.returns<>()`
  must match it. A child embedded under its parent (`workout_set` under
  `session`) comes back as an ARRAY. A parent embedded under its child
  (`exercise` or `session` under `workout_set`) comes back as an OBJECT.
  Verified against the dev DB during step 5a, not inferred.
- `referencedTable` is the correct option name for the installed
  `@supabase/postgrest-js` 2.110.0 (`.limit(1, { referencedTable: '...' })`,
  `.order(..., { referencedTable: '...' })`). `foreignTable` is deprecated in
  its own type defs.
- **EAS build config, non-obvious parts.** The `preview` profile needs
  `"distribution": "internal"` AND `"android": { "buildType": "apk" }` set
  explicitly — `eas build:configure`'s scaffold defaults to an AAB, which
  cannot be sideloaded. Supabase env vars are registered in EAS's `preview`
  environment via `eas env:set`/`eas env:create`, never committed. EAS
  auto-generates and manages the Android keystore; no manual signing setup.
  Android package is `com.syedayhanhabib.ayfit`.
- Write a verification script's expected output BEFORE the implementation
  exists — see the "synthetic tests test a COPY" bullet above, which this
  extends. During 5c, the expected numbering for 2026-07-30 was written
  first, against contents already independently known from 5a's run — that
  is the assertion that could not be retrofitted to match a buggy
  implementation. Claude Code's own synthetic expectations had to be
  corrected twice in the same step because it had assumed per-block reset
  instead of continuous-per-exercise numbering: the algorithm was right and
  the test was wrong. Worth recording precisely because "the test was wrong"
  is also how a bug gets ratified.
- **Device-check items get recorded as a checklist and resolved in place,
  not deleted.** Anything a browser preview cannot answer — fonts, `Modal`
  behaviour, scroll feel, perceptual weight, Android-specific clipping,
  accessibility font scaling — goes on a written list at the time it is
  noticed, and the device pass marks each resolved rather than removing it.
  That is what stops "we'll check that on device" evaporating between
  sessions, and it means the record shows what was checked rather than what
  quietly disappeared. Calendar's 5c checklist is the worked example.
- (Claude Code: add rules here every time something is corrected, so mistakes don't repeat)