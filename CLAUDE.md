# AyFit — Project Foundation

## Current state
_Last updated: 2026-08-04_

**Track/Summary: dogfooding in progress.** Real workouts have been logged
on-device for several days via the EAS build. Testing is ongoing (a few
more days planned) before a conclusive list of UI/UX issues gets
compiled — some have already surfaced in Track and, to a lesser extent,
Summary, but nothing's finalized. Don't preemptively guess at or fix
anything here before it's explicitly described.

**Guardrail while dogfooding continues:** don't modify exercises-repo.ts,
exercise-favourite-repo.ts, workout-set-repo.ts, summary-repo.ts,
exercise-list-grouping.ts, any screen under src/app/category/ or
src/app/exercise/, or Summary's card components — and don't alter the
shape of any existing table in schema.sql. New repo files that only read
existing tables, and new strictly-additive tables, are fine. Editing what
already exists is not, until testing concludes.

**Calendar is complete and closed out** — data layer, month grid,
`/day/[date]`, navigation, all device-verified on the Pixel 7. One item
remains outstanding: the return-to-an-exercise-later case needs a real
session that deliberately doubles back on a lift. **Active build track:
Profile** — unblocked because it shares no files with the guardrailed
surface. Profile's design spec is DESIGN.md's "Profile — Phase 4" section.

- **Last shipped:** commit 4 — exercise favourites + Back's
  `movement_group` section labels on the exercise list, in three parts:
  4a (`784802c`) the data layer (exercise-favourite-repo.ts,
  fetchExercisesForMuscle's isFavourited/movementGroup embed,
  exercise-list-grouping.ts), 4b (`d6f55ae`) SectionList rendering
  (Favourites, movement_group, or flat), 4c (`6ef88dd`) the star toggle
  wired to real add/removeFavourite writes. Confirmed via a real EAS
  build installed on-device (Pixel 7), not just `tsc`.
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
  pushed): (1) tab bar — labels now always render for all four
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
  **Phase 1.5 batch 3 is done** (three commits, also pushed). Batch 2
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
  **Step 5a is done — Calendar's read-only data layer** (commit `0d3b280`):
  four new files, zero existing files touched. `src/utils/local-date.ts`
  (canonical home for local-date math: `formatDateLocal`, `parseDateLocal`,
  `todayLocalDate`, `getMonthRange`), `src/types/calendar.ts`,
  `src/utils/session-blocks.ts` (pure `groupIntoSessionBlocks`, no Supabase
  import — same math-vs-fetching split as `pr-detection.ts`),
  `src/lib/calendar-repo.ts` (`getTrainedDaysInMonth`,
  `getSessionDayDetail`). Verified against the dev DB via a throwaway
  read-only smoke script (deleted after use): limited and unlimited embeds
  returned identical date sets, so `!inner` and the embedded `limit` don't
  conflict on real data; `workout_set`-under-`session` comes back as an
  ARRAY while `exercise`/`session`-under-`workout_set` come back as
  OBJECTS, both matching the declared `.returns<>()` types; warm-ups
  present (13 sets on 2026-07-30, `is_warmup: true` among them); an empty
  date returns zero rows, hence `null`. **Not yet verified against real
  data:** the return-to-an-exercise-later block split — only the synthetic
  `A A B B A` case in `session-blocks.ts` covers it, since 2026-07-30's
  three logged exercises never repeat. Closes itself the first time a real
  session doubles back on a lift.
  **Open thing to look for once 5b lands (not a fix now):**
  `getOrCreateTodaySession` (`session-repo.ts`) keys off `todayLocalDate()`
  at write time, so a workout crossing local midnight plausibly produces
  two session rows on two dates, and Calendar would show it split across
  two days. `getSessionDayDetail` degrades gracefully since it collects
  sets by date rather than by session, but the split itself would still be
  visible on the month grid. Late-night training (see the 07-30 real-data
  evidence above, 00:31–01:17 local) makes this non-hypothetical. Needs
  confirming against real data, not assuming.
  **Deferred capture-time change:** `workout_set.created_at` is currently
  server-insert time via `default now()`, which only equals performed time
  while always online. Once writes queue offline, a flushed batch lands
  with near-identical timestamps and performed order scrambles. The fix is
  to set `created_at` client-side at capture time — one line in
  `workout-set-repo.ts` — deliberately deferred to the offline-support
  phase, since that file is guardrailed and will already be open then.
  Ordering stays `created_at` then `id` as a deterministic tiebreak,
  unchanged.
  **Step 5b is done** in two commits: `5c8c8b4` — `src/utils/month-grid.ts`,
  pure `buildMonthGrid(year, month)`: Monday-first weeks of fixed length 7,
  explicit `null` blanks before day 1 and after the last day, row count
  derived (4/5/6) rather than hardcoded. No Supabase or React import; date
  keys built via `local-date.ts` so they join directly against
  `getTrainedDaysInMonth`. `5299874` — `src/app/(tabs)/calendar.tsx`, the
  month grid UI: neutral chalk dots, brand ring on today, day-trained count
  on its own line, arrows with the forward one disabled on the current
  month, a conditional Today button. Fetch runs on `useFocusEffect` with
  TWO out-of-order guards — a per-run `cancelled` closure plus a
  month-tagged loaded state — and a fetch failure renders an explicit error
  state rather than falling through to an empty array. No cell is pressable
  yet; `/day/[date]` arrives in 5c.
  **Verification, and its limits:** `buildMonthGrid` was independently
  cross-checked against Python's Monday-first `calendar` module for every
  month 1970–2100 (1,572 months) — row counts, blank positions, and date
  keys all matched. `calendar.tsx`'s grid was confirmed against the dev DB
  and via computed styles in a web preview at the time this step landed.
  **It is now device-verified too** — the 5c device pass (see the resolved
  checklist below) covered the grid alongside the day-detail route, so
  every perceptual question originally deferred here has been checked, not
  left open.
  **5c on-device checklist — RESOLVED, all fine** (recorded rather than
  deleted, so the record shows these were checked rather than quietly
  dropped): dot weight (6px, `Palette.text` chalk) reads as intentional,
  not too heavy or too faint; today's ring (30dp circle, 1.5 border,
  `Palette.brand`) reads as intentional, not a rendering artifact; arrow
  thumb-reach at the top of a 6.3" screen is comfortable one-handed; and
  the permanent ~48dp empty band between the header and the weekday row on
  the CURRENT month reads as breathing room, not a hole. Checked alongside
  them during the same pass: dotless cells are genuinely inert (no
  accidental tap targets), back-navigation from `/day/[date]` returns to
  the month that was being viewed (confirming the mounted-under-a-pushed-
  route assumption behind `useFocusEffect`), warm-up rows are legible at
  their recessive styling, and 2026-07-30's day detail matches the
  expected numbering (13 sets, 3 exercises, 1-4 / 1-3 / 1-2). Header wrap
  is deliberately NOT on this list: moving the count to its own line
  eliminated that question rather than deferring it.
  **Step 5c is done** in two commits: `f5f1809` — set numbering and day
  totals in the data layer. `numberWorkingSets` numbers working sets
  continuously per exercise across the whole day, keyed on `exerciseId` so
  a revisited exercise continues rather than restarting; warm-ups carry
  `workingSetNumber: undefined` and never advance the counter.
  `getDayTotals` returns total sets (warm-ups included, per the ledger
  rule) and DISTINCT exercise count, not block count. `getSessionDayDetail`
  composes both, so the UI does no arithmetic. `groupIntoSessionBlocks`
  itself untouched, so its existing 8-case verification still holds.
  `bdd4a6a` — `src/app/day/[date].tsx` plus pressable dotted cells in
  `calendar.tsx`, and `src/utils/date-display.ts` (month names shared with
  `calendar.tsx` rather than duplicated — the `fmt()` duplication the
  parking lot exists to prevent). Four distinct states: loading, loaded,
  "Nothing logged", and an explicit fetch error that never falls through
  to the empty state. The route param is validated against `YYYY-MM-DD`
  BEFORE querying, so a malformed deep link renders the empty state
  instead of surfacing a PostgREST 400 as a load failure. Only dotted
  cells are pressable; dotless cells are fully inert.
  **Numbering verification:** the smoke script's expected output was
  written BEFORE any code existed, checked against 2026-07-30 whose
  contents were already independently known from 5a's run — 13 sets, 3
  exercises, numbering 1-4 / 1-3 / 1-2 with warm-ups unnumbered. That's the
  assertion that couldn't be retrofitted to match a buggy implementation.
  Claude Code's own synthetic expectations had to be corrected twice
  during 5c-i — it had assumed per-block reset instead of
  continuous-per-exercise numbering — the algorithm was right and the test
  was wrong, worth recording precisely because "the test was wrong" is
  also how a bug gets ratified.
  **Two small things flagged in 5c-ii's review, checked just now and both
  fine:** `day/[date].tsx`'s working-set index uses `padStart(2, '0')`
  ("01", "02") — compared against Track's `SetRow` (`set-row.tsx:29`),
  which renders its own index the same way (`String(index + 1).padStart(2,
  '0')`), so the two screens already agree; no divergence, no action
  needed. And reimplementing a back chevron in `day/[date].tsx` rather
  than importing Track's `BackButton` was the right call — `BackButton`
  lives at `src/components/track/back-button.tsx`, colocated under Track
  rather than shared top-level infrastructure, confirmed by checking where
  the file actually is rather than assuming.
  **Still open on Calendar:** the return-to-an-exercise-later case is
  unverified against real data. Both halves depend on it — that
  `groupIntoSessionBlocks` emits a SECOND block for a revisited exercise,
  and that numbering continues into it (4, 5) rather than restarting at
  1 — and only synthetic cases cover either. Nothing but a real workout
  that doubles back on a lift will produce this data. Action item:
  deliberately do that during ongoing dogfooding (e.g. bench, something
  else, bench again), then open that day in Calendar.
  **Step 6a is done** — commit `2eb5f5b`, "schema: add profile and
  bodyweight_log tables". Additive DDL only, zero existing tables touched,
  applied to the live dev DB and verified by Ayhan in the Supabase SQL
  editor: all 8 constraints present with Postgres's auto-generated names,
  both partial indexes present with their `WHERE` clauses intact, and BOTH
  NULL-uniqueness guards proven by deliberately colliding inserts inside a
  rolled-back transaction rather than assumed. Both tables confirmed empty
  afterwards.
- **Next:** Calendar is complete — data layer, month grid, day detail,
  navigation, all device-verified. Profile is the active track. Landed so
  far, in order: `2eb5f5b` (6a, schema: profile + bodyweight_log, applied
  and verified live), `31b2a59` (6b, docs: Profile Phase 4 spec + data
  model + 2 build conventions), `b32035f` (6c, utils: bmi.ts, tdee.ts,
  age.ts + regression harness), `e92ed58` (6d, data: profile-repo,
  bodyweight-repo, activity-repo, types/profile), `606f67b` (6d-ii, data:
  relative-strength-repo + relative-strength.ts), `d760ba0` (6e, profile:
  v3 scaffold + Details card, ProfileFields type fix). Revised remaining
  sequence — one wired card per commit, no separate shell/wiring split:
  6f bodyweight card (current weight, log today's, goal delta), 6g BMI
  card (needs a Claude Design pass for the scale), 6h relative strength
  card, 6i TDEE card, 6j docs commit + real-device pass.
  **Phase 1.5's on-device pass is now confirmed complete** — the three
  items it used to owe (the tab-bar icon tint, since web never renders
  `NativeTabs`; the wheel's scroll-snap *feel*; and the focus-refetch fix
  on native `NativeTabs` rather than web's `TabSlot`) have all been
  exercised live across several days of real dogfooding on the Pixel 7
  EAS build. Commit 3's two device checks (never-logged exercises still
  rendering as rows; a trailing warm-up not displacing a working set in
  a row's subtitle — see the Done bullet above) remain **open and
  unconfirmed** — dogfooding hasn't specifically targeted them yet.
  **Sequencing after dogfooding wraps:** fix whatever Track/Summary
  issues testing surfaces, then offline support (writes currently fail
  outright with no connectivity — needs to land before auth so every
  write path, including whatever Calendar/Profile end up adding, only
  grows a queue/sync story once), then auth + RLS, then one more EAS
  build, then the APK goes to friends. Track's live PR gold-flash
  remains parked/deferred as before, not scoped yet.
- **Parking lot:** `src/utils/local-date.ts` now EXISTS as the canonical
  home for local-date math (landed with step 5a). `session-repo.ts`'s
  `todayLocalDate()` and `summary-repo.ts`'s `formatDateLocal`/
  `parseDateLocal` are still separate copies, not yet migrated onto it.
  `summary-repo.ts` is guardrailed (see the dogfooding note at the top of
  this section), so its migration stays parked until dogfooding concludes;
  `session-repo.ts` is not guardrailed, so that one can move onto the
  shared util any time.
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
  Also parked: **Calendar's stale-data policy on a background refetch
  failure.** If a same-month refocus refetch fails, `calendar.tsx`
  currently discards the dots that were already correct on screen and
  shows the error banner instead — a real, small regression, taken
  deliberately. Offline support (next in the sequence after dogfooding
  wraps) will set ONE app-wide policy for stale data, retries, and error
  surfacing; building a bespoke stale-while-revalidate for Calendar now
  would mean writing that logic twice and throwing one copy away. Revisit
  during the offline phase, not before.
  Also parked: **Calendar's today-ring can go stale across local
  midnight.** `calendar.tsx` computes `today` per render, so it refreshes
  on refocus but not while the screen sits open uninterrupted across local
  midnight — the brand ring can briefly sit on yesterday's date. Minor,
  and only reachable by late-night training with the screen left open (see
  the 07-30 late-night evidence above).
  Also parked: `day/[date].tsx` renders a working set's number via
  `String(set.workingSetNumber)` guarded by `set.isWarmup`, which leans on
  a correlation the type system doesn't know about — `isWarmup` being
  `false` does not narrow `number | undefined`, so if that invariant ever
  broke this would render the literal string "undefined". Narrowing on
  `set.workingSetNumber === undefined ? 'W' : ...` instead would be
  equivalent today and compiler-enforced. Cheap fix, do it whenever.
  Also parked, low priority: `month-grid.ts`'s `new Date(y, m, d)`
  construction, at local midnight, can roll back a day in a timezone whose
  DST transition happens exactly at midnight — which would duplicate one
  date and drop another. Does NOT apply here: Pakistan has no DST.
  Recorded so it isn't rediscovered as a mystery if this ever ships
  somewhere like Brazil-as-was.

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
- `.upsert()` IS UNUSABLE ON ANY TABLE whose real uniqueness guard is a
  PARTIAL unique index over a nullable `user_id` — this is a GENERAL rule,
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
- YOGA DOES NOT COLLAPSE ADJACENT MARGINS THE WAY CSS DOES — THEY SUM. This
  shipped a doubled gap under Profile's identity row, fixed in `2af8bbd`.
  Rule: vertical spacing between two elements belongs to ONE of them, never
  to both sides of the junction. Any new section dropped into an existing
  stack must carry the same outer spacing as what it replaced, and the way
  to know is to measure the gap above and below before and after the swap.
- THE LINT BAR CHANGED. `331721a` fixed the last pre-existing error, so
  `npm run lint` now passes FULLY GREEN. The bar is no longer "no new
  errors" — it is "lint passes." Any error is new.
- `scripts/verify-profile-utils.ts` COMPILES AND RUNS THE REAL UTIL FILES,
  not reimplemented copies — so the "synthetic tests test a copy, not the
  shipped file" bullet above does NOT apply to
  `src/utils/{bmi,tdee,age,height,relative-strength}.ts`; those are
  genuinely covered. 104 assertions as of `03298dd`. Run with:
  `npx tsc scripts/verify-profile-utils.ts --outDir .tmp-verify --module commonjs --target es2022 --strict --ignoreConfig`
  then `node .tmp-verify/scripts/verify-profile-utils.js`. TS 6.0.3 needs
  `--ignoreConfig` when passing files on the CLI (TS5112). `.tmp-verify/`
  is gitignored.
- READ AND WRITE GET DIFFERENT ERROR TREATMENT, DELIBERATELY. A failed READ
  swallows and falls back with no retry UI (all four Summary cards) —
  correct, because a stale or empty card asserts nothing false. A failed
  WRITE surfaces an inline error (Profile's weigh-in), because a silently
  failed write leaves the user believing data was saved. Corollary learned
  this phase: an empty state that makes a CLAIM (e.g. "Star a lift and log
  a working set") must never be reachable from a failed read — check the
  error flag BEFORE the empty check, or a network failure renders a false
  instruction. See `relative-strength-section.tsx` and
  `caloric-maintenance-section.tsx`.
- COMPARING A ROUNDED FLOAT TO ZERO. Profile's goal delta rounds to 1dp
  BEFORE the `=== 0` comparison. 0.1 is not exactly representable in binary
  floating point — unlike the old 0.5-step wheel's 0.5 — so raw subtraction
  cannot be compared to zero directly once a 0.1 step exists.
- (Claude Code: add rules here every time something is corrected, so mistakes don't repeat)