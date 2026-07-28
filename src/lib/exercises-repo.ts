import { supabase } from '@/lib/supabase';
import type { Exercise } from '@/types/exercise';

export function sortExercises<T extends { name: string }>(exercises: T[]): T[] {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name));
}

type ExerciseRow = {
  id: string;
  name: string;
  movement_group: string | null;
  muscle: { name: string };
  exercise_favourite: { id: string }[];
};

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
 *
 * `exercise_favourite` deliberately does NOT use `!inner` — a non-favourited
 * exercise has no matching row there and must still come back, with an empty
 * embed, rather than get excluded. Same exception as workout_set on
 * getLastLoggedSetsForMuscle. The `.is(..., null)` filter scopes the embed to
 * the single-user (no auth) case, same embedded-filter mechanism as is_warmup
 * elsewhere in this codebase.
 */
export async function fetchExercisesForMuscle(muscle: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercise')
    .select('id, name, movement_group, muscle!inner(name), exercise_favourite(id)')
    .eq('muscle.name', muscle)
    .is('exercise_favourite.user_id', null)
    .returns<ExerciseRow[]>();

  if (error) throw error;

  return sortExercises(
    data.map(row => ({
      id: row.id,
      name: row.name,
      movementGroup: row.movement_group,
      isFavourited: (row.exercise_favourite ?? []).length > 0,
    })),
  );
}

export async function fetchExerciseById(id: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercise')
    .select('id, name, movement_group, exercise_favourite(id)')
    .eq('id', id)
    .is('exercise_favourite.user_id', null)
    .maybeSingle<{
      id: string;
      name: string;
      movement_group: string | null;
      exercise_favourite: { id: string }[];
    }>();

  if (error) throw error;
  if (data === null) return null;

  return {
    id: data.id,
    name: data.name,
    movementGroup: data.movement_group,
    isFavourited: (data.exercise_favourite ?? []).length > 0,
  };
}
