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

// Average logged sessions/week -> activity multiplier. Rounds to the nearest
// whole session first, then bands — DESIGN.md gives integer bands for a
// fractional input, and interpolating between them would be false precision
// over buckets that are themselves coarse. Negative input clamps to 0 (no
// such thing as negative sessions).
export function activityMultiplier(avgSessionsPerWeek: number): number {
  // A bad reading (NaN/Infinity) must never overstate maintenance calories,
  // so unusable input clamps to the same conservative end as the true
  // zero-sessions case, not to the highest band. This guard is defensive
  // against any future caller, not the 4-complete-week average query in
  // src/lib/activity-repo.ts — that query's divisor is a constant 4 and it
  // returns undefined outright on zero history, so it cannot itself produce
  // NaN or Infinity here.
  if (!Number.isFinite(avgSessionsPerWeek)) {
    return 1.2;
  }

  const rounded = Math.max(0, Math.round(avgSessionsPerWeek));

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
  avgSessionsPerWeek: number,
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

  const tdee = bmr * activityMultiplier(avgSessionsPerWeek);
  return Math.round(tdee / 50) * 50;
}
