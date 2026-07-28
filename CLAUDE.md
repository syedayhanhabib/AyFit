# AyFit — Project Foundation

## Current state
_Last updated: 2026-07-28_

- **Last shipped:** commit 2 — the real exercise catalogue and the schema
  changes behind it (`exercise_favourite`, `exercise.movement_group`,
  `muscle.display_order`), plus schema.sql becoming structure-only.
- **Pushed:** Everything committed so far is pushed. Verify with `git status`
  rather than trusting this line.
- **Done:** Track loop end-to-end — muscle picker → exercise list (DB-backed)
  → per-set logging → writes persist to Supabase (sessions + sets) →
  reopening an exercise mid-session now reads back today's already-logged
  sets (Step 5c-iii). Read-back uses a read-only `getTodaySession()` that
  never creates a session row — only a real write (`getOrCreateTodaySession`)
  does that, so merely opening a screen can't spawn a phantom session.
  Glossary/InfoTip system in place. Session lifecycle = lazy, one-per-day.
  Track's visual redesign (v3 color system, DESIGN.md) is complete and
  pushed: dark palette + category accents + JetBrains Mono/Inter type scale
  (`src/constants/track-theme.ts`, scoped to Track only), restyled muscle
  picker/exercise list/logging screens, weight/reps/RPE steppers, custom
  warm-up pill, plate-in set animation. `getLastLoggedSet` read-only query
  (workout-set-repo.ts) is live and wired into two screens: the per-set
  logging screen (LAST TIME card, excludes today's session) and the
  exercise list screen (per-row last-logged subtitle, no exclusion).
  Shared formatters now live in `src/utils/`: `e1rm.ts`,
  `format-relative-date.ts`, `format-number.ts` (`fmt` was deduplicated
  from three separate local copies during this work).
  **Summary tab is built and mostly wired to real data.** UI shell
  (v3 tokens) has all four sections in DESIGN.md's Phase 2 order —
  Consistency, Volume by muscle, Progression, Recent PRs — sharing the
  same `Palette`/`Typefaces`/`TypeScale`/`CategoryAccent` tokens now
  hoisted from `track-theme.ts` into `constants/theme.ts` (`track-theme.ts`
  is a thin re-export shim so Track's own files needed no changes).
  Progression is fully wired: `getExercisesWithHistory` +
  `getE1rmHistory` (workout-set-repo.ts) drive real exercise chips
  (most-recently-logged first, that's the real default selection now,
  not a hardcoded name), the chart math itself (Catmull-Rom smoothing,
  range filtering) is unchanged from the design mock, verified live
  on-device. Volume by muscle is fully wired: `getVolumeByMuscle` (new
  `src/lib/summary-repo.ts`) always returns all five categories
  zero-filled, guarded against divide-by-zero on an all-zero week
  (verified against a genuine all-zero current week live). New shared
  util `getCurrentWeekRange()` (`src/utils/week-range.ts`) computes the
  Monday-Sunday boundary Volume uses now and Consistency reuses too.
  **Consistency is fully wired.** `getCurrentWeekRange()` takes an
  optional `referenceDate` (arbitrary past weeks, not just today), and
  `getConsistency()` (`summary-repo.ts`) returns
  `{ sessionsThisWeek, weeklyStreak, completedDays }` from a single
  `session.date` query, bucketed by week. Streak is strict — an
  in-progress week with nothing logged yet breaks it immediately, no
  grace period. `completedDays` is a 7-element Monday-first boolean
  array (feeds the card's day-by-day ledger strip), derived from the
  same already-fetched dates, no second query. `consistency-card.tsx`
  mirrors `volume-card.tsx`'s exact fetch shape (`useEffect`/`useState`,
  swallow-and-fallback to zero/all-false on error, no retry UI — neither
  sibling card has one either). Verified against synthetic cases
  (consecutive weeks, a gap week, a 0-session current week after a real
  streak, empty history, a mixed trained/untrained week) plus a live
  read-only smoke test against the dev DB, then click-through on-device
  including a forced-error fallback check.
  **Consistency, Volume, and Progression are all fully wired now.**
  PR detection's data layer is done, for Summary only: `pr-detection.ts`
  exports a pure `detectPrSessions()` (no Supabase) — per exercise,
  chronologically sorted, skip the first-ever session (nothing earned
  yet to beat), emit an event wherever a later session's e1RM strictly
  exceeds the running max so far. `getRecentPRs(limit = 5)`
  (`summary-repo.ts`) is a single query joining `workout_set` to
  `exercise`/`session`, reduces to one best-e1RM entry per
  exercise-per-session, feeds that into `detectPrSessions()`, sorts
  descending by date, slices to `limit`. Computed live every call, no
  stored best-value/PR columns anywhere — same philosophy as e1RM and
  Volume, and specifically chosen so a deleted set can never leave a
  stale stored value behind. Recency-capped (most recent N PR-setting
  sessions), not time-windowed, so the card doesn't go blank on a slow
  stretch. An exercise's very first-ever session is never a PR by
  design — verified against 6 synthetic cases (single session, strictly
  increasing, exact tie, dip-then-re-break, more events than `limit`,
  empty history) plus a live read-only smoke test.
  `recent-prs-card.tsx` is now wired too: `useEffect`/`useState`,
  swallow-and-fallback to `[]` on error, same shape as the other three
  cards. Added a `loading` state and an `emptyText` state (mirroring
  `progression-card.tsx`'s "No e1RM data yet" convention) — the shell
  never had either, since its placeholder array was always hardcoded
  non-empty. Gold styling (`#FFC738`) is static only, unchanged from
  the original markup — no flash/glow/haptic added; verified via
  computed styles (`animationName: none`) on a temporarily-stubbed
  fake-data pass (injected inline, click-through confirmed, reverted —
  `git diff` showed only the real wiring after).
  **All four Summary cards — Consistency, Volume, Progression, Recent
  PRs — are now fully wired to real, computed-live data. Summary is
  done.** Live dev DB currently has 0 PR events (only 1 non-warmup set
  logged so far), so the empty state is what's actually been verified
  live; the gold-card-with-content visual was verified via the stubbed
  pass above, not yet against real earned data.
  **Scope note, still true:** this is Summary's historical PR list
  only. Track's live gold-flash moment (per-set comparison against the
  running max of every prior set for that exercise, no session-grouping
  needed there) remains a separate, deferred task — a real-time
  UI/haptic moment triggered at set-insert time, not a data-fetch-and-
  render card, so it needs its own scoping conversation rather than
  reusing this thread's wiring pattern.
  **EAS build for a standalone Android APK is done.** Commit `b5955a3`
  (pushed to `origin/master`): `android.package` set to
  `com.syedayhanhabib.ayfit` in `app.json`; `eas.json` scaffolded via
  `eas build:configure`, with the `preview` profile explicitly set to
  `"distribution": "internal"` + `"android": { "buildType": "apk" }`
  (the scaffold's default would otherwise have produced an AAB).
  Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`) registered in EAS's `preview`
  environment via `eas env:set`/`eas env:create`, not committed to the
  repo. `eas build --profile preview --platform android` was run and
  succeeded — EAS auto-generated and manages the Android keystore, no
  manual signing setup needed. The resulting APK is installed on a
  real Android device and confirmed working end-to-end with a real
  write (a shoulder exercise set logged and read back correctly),
  independent of Expo Go/Metro/shared wifi for the first time.
  **Phase 1.5 real-device polish pass, batch 1 is done** (four commits,
  not yet pushed): (1) tab bar — labels now always render for all four
  tabs (`labelVisibilityMode="labeled"` fixes Android's 4-tab
  selected-only collapse), real MaterialCommunityIcons per tab
  replacing two duplicated placeholder assets. (2) Shared `Wordmark`
  component (`src/components/wordmark.tsx`) replaces "AYFIT" duplicated
  in Track/Summary headers — mixed-case "AyFit", Space Grotesk bold
  (new font load in `_layout.tsx`), chalk-white-to-brand-purple
  diagonal gradient via expo-linear-gradient + masked-view (both
  already installed); web's masked-view shim has no real masking so it
  gets a static brand-purple fallback there, irrelevant on native.
  Track's header copy: "Track — pick a muscle" → "Track your workout —
  pick a muscle". (3) Per-set logging screen: wrapped in `SafeAreaView`
  (header was colliding with the status bar/notch on-device, back
  button unreliable); reordered top-to-bottom to header → input card
  (weight/reps/RPE + warm-up + Add Set, now pinned just below the
  header instead of a scroll-away bottom footer) → e1RM this session →
  set ladder → LAST TIME (now trails, was first); live input numeral
  bumped 19px → 28/32 with wider input boxes. See DESIGN.md's Track —
  Phase 1.5 section — this supersedes two of Phase 1's original
  non-negotiables (bottom-pinned Add Set, LAST TIME visible first).
  (4) Glossary/InfoTip: RPE and warm-up tips wired in on the logging
  screen (glossary entries existed but weren't rendered), InfoTip icon
  bumped 16px → 20px with a 48pt touch target (hitSlop 14), dotted
  underline added under each tipped term label, RPE/e1RM glossary copy
  replaced with expanded verified text.
  **Phase 1.5 batch 3 is done** (three commits, also unpushed). Batch 2
  was skipped in favour of it. (1) Wordmark: gradient direction flipped
  to deep→brand (`Palette.brandDeep` first) so it brightens as it reads
  instead of fading out at the tail; font swapped Space Grotesk bold →
  **Unbounded ExtraBold** (`@expo-google-fonts/unbounded`, new font load
  in `_layout.tsx`) with tracking pulled 0.5 → 0 because Unbounded's
  letterforms are already wide; sizes 22 → 30 (Track) and 20 → 26
  (Summary), eyebrow line 12 → 14 on both. `@expo-google-fonts/space-grotesk`
  is left installed on purpose so reverting the face is a one-liner.
  (2) Tab bar icons now tint on selection. Root cause: only *labels*
  were ever styled — `labelStyle`'s nested `{default, selected}` covers
  text only, and icon color is a **separate `NativeTabs` prop**
  (`iconColor`, same `{default, selected}` shape, split internally into
  `iconColor`/`selectedIconColor`) that was never set, so icons fell
  through to Android's `onSurfaceVariant` in both states. Confirmed
  against expo-router's real type defs rather than guessed. Native-only:
  web uses `app-tabs.web.tsx`, which never touches `NativeTabs`, so this
  fix is unverified until the next device run.
  (3) **The Kg/Reps/RPE stepper row is gone**, replaced by three
  tappable `ValueChip`s (`src/components/track/value-chip.tsx`) plus a
  per-field `WheelPickerModal`
  (`src/components/track/wheel-picker-modal.tsx`) — a snap-scrolling
  alarm-picker-style wheel, one field at a time. `StepperField` was
  deleted outright (`[exerciseId].tsx` was its only consumer, grepped).
  Wheels: Kg 2.5–300 @2.5, reps 1–50 @1, RPE 1–10 @0.5; empty fields
  open at the old stepper bases (60/5/8) and render "—" rather than
  being pre-filled. Validation (`parseValid*`, `isValid`, Add Set
  enable/disable) is **untouched** — a UI-layer swap over the same
  `weightInput`/`repsInput`/`rpeInput` state. The weight wheel starts at
  2.5 rather than 0 specifically because 0 has always failed
  `parseValidWeight`, so a 0 stop would be selectable-but-invalid and
  silently keep Add Set disabled. See DESIGN.md's Track Phase 1.5 batch 3
  section for the full rationale plus its two accepted consequences (no
  free-text numeric entry on this screen any more; off-grid values like
  61kg or RPE 7.25 are no longer expressible).
  **Stale-data-until-relaunch bug is fixed** (`fd64f34`). Symptom: a set
  logged on Track didn't appear on Summary until the app was force-closed
  and reopened. Cause was *when* fetches ran, not what they fetched — all
  four Summary cards used `useEffect(..., [])`, and the tab navigator keeps
  every tab's screen mounted (native: `NativeTabsView.android.js` maps over
  all tabs and `ScreenContent` calls `contentRenderer()` with no focus gate;
  web: `TabSlot`'s `loaded` map persists and `unmountOnBlur` is off), so
  there was never a second mount to re-trigger them. Now on
  `useFocusEffect` — imported from **`expo-router`**, which ships its own
  fork of it, rather than `@react-navigation/native` directly. Its deps are
  `[effect, navigation, …]`, so a `useCallback` keyed on state re-runs on
  focus *and* on that state changing; that's how Progression's
  selection-keyed history fetch needs only one hook. `summary-repo.ts` /
  `workout-set-repo.ts` were **not** touched — computed-live was already
  right. Two notes: (a) **Calendar had no bug** — `(tabs)/calendar.tsx` is
  still a placeholder that fetches nothing and there is no
  `calendar-repo.ts`, so there was nothing to refetch; (b) the **exercise
  list** (`category/[category].tsx`, now
  `category/[category]/[muscle].tsx`) *did* have it, reached by
  back-navigation instead of a tab switch (it stays mounted under the pushed
  logging screen, so its "last logged" subtitles showed pre-workout values)
  — fixed in the same commit. Progression also needed its default-selection
  logic guarded: re-running on every focus would otherwise reset the user's
  chosen exercise chip, so it now only picks a default when there isn't a
  valid one already. Cards deliberately don't reset to `null` before
  refetching, so tabbing in doesn't flash a spinner over data already on
  screen. Accepted tradeoff: each focus of Summary issues 5 queries; no
  cache layer, correctness on focus matters more for a personal-use app.
  **A muscle-picker level now sits between the category tiles and the
  exercise list, and the rule deciding whether it appears is data-driven.**
  A nav_category with more than one muscle shows the picker; one with
  exactly one skips straight to that muscle's exercise list via a
  replace-style `Redirect` (expo-router's `Redirect` calls `router.replace`,
  verified in its source — so the picker leaves the stack and back can't
  bounce forward into it again; a push there would do exactly that).
  Nothing is hardcoded per category: Chest and Back auto-skip today and
  start branching the day either gets a second muscle row. Routes are
  `category/[category]/index.tsx` (picker) and
  `category/[category]/[muscle].tsx` (exercise list, moved from
  `category/[category].tsx`), and the list filters by muscle now rather
  than nav_category — `fetchExercisesForMuscle`, `!inner` on the join.
  Glutes and calves are seeded, so Legs is 4 muscles and the table is 11
  rows; `supabase/seeds/001_muscles.sql` is the file that was actually run
  against the DB (DML-only, idempotent) and `schema.sql` mirrors it. New:
  `lib/muscle-repo.ts`, `types/muscle.ts`, `utils/format-muscle-name.ts`,
  `utils/pluralize.ts`. Muscle names are stored lowercase and capitalised
  at display time. The picker is on `useEffect`, **not** `useFocusEffect` —
  deliberate: it shows nothing per-session (no "last trained" subtitles) so
  nothing can go stale while the app is open, and staying off the focus
  path stops the single-muscle redirect re-evaluating on every focus.
  Verified on a Pixel 7: Shoulders → Front delt → back → back clean (the
  multi-word route param, which encodes as `%20`, works on native), Chest
  auto-skip with no visible flash and no forward bounce, Legs picker at 4
  with Calves/Glutes on the empty state.
  **Commit 2 is done and pushed** — three commits: `451a360` (schema DDL),
  `8f2afe6` (exercise catalogue + reset script), `f9a1c6e` (muscle display
  order). What changed:
  **`schema.sql` is now structure-only.** It used to carry its own copy of
  the muscle and exercise INSERTs alongside `supabase/seeds/`, which could
  drift; that duplication is resolved in favour of the seed files, which own
  all row data now. See Build conventions for the run order.
  **A 189-exercise catalogue replaces the ~20 placeholder rows**
  (`seeds/002_exercises.sql`). Naming grammar is **[Angle] [Equipment]
  [Movement]**, with the angle always explicit and never implied — so
  "Flat barbell bench press" files under F, not B. That's deliberate:
  alphabetical sort then clusters variants the way you actually choose one
  (angle first, then implement), and no per-muscle grouping metadata is
  needed to get it.
  **`exercise.name` stays GLOBALLY unique, deliberately not
  unique-per-muscle.** One movement gets exactly one row and exactly one
  home muscle, so its e1RM line and PR history can never fragment across
  duplicate rows. Consequence: if a lift feels like it belongs to two
  muscles, pick one — close-grip bench is filed under triceps, and the
  conventional/sumo deadlifts under back > lower back while the RDL family
  sits under hamstrings.
  **Back carries `movement_group` in four sections** — vertical pull,
  horizontal pull, traps, lower back — rather than drilling down into
  sub-muscles. Mixing two movement patterns with two regions is
  intentional; vertical/horizontal alone leaves shrugs and deadlifts in an
  unlabelled void. See DESIGN.md for the governing principle ("drill down
  where the split is unambiguous, label where it is fuzzy").
  **The original ~20 Title Case exercise rows and all test history were
  deleted outright** via `supabase/scripts/001_reset_test_data.sql` —
  one-time, run on 2026-07-28, and not part of the seed run order. They
  predated the naming grammar and everything logged against them was
  throwaway test data, so deleting beat renaming in place. Muscle rows were
  not touched. All four SQL files were applied to the live dev DB that same
  day and verified: 189 exercise rows total, back 40, split 12/15/5/8.
  **Commit 3 is done — the exercise list's N+1 is gone.** It used to call
  `getLastLoggedSet` once per row (fine at ~4 rows, not at 25); that loop is
  replaced by `getLastLoggedSetsForMuscle` (`workout-set-repo.ts`) — one
  batched PostgREST query using an **embedded-resource limit**
  (`.limit(1, { referencedTable: 'workout_set' })`), so a single round trip
  returns the latest set per exercise. Not fetch-everything-and-reduce, and
  not an RPC. Two deliberate details:
  (a) `workout_set` is embedded **without `!inner`** — the one intentional
  exception to the `!inner` convention below. A never-logged exercise must
  still come back, with an empty embed, or it vanishes from the list
  entirely. The `is_warmup` filter is a separate embedded filter param, which
  PostgREST puts inside the lateral subquery's WHERE, so it applies *before*
  the limit and a trailing warm-up can't surface as the last logged set.
  (b) `getLastLoggedSet` is **retained, not deleted** — the logging screen
  needs its `excludeSessionId` so "LAST TIME" doesn't echo the set you added
  ten seconds ago, and the browsing screen deliberately omits it ("last
  logged" there means literally the last time, even if that was today). Both
  carry a comment saying why the other exists.
  Call site (`category/[category]/[muscle].tsx`) stays on the same
  `useFocusEffect` path as before (per `fd64f34`) and now runs the two
  queries under one `Promise.all`. `referencedTable` is the correct option
  name for the installed `@supabase/postgrest-js` 2.110.0 — `foreignTable`
  is deprecated in its own type defs. Verified: `tsc` clean, and the
  generated request URL inspected offline. **Not yet run against real data** —
  two things to check on the next device pass. First, that never-logged
  exercises still render as rows (that's what the missing `!inner` buys; if
  it's wrong the list goes nearly empty, which is loud and obvious). Second,
  that a trailing warm-up doesn't displace a working set in a row's subtitle
  — this is the **silent** one of the two, because a warm-up weight renders as
  a perfectly plausible number rather than an obvious break, so it has to be
  deliberately looked for instead of waiting to be noticed. Reproducing it
  needs a working set followed by a warm-up on the same exercise.
- **Next:** **Commit 4** — the exercise list itself: Favourites/A–Z
  sections, the star toggle, and `movement_group` labels on back.
  DESIGN.md's "Track — exercise list" section has the spec.
  Also still open: The **on-device pass still owes three things.** The muscle-picker
  work above was verified on a Pixel 7, but these weren't, and web can't
  settle them: the tab-bar icon tint (web never renders `NativeTabs`), the
  wheel's scroll-snap *feel* (momentum, snap timing), and the focus-refetch
  fix on native `NativeTabs` rather than web's `TabSlot` — that mount
  behaviour was confirmed identical in source, but only the web path has
  been exercised live. After that:
  offline support
  (writes currently fail outright with no connectivity, no local
  queue/sync-on-reconnect). Then: auth + RLS + a second EAS build before
  sharing the APK with friends. Track's live PR gold-flash remains
  parked/deferred as before, not scoped yet.
- **Parking lot:** Consolidate `todayLocalDate()` (`session-repo.ts`) and
  `formatDateLocal()`/`parseDateLocal()` (`summary-repo.ts`) into one
  shared `src/utils/local-date.ts`. Not urgent — each is currently used
  in exactly one file, so there's no drift yet (unlike the old `fmt()`
  case, which was the same logic silently diverging across three
  copies) — but it's the same shape of problem starting over. Revisit
  once Summary's data layer is fully done (after PR detection).
  Also parked: **give the logging screen a distinct error state.**
  `src/app/exercise/[exerciseId].tsx:92` stores `null` on fetch failure,
  which renders "Exercise not found" — so a network error is
  indistinguishable from a genuinely missing row, and the screen tells
  the user something false. Today that needs a dropped connection to
  hit, so it's rare; once offline support lands it becomes routine,
  which is when a wrong message stops being a curiosity and starts being
  the normal experience. Fix is a third state, not a different sentinel
  value (see the undefined-vs-null convention in Build conventions,
  where this is recorded as a symptom).

Rule going forward: update the "_Last updated_" line and these bullets at the
end of each session. This section is the source of truth for "where am I."

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
  **GLOBALLY unique**, deliberately not unique-per-muscle (see Current state, commit 2).
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
  shipped `getVolumeByMuscle` already used `!inner` correctly.)
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
- **Treat any claim Claude Code makes about live database state as unverified.**
  It has no read access to the Supabase database and cannot tell whether a
  versioned SQL file has been applied. This matters most for
  `supabase/scripts/`, which is destructive and not idempotent — never re-run
  anything from there on the strength of such a claim. (Caught twice: it
  asserted already-applied DDL "still needs running".)
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
- **Generalising the "no read access to the database" bullet above: treat any
  claim about the state of a system not currently in view as unverified.** The
  live database, a file not opened this session, whether a migration ran — and
  conventions. This cuts **both ways**: if a prompt cites a convention as
  already being in CLAUDE.md, grep for it before relying on it. Conventions get
  cited from memory and sometimes were never written down. This bullet exists
  because the `undefined` rule above was cited across earlier sessions as
  established convention and turned out to be in no file at all — the code
  followed it, the doc had never recorded it.
- (Claude Code: add rules here every time something is corrected, so mistakes don't repeat)