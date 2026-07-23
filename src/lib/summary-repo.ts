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

// Inverse of formatDateLocal — session.date is stored as a local-date
// string (session-repo.ts's todayLocalDate() convention), so it must be
// parsed back via explicit y/m/d components rather than `new Date(str)`,
// which parses as UTC midnight and can land on the wrong local day.
function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
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

// Read-only: sessions logged this calendar week, the current weekly streak,
// and which days of this week (Monday-first) have a logged session — feeds
// Summary's Consistency card, including its day-by-day ledger strip. Strict:
// an in-progress week with nothing logged yet counts as 0 and breaks the
// streak immediately, whether it's the current week or a past one. No grace
// period.
export async function getConsistency(): Promise<{
  sessionsThisWeek: number;
  weeklyStreak: number;
  completedDays: boolean[];
}> {
  const { data, error } = await supabase.from('session').select('date').order('date', { ascending: false });

  if (error) throw error;

  const dates = data.map(row => row.date as string);

  const { start: thisWeekStart, end: thisWeekEnd } = getCurrentWeekRange();
  const thisWeekStartStr = formatDateLocal(thisWeekStart);
  const thisWeekEndStr = formatDateLocal(thisWeekEnd);
  const sessionsThisWeek = dates.filter(date => date >= thisWeekStartStr && date <= thisWeekEndStr).length;

  // Bucket every logged date by the Monday of its week, then walk backward
  // one week at a time from the current week, counting consecutive weeks
  // with >=1 session until the first miss.
  const trainedWeeks = new Set(dates.map(date => formatDateLocal(getCurrentWeekRange(parseDateLocal(date)).start)));

  let weeklyStreak = 0;
  let cursor = thisWeekStart;
  while (trainedWeeks.has(formatDateLocal(cursor))) {
    weeklyStreak += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7);
  }

  const dateSet = new Set(dates);
  const completedDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + i);
    return dateSet.has(formatDateLocal(day));
  });

  return { sessionsThisWeek, weeklyStreak, completedDays };
}
