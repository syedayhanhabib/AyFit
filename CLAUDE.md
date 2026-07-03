# AyFit — Project Foundation

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
- (Claude Code: add rules here every time something is corrected, so mistakes don't repeat)