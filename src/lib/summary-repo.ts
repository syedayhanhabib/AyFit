import { supabase } from '@/lib/supabase';
import type { CategoryName } from '@/constants/theme';
import { getCurrentWeekRange } from '@/utils/week-range';

// Aggregate, cross-table queries for the Summary tab — not owned by any one
// table's repo (contrast workout-set-repo.ts, which is scoped to a single
// exercise at a time). Volume by muscle now; Consistency and PR detection
// are the same shape and land here too.

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const EMPTY_VOLUME: Record<CategoryName, number> = { Chest: 0, Back: 0, Arms: 0, Legs: 0, Shoulders: 0 };

type VolumeRow = { exercise: { muscle: { nav_category: CategoryName } } };

// Read-only: non-warmup working-set count per muscle category, current
// calendar week — feeds Summary's Volume by muscle bar chart. Always
// returns all five categories, zero-filled for anything untrained this week.
export async function getVolumeByMuscle(): Promise<Record<CategoryName, number>> {
  const { start, end } = getCurrentWeekRange();

  const { data, error } = await supabase
    .from('workout_set')
    .select('exercise!inner(muscle!inner(nav_category)), session!inner(date)')
    .eq('is_warmup', false)
    .gte('session.date', formatDateLocal(start))
    .lte('session.date', formatDateLocal(end))
    .returns<VolumeRow[]>();

  if (error) throw error;

  const counts: Record<CategoryName, number> = { ...EMPTY_VOLUME };
  for (const row of data) {
    counts[row.exercise.muscle.nav_category] += 1;
  }
  return counts;
}
