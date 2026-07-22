import { supabase } from '@/lib/supabase';
import type { LoggedSet } from '@/types/logged-set';
import { epleyE1rm } from '@/utils/e1rm';

type InsertSetParams = {
  sessionId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  rpe: number;
  isWarmup: boolean;
};

export async function insertSet(params: InsertSetParams): Promise<string> {
  const { data, error } = await supabase
    .from('workout_set')
    .insert({
      session_id: params.sessionId,
      exercise_id: params.exerciseId,
      weight_kg: params.weightKg,
      reps: params.reps,
      rpe: params.rpe,
      is_warmup: params.isWarmup,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('workout_set').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSetsForSession(sessionId: string, exerciseId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workout_set')
    .select('id, exercise_id, weight_kg, reps, rpe, is_warmup')
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    exerciseId: row.exercise_id,
    weightKg: row.weight_kg,
    reps: row.reps,
    rpe: row.rpe,
    isWarmup: row.is_warmup,
  }));
}

export type LastLoggedSet = { weightKg: number; reps: number; rpe: number; sessionDate: string };

type LastLoggedSetRow = { weight_kg: number; reps: number; rpe: number; session: { date: string } };

// Read-only, cross-session lookup for the "previous session" card — most recent
// working set for this exercise, ever. excludeSessionId keeps today's own sets
// (the session currently being logged) out of "previous".
export async function getLastLoggedSet(
  exerciseId: string,
  excludeSessionId?: string,
): Promise<LastLoggedSet | undefined> {
  let query = supabase
    .from('workout_set')
    .select('weight_kg, reps, rpe, session!inner(date)')
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (excludeSessionId) {
    query = query.neq('session_id', excludeSessionId);
  }

  const { data, error } = await query.returns<LastLoggedSetRow[]>();

  if (error) throw error;
  if (data.length === 0) return undefined;

  const row = data[0];
  return { weightKg: row.weight_kg, reps: row.reps, rpe: row.rpe, sessionDate: row.session.date };
}

export type ExerciseHistoryEntry = { id: string; name: string };

type ExerciseHistoryRow = { exercise_id: string; exercise: { name: string } };

// Read-only: every exercise with real (non-warmup) history, most-recently
// logged first — feeds Summary's Progression exercise picker.
export async function getExercisesWithHistory(): Promise<ExerciseHistoryEntry[]> {
  const { data, error } = await supabase
    .from('workout_set')
    .select('exercise_id, exercise!inner(name)')
    .eq('is_warmup', false)
    .order('created_at', { ascending: false })
    .returns<ExerciseHistoryRow[]>();

  if (error) throw error;

  const seen = new Set<string>();
  const result: ExerciseHistoryEntry[] = [];
  for (const row of data) {
    if (seen.has(row.exercise_id)) continue;
    seen.add(row.exercise_id);
    result.push({ id: row.exercise_id, name: row.exercise.name });
  }
  return result;
}

export type E1rmPoint = { date: string; e1rm: number };

type E1rmHistoryRow = { weight_kg: number; reps: number; session: { date: string } };

// Read-only: one point per session (that session's best working-set e1RM),
// ascending by date — feeds Summary's Progression chart.
export async function getE1rmHistory(exerciseId: string): Promise<E1rmPoint[]> {
  const { data, error } = await supabase
    .from('workout_set')
    .select('weight_kg, reps, session!inner(date)')
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .returns<E1rmHistoryRow[]>();

  if (error) throw error;

  const bestBySessionDate = new Map<string, number>();
  for (const row of data) {
    const e1rm = epleyE1rm(row.weight_kg, row.reps);
    const best = bestBySessionDate.get(row.session.date);
    if (best === undefined || e1rm > best) {
      bestBySessionDate.set(row.session.date, e1rm);
    }
  }

  return [...bestBySessionDate.entries()]
    .map(([date, e1rm]) => ({ date, e1rm }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
