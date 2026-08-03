// Pure math, no Supabase/React import — same math-vs-fetching split as
// pr-detection.ts and session-blocks.ts.

// kg / (cm/100)^2, rounded to one decimal — and that ROUNDED value is the
// canonical BMI everything downstream (bmiCategory, bmiMarkerPosition) uses.
// DESIGN.md's WHO bands have literal gaps at continuous values (16.95 falls
// in neither 16.0-16.9 nor 17.0-18.4); rounding first closes those gaps
// exactly and makes it impossible for the displayed number and the category
// label to contradict each other.
export function calculateBmi(weightKg: number, heightCm: number): number | undefined {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) {
    return undefined;
  }
  if (weightKg <= 0 || heightCm <= 0) {
    return undefined;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

export type BmiCategory =
  | 'severe thinness'
  | 'moderate thinness'
  | 'mild thinness'
  | 'normal range'
  | 'overweight (pre-obese)'
  | 'obesity class I'
  | 'obesity class II'
  | 'obesity class III';

export type BmiCategoryResult =
  | { kind: 'category'; category: BmiCategory }
  | { kind: 'needs-dob' }
  | { kind: 'under-eighteen' }
  | { kind: 'needs-measurements' };

// A four-way union rather than BmiCategory | undefined: needs-dob,
// under-eighteen and needs-measurements must all stay distinguishable from
// each other, and collapsing any of them into a single `undefined` is
// exactly the three-states-one-token problem parked against
// src/app/exercise/[exerciseId].tsx — an unusable (non-finite) bmi is its
// own state, not silently folded into a category or into needs-dob.
export function bmiCategory(bmi: number, age: number | undefined): BmiCategoryResult {
  if (!Number.isFinite(bmi)) {
    return { kind: 'needs-measurements' };
  }
  if (age === undefined) {
    return { kind: 'needs-dob' };
  }
  if (age < 18) {
    return { kind: 'under-eighteen' };
  }

  return { kind: 'category', category: whoCategory(bmi) };
}

// Cutoffs per DESIGN.md's Profile — Phase 4 section. `bmi` is expected
// already rounded to one decimal (calculateBmi's contract), so a plain `<`
// ladder against the band boundaries is exact — there's no continuous value
// left to fall between two bands.
function whoCategory(bmi: number): BmiCategory {
  if (bmi < 16.0) return 'severe thinness';
  if (bmi < 17.0) return 'moderate thinness';
  if (bmi < 18.5) return 'mild thinness';
  if (bmi < 25.0) return 'normal range';
  if (bmi < 30.0) return 'overweight (pre-obese)';
  if (bmi < 35.0) return 'obesity class I';
  if (bmi < 40.0) return 'obesity class II';
  return 'obesity class III';
}

// Position of the BMI marker on the 15-40 linear scale bar. Clamped at
// either end with an off-scale indicator rather than the bar rescaling.
export function bmiMarkerPosition(bmi: number): { fraction: number; offScale?: 'low' | 'high' } {
  // Non-finite input can't place a marker at all; treat it as off-scale-low
  // rather than let NaN reach the returned fraction.
  if (!Number.isFinite(bmi)) {
    return { fraction: 0, offScale: 'low' };
  }

  if (bmi < 15) {
    return { fraction: 0, offScale: 'low' };
  }
  if (bmi > 40) {
    return { fraction: 1, offScale: 'high' };
  }
  // bmi is finite and within [15, 40] here, so (bmi - 15) / 25 is already
  // in [0, 1] — the old Math.min/Math.max clamp was redundant once the
  // out-of-range cases above are handled, and is removed now that the
  // non-finite guard above covers the one input that could break it.
  return { fraction: (bmi - 15) / 25 };
}
