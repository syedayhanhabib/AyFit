// Mirrors the `set` table in CLAUDE.md's data model, minus `session_id`
// (the exercise screen only ever touches one session at a time).
export type LoggedSet = {
  id: string; // workout_set.id from Supabase, returned by insertSet
  exerciseId: string;
  weightKg: number;
  reps: number;
  rpe: number;
  isWarmup: boolean;
};
