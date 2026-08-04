// Pure math, no imports — same math-vs-fetching split as pr-detection.ts and
// session-blocks.ts.
//
// `height_cm` (numeric(4,1)) is the stored canonical unit — ft/in is
// display-and-input only, per DESIGN.md's Profile — Phase 4 section ("Height
// enters as ft + in, stores as cm"). The pair must round-trip:
// 5'7" -> 170.2 -> 5'7".

// Total inches * 2.54, rounded to ONE decimal (height_cm's column precision).
// undefined if either argument is non-finite or negative, or if the total is
// <= 0 — there's no such thing as a zero or negative height.
export function cmFromFeetInches(feet: number, inches: number): number | undefined {
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) {
    return undefined;
  }
  if (feet < 0 || inches < 0) {
    return undefined;
  }

  const totalInches = feet * 12 + inches;
  if (totalInches <= 0) {
    return undefined;
  }

  return Math.round(totalInches * 2.54 * 10) / 10;
}

// Rounds cm/2.54 to a whole number of inches FIRST, then divides into feet
// and inches — rounding after the divmod could yield inches === 12 (e.g.
// feet=5, inches=11.6 would round to "5'12\"" instead of carrying into 6'0").
// undefined if cm is non-finite or <= 0.
export function feetInchesFromCm(cm: number): { feet: number; inches: number } | undefined {
  if (!Number.isFinite(cm) || cm <= 0) {
    return undefined;
  }

  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

// e.g. `5'7"`. Empty string when feetInchesFromCm returns undefined, because
// ValueChip's `value` prop is a string and '' is its no-value sentinel.
export function formatHeightImperial(cm: number): string {
  const result = feetInchesFromCm(cm);
  if (!result) {
    return '';
  }
  return `${result.feet}'${result.inches}"`;
}
