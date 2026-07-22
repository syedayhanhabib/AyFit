// Whole numbers display bare; anything else gets one decimal — used
// wherever a weight/reps/RPE value is rendered (set ladder, logging
// screen, exercise list).
export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
