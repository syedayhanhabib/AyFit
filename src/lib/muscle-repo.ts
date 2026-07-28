import { supabase } from '@/lib/supabase';
import type { Muscle } from '@/types/muscle';

/**
 * Every muscle in a nav_category, in anatomical display order.
 *
 * This one query decides navigation shape: more than one row means the muscle
 * picker is worth showing, exactly one means the picker would be a dead tap and
 * the category skips straight to that muscle's exercise list. Nothing about
 * which categories branch is hardcoded anywhere — add a muscle row and the
 * picker appears, and Chest/Back start branching the day they get a second one.
 *
 * Ordering is display_order first, then name as a tiebreak. The name tiebreak
 * isn't decoration: display_order defaults to 0, so until seeds/001_muscles.sql
 * has been re-run against a database, every row ties and the result is exactly
 * the alphabetical order this used to return. Keep it.
 */
export async function fetchMusclesForCategory(category: string): Promise<Muscle[]> {
  const { data, error } = await supabase
    .from('muscle')
    .select('id, name')
    .eq('nav_category', category)
    .order('display_order')
    .order('name')
    .returns<Muscle[]>();

  if (error) throw error;
  return data;
}
