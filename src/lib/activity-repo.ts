import { supabase } from '@/lib/supabase';
import { formatDateLocal } from '@/utils/local-date';
import { getCurrentWeekRange } from '@/utils/week-range';

type TrainedDayRow = { date: string; workout_set: { id: string }[] };

// Trailing 4-COMPLETE-week average of trained days/week, feeding
// activityMultiplier() in src/utils/tdee.ts. The current (partial) week is
// deliberately EXCLUDED — on a Monday it would read 0 or 1 and swing TDEE
// by hundreds of kcal purely from where you are in the week (see DESIGN.md's
// Profile — Phase 4 section). The window is the 28 days ending the day
// before this week's Monday; weeks are Monday-first, same as
// summary-repo.ts and Calendar.
export async function getAverageTrainedDaysPerWeek(): Promise<number | undefined> {
  const { start: thisMonday } = getCurrentWeekRange();
  const windowEnd = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 1);
  const windowStart = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), windowEnd.getDate() - 27);

  // Queries `session` as the top-level table with workout_set!inner(id)
  // embedded — same pattern and same reason as calendar-repo.ts's
  // getTrainedDaysInMonth: at most 28 rows here, so PostgREST's 1000-row
  // silent-truncation cap is structurally out of reach, and !inner excludes
  // sessions with zero sets. A trained day is a day with >=1 workout_set
  // row, never a bare session row — a childless session is possible today
  // (getOrCreateTodaySession creates it up front and a failed set insert
  // leaves it empty), and a workout crossing local midnight can produce two
  // session rows on two dates. Counting session rows instead of distinct
  // trained dates would inflate the multiplier in both cases.
  const { data, error } = await supabase
    .from('session')
    .select('date, workout_set!inner(id)')
    .gte('date', formatDateLocal(windowStart))
    .lte('date', formatDateLocal(windowEnd))
    .order('date', { ascending: true })
    .limit(1, { referencedTable: 'workout_set' })
    .returns<TrainedDayRow[]>();

  if (error) throw error;

  const trainedDates = new Set(data.map(row => row.date));

  // Zero trained days in the window means there's no history to average —
  // a calorie number derived from "0 training days/week" would be a guess
  // presented as a measurement, and DESIGN.md's TDEE fence already hides the
  // card when an input is missing; no history is a missing input. This is
  // distinct from a real low (but present) reading like 0.25.
  if (trainedDates.size === 0) return undefined;

  // Known and accepted: fewer than 4 complete weeks of real history
  // understates the average, because the window still includes weeks
  // before any training existed — 3 trained days/week for 2 weeks (with 2
  // untrained weeks before that) reads as 1.5, giving multiplier 1.375
  // instead of the 1.55 a true 3/week reading would earn. Understating is
  // the conservative direction, consistent with activityMultiplier's
  // non-finite clamp to 1.2, and correcting it would need a separate
  // "first ever session" query. Recorded so it isn't rediscovered as a bug.
  return trainedDates.size / 4;
}
