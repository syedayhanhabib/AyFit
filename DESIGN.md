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
that's brand-purple + one category color, or brand-purple + achievement-
gold on a PR moment. Category color and achievement color never appear
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
