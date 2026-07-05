import { supabase } from '@/lib/supabase';
import type { Category } from '@/constants/categories';
import type { Exercise } from '@/types/exercise';

export function sortExercises<T extends { name: string }>(exercises: T[]): T[] {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name));
}

type ExerciseRow = { id: string; name: string; muscle: { nav_category: string } };

export async function fetchExercisesForCategory(category: Category['name']): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercise')
    .select('id, name, muscle!inner(nav_category)')
    .eq('muscle.nav_category', category)
    .returns<ExerciseRow[]>();

  if (error) throw error;

  return sortExercises(data.map(row => ({ id: row.id, name: row.name })));
}

export async function fetchExerciseById(id: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercise')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
