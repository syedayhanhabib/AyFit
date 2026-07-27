import { supabase } from '@/lib/supabase';
import type { Muscle } from '@/types/muscle';

/**
 * Every muscle in a nav_category, alphabetical by name.
 *
 * This one query decides navigation shape: more than one row means the muscle
 * picker is worth showing, exactly one means the picker would be a dead tap and
 * the category skips straight to that muscle's exercise list. Nothing about
 * which categories branch is hardcoded anywhere — add a muscle row and the
 * picker appears, and Chest/Back start branching the day they get a second one.
 *
 * Alphabetical rather than anatomical because ordering muscles by hand would
 * need a display_order column, and that's DDL — out of scope for a DML-only
 * change. It's deterministic, which is what matters for now.
 */
export async function fetchMusclesForCategory(category: string): Promise<Muscle[]> {
  const { data, error } = await supabase
    .from('muscle')
    .select('id, name')
    .eq('nav_category', category)
    .order('name')
    .returns<Muscle[]>();

  if (error) throw error;
  return data;
}
