// Pure math, no Supabase/React import — same math-vs-fetching split as
// pr-detection.ts and session-blocks.ts. `import type` below erases at
// compile time, so this file stays free of any runtime dependency.
//
// This import must stay RELATIVE, not `@/types/profile`: scripts/verify-
// profile-utils.ts compiles these utils via a standalone `npx tsc --module
// commonjs` invocation with no tsconfig, so there's no `paths` mapping
// available (`paths` can't be passed on the CLI) — the alias would fail to
// resolve there.
import type { Sex } from '../types/profile';

// Mifflin-St Jeor BMR, unrounded — DESIGN.md's Profile — Phase 4 formula.
export function calculateBmr(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number | undefined {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || !Number.isFinite(age)) {
    return undefined;
  }
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    return undefined;
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// Nearest whole training day, clamped to >= 0. Extracted out of
// activityMultiplier below so the UI's derivation line ("based on N
// training days/week") and the multiplier band it also feeds share exactly
// one rounding rule, rather than a number and its own label each carrying a
// separate copy of it. Non-finite input returns 0, NOT activityMultiplier's
// own 1.2-multiplier clamp — that clamp keeps maintenance calories
// conservative on bad input, which is a fact about the multiplier band, not
// about the day count rendered beside it, so it stays local to
// activityMultiplier rather than moving in here.
export function roundedTrainingDays(avgTrainedDaysPerWeek: number): number {
  if (!Number.isFinite(avgTrainedDaysPerWeek)) {
    return 0;
  }
  return Math.max(0, Math.round(avgTrainedDaysPerWeek));
}

// Average trained days/week -> activity multiplier. Rounds to the nearest
// whole day first (roundedTrainingDays above), then bands — DESIGN.md gives
// integer bands for a fractional input, and interpolating between them would
// be false precision over buckets that are themselves coarse. Negative
// input clamps to 0 (no such thing as negative training days).
export function activityMultiplier(avgTrainedDaysPerWeek: number): number {
  // A bad reading (NaN/Infinity) must never overstate maintenance calories,
  // so unusable input clamps to the same conservative end as the true
  // zero-days case, not to the highest band. This guard is defensive
  // against any future caller, not the 4-complete-week average query in
  // src/lib/activity-repo.ts — that query's divisor is a constant 4 and it
  // returns undefined outright on zero history, so it cannot itself produce
  // NaN or Infinity here.
  if (!Number.isFinite(avgTrainedDaysPerWeek)) {
    return 1.2;
  }

  const rounded = roundedTrainingDays(avgTrainedDaysPerWeek);

  if (rounded === 0) return 1.2;
  if (rounded <= 2) return 1.375;
  if (rounded <= 4) return 1.55;
  if (rounded <= 6) return 1.725;
  return 1.9;
}

// TDEE = BMR * activity multiplier, rounded to the nearest 50 kcal. Formula
// TDEE runs roughly +/-15-20% against measured, so a to-the-kcal figure
// claims precision it does not have.
export function calculateTdee(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  avgTrainedDaysPerWeek: number,
): number | undefined {
  const bmr = calculateBmr(sex, weightKg, heightCm, age);
  if (bmr === undefined) {
    return undefined;
  }

  // Mifflin-St Jeor was derived and validated on adults, so a minor is out
  // of the equation's domain — same reason DESIGN.md refuses a fixed-cutoff
  // BMI category under 18. Enforced here (not in a render condition) so the
  // rule is testable, and the UI's existing "any input missing -> hide the
  // card" branch then covers it for free. calculateBmr itself is unchanged —
  // it stays a raw formula, this restriction is TDEE-only.
  //
  // Order is load-bearing: this check is only safe run AFTER calculateBmr
  // above has already rejected non-finite input. `NaN < 18` is `false`, so a
  // NaN age would sail straight through this check on its own — reordering
  // these two guards would silently reopen that hole.
  if (age < 18) {
    return undefined;
  }

  const tdee = bmr * activityMultiplier(avgTrainedDaysPerWeek);
  return Math.round(tdee / 50) * 50;
}
