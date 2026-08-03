import type {
  CalendarSetEntry,
  DayTotals,
  ExerciseBlock,
  NumberedExerciseBlock,
  NumberedSetEntry,
} from '@/types/calendar';

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

// Annotates groupIntoSessionBlocks's output with each set's working-set
// number — additive, does not touch groupIntoSessionBlocks itself. WORKING
// sets are numbered continuously per exercise ACROSS THE WHOLE DAY, keyed
// on exerciseId rather than per block: if bench's first block has 3 working
// sets and the day returns to bench later, that second block's first
// working set is 4, not 1. Each exercise gets its own independent counter —
// rows starting between two bench blocks begins at 1 regardless of bench's
// count. Warm-ups never consume a number: their `workingSetNumber` is
// `undefined` and the counter does not advance for them, so working sets
// stay numbered continuously across interleaved warm-ups (per DESIGN.md's
// Calendar — Phase 3 section).
export function numberWorkingSets(blocks: ExerciseBlock[]): NumberedExerciseBlock[] {
  const workingSetCounts = new Map<string, number>();

  return blocks.map(block => {
    const sets: NumberedSetEntry[] = block.sets.map(set => {
      if (set.isWarmup) {
        return { ...set, workingSetNumber: undefined };
      }
      const nextNumber = (workingSetCounts.get(block.exerciseId) ?? 0) + 1;
      workingSetCounts.set(block.exerciseId, nextNumber);
      return { ...set, workingSetNumber: nextNumber };
    });
    return { exerciseId: block.exerciseId, exerciseName: block.exerciseName, sets };
  });
}

// Day totals for the header ("13 sets · 3 exercises"). Total sets INCLUDES
// warm-ups, per the governing ledger rule — Calendar does no math, so
// nothing here is excluded the way Track/Summary exclude warm-ups from
// e1RM/volume/PR. Exercise count is DISTINCT exerciseIds, not blocks.length:
// a day where bench is revisited is 3 exercises, not 4 blocks' worth — the
// header describes what was trained, not how it was interleaved.
export function getDayTotals(blocks: ExerciseBlock[]): DayTotals {
  const exerciseIds = new Set<string>();
  let totalSets = 0;
  for (const block of blocks) {
    exerciseIds.add(block.exerciseId);
    totalSets += block.sets.length;
  }
  return { totalSets, exerciseCount: exerciseIds.size };
}
