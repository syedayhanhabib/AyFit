import type { LoggedSet } from '@/types/logged-set';

export function epleyE1rm(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

// Warm-ups are excluded from all progression math per CLAUDE.md.
export function bestE1rm(sets: LoggedSet[]): number | undefined {
  const workingSets = sets.filter(set => !set.isWarmup);
  if (workingSets.length === 0) return undefined;

  return Math.max(...workingSets.map(set => epleyE1rm(set.weightKg, set.reps)));
}
