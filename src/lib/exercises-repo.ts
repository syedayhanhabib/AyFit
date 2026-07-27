import { supabase } from '@/lib/supabase';
import type { Exercise } from '@/types/exercise';

export function sortExercises<T extends { name: string }>(exercises: T[]): T[] {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name));
}

type ExerciseRow = { id: string; name: string; muscle: { name: string } };

/**
 * Exercises for one muscle.
 *
 * Replaces the previous fetch-by-nav_category: now that a category can expand
 * into a muscle picker, the exercise list is always scoped to a single muscle,
 * even for the categories that auto-skip the picker (Chest, Back).
 *
 * `!inner` matters here — without it a non-matching `muscle.name` filter nulls
 * the embed instead of excluding the row, so every exercise in the table would
 * come back (see the Postgrest note in CLAUDE.md's build conventions).
 */
export async function fetchExercisesForMuscle(muscle: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercise')
    .select('id, name, muscle!inner(name)')
    .eq('muscle.name', muscle)
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
