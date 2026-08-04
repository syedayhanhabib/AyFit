// Pure math, no imports — same math-vs-fetching split as pr-detection.ts and
// session-blocks.ts.

// e1rm / bodyweightKg, rounded to two decimals — the unit is "1.62x
// bodyweight". Returns undefined if either argument is non-finite or <= 0.
//
// Known and accepted characteristic: this divides a BEST-EVER e1RM by
// CURRENT bodyweight, so gaining weight lowers the ratio without any loss
// of strength. Unavoidable for now — bodyweight_log only starts accruing
// from today, so there is no historical bodyweight to pair a past PR
// against. Revisit if/when bodyweight_log has enough history to look up
// the weight as of a PR's date.
export function relativeStrength(e1rm: number, bodyweightKg: number): number | undefined {
  if (!Number.isFinite(e1rm) || !Number.isFinite(bodyweightKg)) {
    return undefined;
  }
  if (e1rm <= 0 || bodyweightKg <= 0) {
    return undefined;
  }

  return Math.round((e1rm / bodyweightKg) * 100) / 100;
}
