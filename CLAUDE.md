# AyFit — Project Foundation

## Current state
_Last updated: 2026-07-23_

- **Last commit:** e907fad (wire real Progression data into progression-card.tsx)
- **Pushed:** yes, origin/master
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
  Monday-Sunday boundary Volume uses now and Consistency will reuse next.
  Consistency and Recent PRs cards are still on placeholder data.
- **Next:** Consistency query — sessions this week + weekly streak count,
  via `getCurrentWeekRange()` — then wire into `consistency-card.tsx`,
  same pattern as Volume/Progression (data-layer task, tested against
  dev DB, reviewed, then a separate UI-wiring task). After that: PR
  detection — the last and biggest of the four Summary data tasks, and
  it feeds two places at once (Summary's Recent PRs card here, and
  Track's still-deferred PR gold chip/flash from months back). Treat it
  as its own design discussion before scoping as a routine query —
  open questions include computed-live vs. stored all-time-best per
  exercise, and what "just happened" means for a one-time flash vs.
  a historical PR shown in a list. After Summary is fully wired: auth +
  RLS, then EAS Build/APK.
- **Parking lot:** (empty — PR detection moved to Next since it's now
  properly scoped as the next real task, not a someday item.)

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

Note: `nav_category` groups muscles for browsing (Arms = biceps + triceps). We deliberately
dropped a fixed push/pull/legs tag — training is freestyle, so a "day type" is at most an
optional label the user adds later, never something the app enforces.

### exercise
- `id`
- `name` — e.g. Bench press, Incline DB press, Lat pulldown
- `muscle_id` — primary muscle worked
- surfacing: when the user picks a muscle, show **most-recent / most-used exercises first**
  (this is the feature that makes logging "bench again" two taps instead of scrolling)

### session
- `id`
- `date`
- (later) optional label, notes

### set
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
- (Claude Code: add rules here every time something is corrected, so mistakes don't repeat)