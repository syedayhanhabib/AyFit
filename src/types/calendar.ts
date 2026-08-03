// Types for Calendar's day-detail view. Calendar is a ledger, not a metric —
// warm-up sets are included throughout (contrast LoggedSet's consumers on
// Track/Summary, which exclude them from e1RM/volume/PR math).

export type CalendarSetEntry = {
  weightKg: number;
  reps: number;
  rpe: number;
  isWarmup: boolean;
  createdAt: string;
};

// A consecutive run of sets against the same exercise within a session. If
// the session returns to an exercise later (bench -> rows -> bench), that
// produces a SECOND block for bench, not one merged block — see
// session-blocks.ts.
export type ExerciseBlock = {
  exerciseId: string;
  exerciseName: string;
  sets: CalendarSetEntry[];
};

// A set entry annotated with its working-set number. `workingSetNumber` is a
// REQUIRED field typed `number | undefined` (not an optional property) —
// per CLAUDE.md's undefined-vs-null convention, this is the bestE1rm()
// shape: a pure computation's "no such value for this input," not a
// not-yet-fetched state or a confirmed-absent-from-DB result (those are
// null's job, and stay null elsewhere — see calendar-repo.ts). A required
// union also means a typo'd property name fails to type-check, where an
// optional `?:` would have silently produced the same `undefined` for a
// genuinely different reason.
export type NumberedSetEntry = CalendarSetEntry & { workingSetNumber: number | undefined };

// Same shape as ExerciseBlock, but with numbered sets — see
// session-blocks.ts's numberWorkingSets.
export type NumberedExerciseBlock = {
  exerciseId: string;
  exerciseName: string;
  sets: NumberedSetEntry[];
};

export type DayTotals = {
  totalSets: number;
  exerciseCount: number;
};

export type DayDetail = {
  date: string;
  blocks: NumberedExerciseBlock[];
} & DayTotals;
