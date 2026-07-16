import { supabase } from '@/lib/supabase';
import type { LoggedSet } from '@/types/logged-set';

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
