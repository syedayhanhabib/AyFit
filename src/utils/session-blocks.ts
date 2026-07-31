import type { CalendarSetEntry, ExerciseBlock } from '@/types/calendar';

export type SortedSetRow = CalendarSetEntry & { exerciseId: string; exerciseName: string };

// Pure grouping math, no Supabase — same split of math from fetching as
// pr-detection.ts. Input must already be sorted chronologically (repo layer's
// job, not this function's). Groups CONSECUTIVE runs of the same exercise
// into blocks: if the session returns to an exercise later, that produces a
// SECOND block, deliberately — session order is the truth being preserved,
// so bench -> rows -> bench renders as three blocks, not two merged into one.
export function groupIntoSessionBlocks(sets: SortedSetRow[]): ExerciseBlock[] {
  const blocks: ExerciseBlock[] = [];

  for (const set of sets) {
    const entry: CalendarSetEntry = {
      weightKg: set.weightKg,
      reps: set.reps,
      rpe: set.rpe,
      isWarmup: set.isWarmup,
      createdAt: set.createdAt,
    };

    const currentBlock = blocks[blocks.length - 1];
    if (currentBlock && currentBlock.exerciseId === set.exerciseId) {
      currentBlock.sets.push(entry);
    } else {
      blocks.push({ exerciseId: set.exerciseId, exerciseName: set.exerciseName, sets: [entry] });
    }
  }

  return blocks;
}
