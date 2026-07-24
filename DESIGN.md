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

- **Numeric input (weight/reps/RPE):** large tap targets, stepper
  affordance alongside direct entry, decimal normalization (already built).
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
- "Add set" primary action in the bottom thumb zone.
- Previous session's numbers for this exercise visible *before* you log
  (so you know what you're trying to beat — this is the whole point of
  progressive overload, it should be the first thing you see).
- Warm-up toggle discoverable but visually recessive.
- Set ladder stacking behavior as described above.

**Phase 1 is complete and pushed.** The redesign above shipped (v3 color
system, `src/constants/track-theme.ts` — see `CLAUDE.md`'s Current
state).

**Phase 1.5 — real-device polish pass (queued, not yet scoped):**
running as a standalone installed build (EAS APK, not Expo Go/web)
surfaced issues that weren't visible before. This is targeted polish on
an already-shipped design, not a redo of Phase 1 — specific pain points
to be filled in during the next chat.

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

- [x] **Track pain points** — Phase 1 shipped; Phase 1.5 (real-device
  polish pass) is queued to capture the pain points that only surfaced
  once running as a standalone installed build. See the Track — Phase 1
  section above.
- [ ] **Dark-mode-only vs. dark+light** — this doc assumes dark-first as
  the practical default for gym lighting/glare. Flag if you want a light
  mode too.
- [ ] **Wordmark** — does "AyFit" get any real lettering treatment, or
  stay plain text in the header?

---

## Workflow

1. Fill in the open decisions above (Track pain points especially).
2. Run the Claude Design session against **Track** first, using this file
   as context.
3. Bring the output back here for review before Claude Code touches it —
   same diff-review loop as the code side.
4. Repeat for **Summary** once Track's tokens are locked in from real use.
