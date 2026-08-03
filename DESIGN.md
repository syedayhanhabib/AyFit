# AyFit — DESIGN.md

## Purpose

This is the design system reference for AyFit's UI pass. It feeds two things:
1. The Claude Design tool session (paste relevant sections in as context/system prompt)
2. Claude Code, as the implementation source of truth alongside `CLAUDE.md`

Same review loop as everything else on this project: design tool proposes →
this chat reviews against this file → Claude Code implements → you click
through before committing.

---

## The brief, in one paragraph

AyFit is a lifter's logbook, not a wellness app. It's used mid-set — one
hand on a phone, one hand on a bar, sometimes chalked up, sometimes tired.
The product's whole reason to exist is one number going up over weeks (e1RM)
and one habit staying consistent (sessions per week). The UI's job is to get
out of the way during logging and to feel earned, not gamified, when it
celebrates progress. This is not a marketing-site-for-a-gym-app aesthetic
(no aggressive black-and-red, no motivational-poster energy) and it's not a
generic wellness app either (no cream backgrounds, no soft pastel cards, no
streak-flame badges). It should feel closer to a scoreboard or a physical
logbook than an app.

---

## Priority call: Track first, then Summary

**Track gets redesigned before Summary gets built.**

Reasoning:
- Track is finished and functional, and you use it every single session —
  the pain is live and compounding, and you already told me you don't like it.
- Summary doesn't exist yet. Building it net-new *against* an established
  token system means it's designed right the first time, instead of getting
  built now and then retrofitted once Track's redesign lands anyway.
- Any component the two screens share (numeric readouts, muscle tags, the
  PR moment) only needs to be designed once if Track goes first.

So: Track redesign → Summary build, both pulling from the same tokens below.

---

## Design tokens

### Color

Base palette is dark, warm-charcoal (not blue-black, not pure black) —
practical for gym lighting and glare, and it reads closer to a scoreboard
or rubber gym flooring than a typical app dark-mode.

| Role | Hex | Use |
|---|---|---|
| Background | `#16181B` | Screen background |
| Surface | `#1F2226` | Cards, raised elements |
| Border / hairline | `#2A2E33` | Dividers, input borders |
| Text primary ("chalk") | `#EDEAE3` | Primary text — warm off-white, not clinical white |
| Text secondary | `#8A8F94` | Labels, captions, secondary numbers |
| Text muted (warm-up) | `#55585C` | De-emphasized warm-up sets |

**v3 — one brand color, contained category color, one achievement color.**

v1 spent all color on a rare PR moment and left the first screen flat.
v2 overcorrected — five saturated category colors as full borders/glows
plus a separate plate-tier system plus purple buttons all fired at once,
and it read as a rainbow test strip instead of a designed app (confirmed
by the actual render: three unrelated colors fighting on one PR card).
The fix isn't more restraint *or* more color — it's giving every color a
single, non-overlapping job, and capping how many can appear on screen
at once.

**Rule of thumb: max 2 accent colors visible on any one screen.** Usually
that's brand-purple + one category color, brand-purple + achievement-
gold on a PR moment, or brand-purple + reference-range green on Profile's
BMI card. Category color and achievement color never appear
on the same element.

**1. Brand color — used everywhere, all the time, restrained.**
| Role | Hex | Use |
|---|---|---|
| AyFit purple | `#B14EFF` | Primary buttons, active nav/tab state, the wordmark. Solid fill, not a glow — glow is reserved for #3 below. |

**2. Category color — an identifier, not a decoration.** Contained to the
smallest possible element: the icon glyph fill, or a single small dot next
to the label. Never a border, never a background tint, never a glow.
Five categories, five hues, but you should be able to cover the dot with
your thumb and lose nothing but "which muscle is this."

| Category | Hex |
|---|---|
| Chest | `#FF3860` |
| Back | `#2EE6FF` |
| Arms | `#F5FF3D` |
| Legs | `#4CFF6B` |
| Shoulders | `#B14EFF` (same value as brand purple — fine, they're allowed to coincide) |

**3. Achievement color — one color, one meaning, everywhere in the app.**
| Role | Hex | Use |
|---|---|---|
| PR gold | `#FFC738` | *Only* fires on a genuine PR. Same color regardless of which muscle or exercise, so "you got stronger" is instantly recognizable and never confused with routine navigation. This is the one place glow/motion is allowed to show up. |

This replaces the earlier plate-tier system (color-per-weight-tier) —
that was a second competing color system on top of category color, which
is exactly what made the render feel chaotic. One consistent gold for
every PR is simpler and reads faster.

**4. Reference-range color — one narrow job, one screen.**
| Role | Hex | Use |
|---|---|---|
| Reference range | `#2E5D45` | The BMI normal-range band fill on Profile. Nowhere else. Deliberately desaturated so it reads as "in range" rather than as a reward, and deliberately NOT Legs green `#4CFF6B` — category color means *which muscle*, so reusing it here would state something false. |

Base neutrals (`#16181B` background, `#1F2226` surface, chalk text) still
carry every screen. Color is the exception, not the atmosphere — that's
what makes the purple and the gold actually pop instead of drowning in
five other hues.

### Typography

Two roles, doing two different jobs:

- **Numeral face** — tabular/monospaced (e.g. JetBrains Mono or IBM Plex
  Mono, both available via `@expo-google-fonts`). Used *only* for weight,
  reps, RPE, e1RM, and PR numbers. Tabular figures mean a column of sets
  lines up like a ledger instead of jittering as digit widths change —
  and the monospace look itself signals "this is data" the moment you
  see it, before you've even read the number.
- **UI face** — a plain humanist sans (e.g. Inter or IBM Plex Sans).
  Used for everything else: labels, nav, InfoTip copy, body text. Quiet,
  gets out of the way.

Suggested scale (size/line-height):
| Token | Size/LH | Face | Use |
|---|---|---|---|
| Numeral-lg | 40/44, tabular | Numeral | e1RM headline, PR number |
| Numeral-sm | 20/24, tabular | Numeral | Per-set weight × reps |
| H1 | 24/32 | UI | Screen titles |
| Body | 16/24 | UI | Labels, InfoTip text |
| Caption | 13/18 | UI | Timestamps, secondary metadata |

### Layout & spacing

- 4px base unit.
- Minimum touch target **48×48pt** — bigger than the usual 44pt minimum,
  because this is used with sweaty or chalked-up thumbs, often one-handed.
- Track's primary action ("add set") lives in the bottom thumb zone,
  reachable without shifting grip.

### Motion

Spend it in one place, same rule as color. Two deliberate moments only:
1. **The set ladder** (see below) — a new set stacks into place rather
   than just appearing, echoing loading a plate onto a bar.
2. **The PR flash** — brief gold (`#FFC738`) flash + haptic tick when a
   new best lands. One-time per PR, non-blocking (doesn't interrupt
   logging). Nowhere else in the app gets a glow — that's what keeps this
   one meaning it.

Nothing else animates. Fast and utilitarian beats polished-but-slow here.

---

## Component patterns

- **Numeric input (weight/reps/RPE):** three large tappable **value chips**
  in a row — label above, big monospace value below, no controls embedded in
  the row. Tapping one opens a **snap-scrolling wheel picker** (native
  alarm-picker feel: large digits, one value locked in a centered band,
  neighbours dimmed) for that field alone. Kg steps 2.5 (2.5–300), reps step
  1 (1–50), RPE steps 0.5 (1–10).
  ~~Stepper affordance alongside direct entry.~~ Superseded in Phase 1.5
  batch 3 — see the Track section below for why.
- **Warm-up set:** muted text color, smaller numeral scale, no monospace
  emphasis — recedes optically without being hidden.
- **e1RM readout:** smoothed sparkline or trend arrow next to the number,
  not a bare decimal. Ties directly to the existing "trust the trend, not
  the exact number" principle already in `CLAUDE.md`.
- **PR card:** gold flash + haptic, auto-surfaced, no manual tagging (per
  existing spec) — celebratory but not loud, and never sharing the card
  with a category color (see color discipline rule above).
- **Muscle/category tag:** icon glyph or a single small dot carries the
  category color — label text, borders, and background stay neutral.
- **The set ladder (Track's signature layout element):** logged sets stack
  visually as you add them — newest set added at the bottom, pushing the
  ladder upward — so the screen itself visualizes "stacking plates" as the
  session builds. This is the one place Track gets a genuinely distinctive
  layout idea rather than a generic list.

---

## Screen specs

### Track — Phase 1 (redesign)

Flow stays as-is (it works): muscle picker → exercise list → per-set
logging. This is a visual/interaction pass, not a rebuild.

Non-negotiables regardless of your specific complaints:
- Warm-up toggle discoverable but visually recessive.
- Set ladder stacking behavior as described above.

Superseded by Phase 1.5 real-device findings (see below) — no longer
current:
- ~~"Add set" primary action in the bottom thumb zone.~~ Real-device use
  showed the opposite problem: as the set ladder grows, a bottom-pinned
  input scrolls out of reach relative to the header, not into a thumb
  zone. The weight/reps/RPE input + warm-up toggle + Add Set now live in
  a card pinned just below the header instead, so they never scroll away
  regardless of how many sets are logged.
- ~~Previous session's numbers for this exercise visible *before* you
  log.~~ In practice the number you're actively beating each set is your
  own e1RM-this-session (already visible, already updating live) — LAST
  TIME is reference context you check occasionally, not something that
  needs to be the first thing on screen. It now trails at the bottom of
  the scroll, after the set ladder.

**Phase 1 is complete and pushed.** The redesign above shipped (v3 color
system, `src/constants/track-theme.ts` — see `CLAUDE.md`'s Current
state).

**Phase 1.5 — real-device polish pass, batch 1: complete, not yet pushed.**
Running as a standalone installed build (EAS APK, not Expo Go/web)
surfaced issues that weren't visible before:
- Tab bar: Android's BottomNavigationView was collapsing to
  selected-label-only with 4 tabs, and two of the four tab icons were
  placeholder duplicates. Fixed via `labelVisibilityMode="labeled"` +
  real MaterialCommunityIcons per tab.
- Header safe-area: the per-set logging screen's header had no
  safe-area handling, colliding with the status bar/notch on-device
  (back button wasn't reliably tappable). Now wrapped in `SafeAreaView`
  like Track/Summary already were.
- Screen order flip: see the superseded non-negotiables above — input
  card now leads (pinned below the header), LAST TIME now trails (end
  of scroll).
- Numeral size: the live weight/reps/RPE input used the Numeral-sm
  (20/24) token, sized for *already-logged* past sets, not the value
  you're actively typing. Bumped to 28/32 — Numeral-lg (40/44) felt
  oversized squeezed into the three-field stepper row. (That stepper row
  itself is gone as of batch 3, below; the 28px numeral survived it.)
- Wordmark got its real lettering treatment (see Open decisions below)
  and the glossary/InfoTip system is now fully wired on Track's logging
  screen (RPE + warm-up tips added, e1RM tip's copy expanded).

**Phase 1.5 — batch 3: the stepper row is gone.** The Kg/Reps/RPE input
is now three tappable value chips + a wheel-picker modal per field (see
**Numeric input** under Component patterns above).

Why the stepper row was abandoned rather than tuned again:
- It had already been squeezed across two prior rounds — widening the
  input boxes, re-balancing the flex ratios, dropping the separators —
  and still didn't reliably fit on a real device. Three
  `label + minus + textbox + plus` clusters in one row is ~9 hit targets
  and 3 text fields competing for ~300pt; that's a structural problem
  with the pattern, not a width value left to find. Removing the
  embedded +/- controls removes the edge-cramming entirely: the chip row
  now has 3 hit targets and nothing to squeeze.
- The steppers' `TextInput`s meant the real input path was the numeric
  keyboard, and a scroll-wheel (alarm/time-picker style) was explicitly
  preferred over typing.

Consequences worth keeping in mind:
- There is no free-text numeric entry on this screen any more, so every
  loggable value must exist as a stop on some wheel. The wheels are
  therefore defined so that *every* value on them passes the screen's
  existing validators — notably the weight wheel starts at 2.5, not 0,
  because 0 has always failed validation and a selectable-but-invalid
  stop would silently disable "Add set". Validation logic itself was not
  touched by this change.
- Values off-grid (e.g. 61kg, RPE 7.25) are no longer expressible. That's
  accepted: the grid matches real plate math and the RPE scale's useful
  resolution.

Batch 2 was skipped in favour of this; further real-device pain points
beyond it are not yet scoped.

### Track — exercise list (designed, NOT yet implemented — commit 4)

Spec only. The data layer landed in commit 2 (`exercise_favourite`,
`exercise.movement_group` — see `CLAUDE.md`); none of the UI below exists
yet.

- **Two sections: Favourites (star toggle), then A–Z.** No recents section.
  Favourites are explicit, not inferred — the reasoning is recorded against
  the struck-out surfacing bullet in `CLAUDE.md`'s data model.
- **Back additionally gets `movement_group` section labels**, in the display
  order **vertical pull → horizontal pull → traps → lower back**. That order
  is a client-side constant: not alphabetical, and not stored in the
  database. Every other muscle's rows are NULL and render unlabelled.

**Governing principle: drill down where the split is unambiguous. Label
where it is fuzzy.**

Arms, Legs and Shoulders drill down to a muscle picker because nobody
confuses a bicep with a tricep — the tile you want is obvious. Back stays
whole with labels instead, because upper-vs-lower back is a coin flip for a
non-expert. The asymmetry is about the cost of guessing wrong: a wrong tile
guess is a dead-end empty screen you have to back out of, whereas a wrong
guess against a label costs a scroll — it degrades gracefully, because
everything is still on the one screen.

**Why chest needs no labels:** the angle-first naming grammar
(`[Angle] [Equipment] [Movement]`) already does the grouping, since every
incline variant clusters under I, every flat variant under F. Back is the
one muscle alphabetisation cannot reach — "Lat pulldown", "Pull-up" and
"Chin-up" are the same movement pattern filed under three unrelated
letters. Labels are the fallback for exactly that case, not a default.

### Summary — Phase 2 (new build)

Priority order top-to-bottom (unchanged from `CLAUDE.md`):
1. **Consistency** — sessions this week, streak. Ledger-style, quiet —
   not a gamified streak-flame icon.
2. **Recent PRs** — gold-accented cards, exercise + date, same single
   achievement color every time.
3. **Progression** — per-exercise e1RM line, exercise picker, time-range
   toggle (week/month/all-time). Monospace numerals, smoothed line,
   muted-secondary axis labels.
4. **Volume by muscle** — weekly set count/tonnage bars, each bar tinted
   with its category color (contained to the bar fill itself, not the
   whole card).

### Calendar — Phase 3

Calendar is complete — data layer, month grid, `/day/[date]` detail route,
and navigation are all built and device-verified. The spec below is
retained as the record of the decisions behind it, not as an unbuilt plan.
One item remains unverified against real data: the return-to-an-exercise-
later block split and its continuous numbering, which needs a real session
that doubles back on a lift.

**Governing rule: Calendar is a LEDGER, not a metric.** Warm-ups are
included throughout and count toward a day being "trained." Track and
Summary exclude them because they skew e1RM/volume/PR math; Calendar does
no math at all, so there's nothing for a warm-up to skew. This rule settles
most of what follows, which is why it's stated first rather than left
implicit.

**Month grid.**

- **One month at a time. Header shows a plain day-trained count, on its
  own line below the month and year** — "JULY 2026" with "12 days trained"
  beneath it, not inline with an interpunct. A month name plus a growing
  count sharing one 16px-semibold line risks wrapping depending on the
  month and the digit count, and a wrap would shift the grid below it
  unpredictably from month to month, so the count gets its own stable line
  instead. The noun is "days trained," never "sessions": `getTrainedDaysInMonth`
  returns DISTINCT DATES, so two sessions logged on the same day count
  once, and labelling that "sessions" would quietly reintroduce the exact
  session-vs-day confusion the trained-day definition below exists to
  prevent. It's also never a fraction like `3/5` or `3/31` — a
  days-elapsed denominator implies a target of training every single day,
  so it renders as a progress bar that is permanently and correctly
  failing. Rate/consistency is Summary's job (sessions this week, weekly
  streak); Calendar answers "what happened," not "how am I doing." The two
  must not compete over the same question.
- **A trained day = a day with >=1 `workout_set` row, never a day with
  merely a `session` row.** An empty session row is possible today:
  `getOrCreateTodaySession` creates the row up front, and a failed set
  insert (the current no-connectivity failure mode) leaves it childless.
  Keying the dot off session rows would put a dot on a day with no actual
  training logged. The same single definition drives both the dot and the
  header count — see `calendar-repo.ts`'s `getTrainedDaysInMonth`.
- **Dots are neutral chalk. One dot, one meaning: you trained.** NOT
  category-coloured — 12 dots in 5 hues on one grid is the v2
  rainbow-test-strip failure already recorded above, and it breaks the
  max-2-accents-per-screen rule on what's potentially the busiest surface
  in the app. Brand purple is reserved for today's ring and the selected
  day, keeping the screen at one accent total.
  **Correction, walked back deliberately, not quietly dropped:** an earlier
  version of this bullet said muscles-worked belonged in the day detail,
  "where there's room to show it." Muscle chips there are now DEFERRED, not
  planned. `getSessionDayDetail` returns exercise names and sets, no muscle
  data — a chip needs a new join through `exercise.muscle_id`, and then a
  colour decision, which would drag category colours onto a second screen
  immediately after this file recorded why they failed on the first one.
  The block list directly below the header already states what was
  trained — a typical day is three exercise names — so chips would just
  restate that, in colour, at the cost of an extra query. If muscle chips
  ever land here, they need a reason beyond "there's room."
- **Grid columns run Monday-first: Mon Tue Wed Thu Fri Sat Sun.** Not a
  free choice — `summary-repo.ts` already buckets weekly streaks by "the
  Monday of its week," and the Consistency card's day-by-day ledger strip
  is Monday-first too (per `summary-repo.ts`'s own comment: "which days of
  this week (Monday-first) have a logged session"). If Calendar's grid
  disagreed, the two screens would silently disagree about what "this
  week" means, and it would surface only as a number that looks slightly
  off rather than an obvious bug. Verified by reading `summary-repo.ts`
  directly — reading is fine while it's dogfooding-guardrailed against
  modification; only editing it is not.
- **Because it's a pushed route, Calendar stays mounted underneath it — so
  the month query goes on `useFocusEffect` (imported from `expo-router`),
  not `useEffect`.** Same reasoning as `fd64f34`, whose exercise-list half
  was this exact shape: stale data reached by back-navigation rather than
  a tab switch.
- **No day cell without a dot is tappable — past or future.** The absence
  of a dot IS the empty state, rendered inline at a glance for every day of
  the month simultaneously; pushing a route to say "nothing happened"
  again in words would be a screen transition carrying zero new
  information. "Nothing logged" copy still exists, but it's `/day/[date]`'s
  own defensive empty state, not something the grid ever navigates you to.
  It's genuinely reachable, just not from the grid: `getSessionDayDetail`
  returns `null` for any date hit directly by URL (a bookmark, a deep link,
  a typo'd date), and a route that can render `null` needs copy for that
  case rather than crashing or going blank. The app does not have opinions
  about the user's week either way; that's the no-motivational-poster-
  energy line from the brief, applied here — "Nothing logged," never "you
  didn't work out."

**Day detail.**

- **Day detail is a pushed route (`/day/[date]`), not a modal or bottom
  sheet.** Three reasons: a real session can run long enough to need proper
  scrolling; params-in-the-URL matches every other navigation pattern
  already in this app; and this codebase has already been bitten once by
  list virtualization inside a `Modal` (the `initialScrollIndex` /
  `onContentSizeChange` trap in `wheel-picker-modal.tsx`), with no reason
  to walk back into that trap here.
- **Day-detail header: the date, plus a plain count line mirroring the
  month header's structure** — e.g. "13 sets · 3 exercises." Both numbers
  are derivable straight from `getSessionDayDetail`'s existing return
  value, so this costs no extra query. Warm-ups COUNT toward the set
  total, per the governing ledger rule at the top of this section.
- **Day detail renders sets in performed order, with consecutive runs of
  the same exercise collapsed under one header.** Returning to an exercise
  later in the session produces a SECOND block — bench → rows → bench is
  three blocks, not two. Session order is the truth being preserved here,
  and the interleaving is itself information: it shows whether things were
  supersetted or run straight through. (`groupIntoSessionBlocks` in
  `session-blocks.ts` is the pure function that does this, verified
  synthetically against an `A A B B A` case.)
- **Working sets are numbered CONTINUOUSLY per exercise across the whole
  day; warm-ups are marked "W" instead of a number.** The problem this
  solves: two "BENCH PRESS" headers on one screen reads as a duplicate-
  render bug, and a "(2)" suffix or a "cont." label would only patch the
  symptom. Continuous numbering means a second bench block opens at set 4,
  which doesn't merely disambiguate — it explains itself: you came back to
  it. It also matches how a session gets described out loud, and marking
  warm-ups "W" keeps them present (per the governing ledger rule) without
  letting them consume working-set numbers. This numbering is pure
  derivable logic, so it belongs in a testable util rather than inline in
  the component — which is why 5c splits in two: 5c-i adds numbering to
  `session-blocks.ts`, 5c-ii builds the route.
- **Warm-up sets appear in the detail, recessive in STYLING ONLY — and are
  NEVER regrouped.** Styled per this file's existing warm-up pattern
  (muted `#55585C`, no monospace emphasis), included per the governing
  rule above. Grouping warm-ups into their own sub-section within a block
  would reorder them, and performed order is the entire reason this
  screen exists. Side benefit: a trailing warm-up logged after working
  sets becomes plainly visible here, in order — which is a reproduction
  AID for one of CLAUDE.md's two unconfirmed dogfooding checks (a trailing
  warm-up not displacing a working set's subtitle, from commit 3), not a
  confirmation of it. Calendar makes the DATA CONDITION visible — that a
  trailing warm-up exists on some exercise that day, the hard part of
  reproducing the bug — but the check itself is about Track's subtitle
  rendering, which Calendar cannot confirm.
- **If day detail ever renders time-of-day, `created_at` must be converted
  to local time.** It's `timestamptz` and comes back `+00:00`. Real
  evidence from the 5a smoke run: a session dated `2026-07-30` has
  `created_at` values from `2026-07-29T19:31Z` through `20:17Z` — `00:31`
  to `01:17` local at UTC+5. Rendered naively, that reads as the wrong day
  *and* the wrong time.
- **No per-set times in 5c, deliberately.** `created_at` is available, and
  rest gaps between sets are genuinely interesting — the 2026-07-30
  session has a ~21-minute gap before its last exercise — but rendering
  times needs the UTC→local conversion the bullet above already covers,
  plus a gap-formatting decision, and it doubles a row's information
  density on a screen whose first job is showing what happened in order.
  Ship the ledger first; times have to earn their place later.

**Month navigation: arrows only, no swipe.**

- Two arrow `Pressable`s, 48pt touch targets each — NOT a swipe pager.
  Swipe needs a horizontal pager holding three month grids at once,
  adjacent-month prefetch so a gesture doesn't reveal a blank grid
  mid-swipe, and a windowing/fetch-ahead policy — roughly three queries in
  flight versus one query per tap for arrows. Momentum and snap tuning on
  a paged list is also the exact category of problem that already cost
  this project time once, in `wheel-picker-modal.tsx`. This doesn't
  foreclose swipe later: `getTrainedDaysInMonth(year, month)` is already
  the right shape for either navigation style, so this is a UI-only
  decision that can be revisited without touching the data layer.
- The **forward arrow is disabled on the current month** — dimmed per the
  existing disabled-state pattern, not hidden, so the header layout
  doesn't shift as the button toggles. There's no scheduling feature in
  this app, so forward navigation past the current month would only ever
  lead to an unbounded run of empty grids.
- **Backward navigation is unbounded**, for now. Capping it at the
  earliest logged session would cost another query to serve an edge case
  nobody will actually reach; empty months before any real history simply
  render empty.
- A **"Today" text button** appears in the header only when the viewed
  month is not the current month, and disappears otherwise — conditional
  chrome, no accent colour. Without the condition, getting back from six
  taps deep would cost another six taps forward; with it, the button is
  only present when it's actually useful.

### Profile — Phase 4

**Governing rule: Profile is a reference screen, not an advice screen.** It
holds the few scalars the rest of the app cannot derive, and everything it
displays is computed from those. It states facts about your body; it never
issues instructions. No targets, no rates, no "you should." This settles most
of what follows — the BMI discipline and the TDEE fence below are both just
this rule applied.

Profile is also **the first screen outside Track that writes** (a
`bodyweight_log` insert, a `profile` upsert), which puts it in scope for the
offline queue story.

**What it holds, and why each field earns its place.** CLAUDE.md's original
Profile line is *bodyweight tracking ONLY if something consumes it. Don't
store unused data.* Applied to all six:

| Field | Consumed by |
|---|---|
| `height_cm` | BMI, TDEE |
| bodyweight | BMI, TDEE, relative strength, goal delta, future chart |
| `date_of_birth` → age | **TDEE only** |
| `sex` | **TDEE only** |
| `goal_weight_kg` | delta readout, future chart target line |
| `name` | header greeting; becomes auth's mirror later |

**DOB and sex are dead data without TDEE** — BMI uses neither. That is the
actual argument for building the calorie estimate: not a bolt-on, but what
makes two of the six fields legitimate.

**Bodyweight is a time series, not a field.** `bodyweight_log (date,
weight_kg)`, one canonical weigh-in per LOCAL date; "current weight" is the
latest row, computed. Same reasoning as e1RM, Volume and PRs being
computed-live: a mutable `weight_kg` column means every update destroys the
prior value, and the bodyweight-over-time chart that justifies the field
becomes impossible retroactively and permanently. Landed in `2eb5f5b`. `date`
is written via `todayLocalDate()`, never derived from a `timestamptz`'s UTC
face.

**Inputs reuse Track's components as-is.** Weight, height and DOB go on
`ValueChip` + `WheelPickerModal` (`src/components/track/`). Sex is a
two-option chip pair. Name is the screen's only free-text field. Those two
components are not guardrailed, but the guardrailed logging screen consumes
them — so Profile uses them UNMODIFIED. If Profile needs different behaviour,
that is a new component, not an edit.

- **Height enters as ft + in, stores as cm.** Display-only conversion,
  contained to the input. Nobody here knows their height in centimetres.
- **No kg/lb toggle.** Everything is kg-native down to the weight wheel; a
  display unit touches every screen for no benefit to the actual users.
- **The screen must render sensibly with every field null** — that is the
  day-one state, before a profile row exists at all.

**BMI.** Build it, with three constraints that are not optional.

*1. The scale shows geometry; the label carries the medicine.* Eight WHO
categories cannot be legibly labelled across ~340pt, so the bar renders the
normal-range band tinted with subtle boundary ticks, and a text line below it
states the precise WHO category. Full granularity in words, simple shape in
the bar:

- under 16.0 — severe thinness
- 16.0–16.9 — moderate thinness
- 17.0–18.4 — mild thinness
- 18.5–24.9 — normal range
- 25.0–29.9 — overweight (pre-obese)
- 30.0–34.9 — obesity class I
- 35.0–39.9 — obesity class II
- 40.0 and above — obesity class III

Scale spans **15–40 linearly**; the marker clamps at either end with an
off-scale indicator rather than the bar rescaling.

*2. Colour.* The normal-range band uses the new `#2E5D45` reference-range
token (see Design tokens above for why it is not Legs green). Marker is brand
purple; everything else on the bar stays chalk/border neutral. That is **2
accents, at the cap** — so nothing else on Profile may introduce a third while
the BMI card is visible. **No PR gold anywhere on Profile**: gold means a PR
event, and Profile shows current ratios, not events.

*3. The lifter caveat is on the screen, not in the tooltip.* One quiet,
always-visible line under the bar. BMI has no body-composition term, so lean
mass reads as fat mass — a 178cm/95kg lifter is BMI 30.0 and is not obese.
This app is FOR lifters, its brief says no motivational-poster energy, and
Calendar's copy rule is already "Nothing logged," never "you didn't work out."
A red OBESE marker on a training partner six months into progressive overload
violates both and is also simply wrong about him.

Dependency chain, stated per-element rather than all-or-nothing:
- The BMI **number** needs height + weight.
- The WHO **category** additionally needs age >= 18 — fixed cutoffs are
  invalid for minors, who need age-and-sex percentile charts. Under 18 renders
  the number plus that explanation, not a category.
- DOB absent: number renders, category says it needs DOB.

**Cutoffs are standard WHO. The Asian/South Asian thresholds** (overweight
23.0, obese 27.5) **are named in the tooltip only, not switched into the
scale.** A scale that disagrees with every other BMI calculator the users have
seen reads as a bug, not as localisation.

**The BMI tooltip is long by design** — a paragraph, not the glossary's usual
2–3 lines: what it measures, what it does not, why lifters read high, the
population caveat. RPE is three lines because RPE genuinely is that simple.
Open check: whether `InfoTip` renders a paragraph gracefully or needs a
scrollable variant.

**Caloric maintenance (TDEE).** Mifflin-St Jeor for BMR — male:
`10*kg + 6.25*cm - 5*age + 5`; female: `10*kg + 6.25*cm - 5*age - 161`.

**The activity multiplier is derived from logged sessions, not
self-reported.** Every other calculator asks, and everyone guesses
optimistically. AyFit already knows.

It must be a **trailing average over the last 4 COMPLETE weeks**, not
`getConsistency()`'s `sessionsThisWeek`. An earlier version of this decision
said to reuse `sessionsThisWeek` and that was wrong: it is a PARTIAL week, so
on a Monday it reads 0 or 1 and TDEE would swing by hundreds of kcal across
every week purely from where you are in it. Recorded as a correction rather
than quietly fixed. The trailing average needs a new read-only query in a new
repo file — permitted; `summary-repo.ts` stays untouched.

Mapping average sessions/week to multiplier: 0 → 1.2, 1–2 → 1.375, 3–4 →
1.55, 5–6 → 1.725, 7+ → 1.9. **The derivation renders alongside the number**
("based on 3.5 sessions/week over the last 4 weeks") so it reads as a
measurement, not magic.

**The fence: one read-only number with an accuracy caveat, and nothing
downstream consumes it.** No food logging, no macro split, no deficit or
surplus targets. Formula TDEE runs roughly ±15–20% against measured, and the
moment a calorie number becomes actionable in-app you have started building a
nutrition tracker inside a lifting tracker. TDEE needs all four of sex, DOB,
height and weight; any missing and the card is HIDDEN, not shown erroring.

**Relative strength.** e1RM ÷ current bodyweight, per lift — "1.62×
bodyweight bench." How lifters actually talk about strength, the single best
use of the bodyweight field, and zero new tables. It is also the honest
counterweight to BMI on the same screen: one number says your mass-to-height
ratio is 27, the next says you press 1.6× your own bodyweight. Numbers stay
chalk — no accent, per the 2-accent cap.

**Which lifts: FAVOURITES**, intersected with lifts that have e1RM history.
`exercise_favourite` already exists, and favourites are explicit and
user-controlled; top-N-by-history-depth was rejected because it is implicit
ranking, which is exactly the pattern the struck-out recency surfacing already
rejected once. If no favourite has history, the card shows an empty state
pointing at the star toggle. **Known wart, accepted:** favourites can include
isolation work, and "0.3× bodyweight cable lateral raise" is technically
correct and fairly meaningless. Tolerable because Profile ranks nothing and
states rather than advises — recorded so it is not rediscovered as a bug.

**Guardrail note, load-bearing:** the guardrail forbids MODIFYING
`workout-set-repo.ts`, not importing from it. `getExercisesWithHistory` and
`getE1rmHistory` are already exported and Profile calls them untouched.

**Goal weight.** Nullable; the whole thing hides when unset. Renders as a
plain delta from current weight, and later as the target line on the
bodyweight chart — a real consumer beyond a readout. A goal the USER set is
the user's opinion, not the app having one, so it stays inside the brief.
**Never with a deadline or a rate** — "lose 0.5kg/week" is advice, which the
governing rule forbids.

**Bodyweight chart — deferred, with a specific reason.** Ship the log and a
plain reverse-chronological list of entries now. Not caution: the Catmull-Rom
smoothing and range filtering live inside `progression-card.tsx`, which is
guardrailed. Doing it properly means extracting that math into a shared util —
an edit to a guardrailed file. Doing it improperly means a second copy of the
chart math, which is exactly the `fmt()` duplication the shared-util
convention exists to prevent, already caught twice. The chart lands when the
guardrail lifts and the math is extracted once. Nothing is lost meanwhile: the
data accrues from day one, and that is the part that cannot be backfilled.

**Explicitly out:** steps, water intake, sleep, resting heart rate. Nothing in
AyFit consumes any of them; each is a field maintained forever for no output.
Same rule that killed implicit-recency surfacing.

**Screen order, top to bottom:** header (wordmark + name) → bodyweight
(current, log today's, goal delta — first because it is the only thing logged
repeatedly here) → BMI → relative strength → TDEE → details (name, DOB, sex,
height — rarely changed, so last).

**Glossary additions:** `BMI` (long-form, per above), `TDEE`, `relative
strength`.

---

## Open decisions — resolve before/at the design tool session

- [x] **Track pain points** — Phase 1 shipped; Phase 1.5 batch 1 (see
  the Track — Phase 1 section above) captured and fixed the first round
  of real-device pain points. Further batches not yet scoped.
- [ ] **Dark-mode-only vs. dark+light** — this doc assumes dark-first as
  the practical default for gym lighting/glare. Flag if you want a light
  mode too.
- [x] **Wordmark** — "AyFit" now gets real lettering treatment:
  **Unbounded ExtraBold**, deep-purple-to-brand-purple diagonal gradient
  fill (`src/components/wordmark.tsx`). Revised in Phase 1.5 batch 3:
  the first pass was Space Grotesk bold with the gradient running
  light → dark, which faded out toward the tail of the word; it now runs
  dark → light along the same diagonal so it brightens as it reads. Font
  swapped for a display face with more character than Space Grotesk;
  Unbounded's letterforms are wide enough that the wordmark's tracking
  drops to 0. Rendered at 30 on Track and 26 on Summary (up from 22/20 —
  both headers had spare vertical space), with the eyebrow line under it
  at 14 (up from 12).

---

## Workflow

1. Fill in the open decisions above (Track pain points especially).
2. Run the Claude Design session against **Track** first, using this file
   as context.
3. Bring the output back here for review before Claude Code touches it —
   same diff-review loop as the code side.
4. Repeat for **Summary** once Track's tokens are locked in from real use.
