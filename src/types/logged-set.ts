// Mirrors the `set` table in CLAUDE.md's data model, minus `session_id` —
// sessions arrive once Supabase persistence is wired up.
export type LoggedSet = {
  id: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  rpe: number;
  isWarmup: boolean;
};
