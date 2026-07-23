export type PrEntry = { exerciseId: string; date: string; e1rm: number };

// Pure PR-history math, no Supabase — mirrors e1rm.ts's split of math from
// fetching. Input is one entry per exercise per session (that session's
// best working-set e1RM, per CLAUDE.md's progression definition). Per
// exercise: sort chronologically, skip the first entry (nothing to beat
// yet — a first-ever session is a data point, not an earned record), then
// walk forward emitting an event wherever a later entry strictly exceeds
// the running max so far.
export function detectPrSessions(entries: PrEntry[]): PrEntry[] {
  const byExercise = new Map<string, PrEntry[]>();
  for (const entry of entries) {
    const group = byExercise.get(entry.exerciseId);
    if (group) group.push(entry);
    else byExercise.set(entry.exerciseId, [entry]);
  }

  const events: PrEntry[] = [];
  for (const group of byExercise.values()) {
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    let runningMax = sorted[0].e1rm;
    for (let i = 1; i < sorted.length; i++) {
      const entry = sorted[i];
      if (entry.e1rm > runningMax) {
        events.push(entry);
        runningMax = entry.e1rm;
      }
    }
  }
  return events;
}
