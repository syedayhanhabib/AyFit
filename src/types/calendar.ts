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

export type DayDetail = {
  date: string;
  blocks: ExerciseBlock[];
};
