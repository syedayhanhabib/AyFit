import { supabase } from '@/lib/supabase';

export async function addFavourite(exerciseId: string): Promise<void> {
  const { error } = await supabase.from('exercise_favourite').insert({ exercise_id: exerciseId });
  if (error) throw error;
}

export async function removeFavourite(exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('exercise_favourite')
    .delete()
    .eq('exercise_id', exerciseId)
    .is('user_id', null);

  if (error) throw error;
}
