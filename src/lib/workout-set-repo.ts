import { supabase } from '@/lib/supabase';

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
