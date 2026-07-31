import { supabase } from '@/lib/supabase';
import { getMonthRange } from '@/utils/local-date';
import { groupIntoSessionBlocks, type SortedSetRow } from '@/utils/session-blocks';
import type { DayDetail } from '@/types/calendar';

// Read-only queries for the Calendar tab. Calendar is a LEDGER, not a
// metric: warm-up sets are included everywhere here (they're excluded from
// e1RM/volume/PR math elsewhere because they skew calculations; Calendar
// does no calculations). A "trained day" is a day with >=1 workout_set row,
// warm-up or not — never a day with merely a session row, since an empty
// session row is possible today if a set insert fails.

type TrainedDayRow = { date: string; workout_set: { id: string }[] };

// Distinct local date strings within [year, month] having >=1 set.
//
// Queries `session` as the TOP-LEVEL table, not `workout_set` — deliberately
// flipped from an earlier version that queried workout_set and embedded
// session, which returned one row per SET for the whole month (~450 rows in
// a heavy month) purely to dedupe dates client-side. Supabase's PostgREST
// `Max rows` cap defaults to 1000 and truncates silently with no error, so a
// heavy month could silently drop a trained day with no dot to show for it.
// `session` is <=31 rows for any month, so the cap is structurally
// unreachable from this query.
//
// workout_set!inner(id) is the load-bearing part: !inner makes it an INNER
// JOIN, so sessions with ZERO sets are excluded — that's what keeps the
// "trained day" definition at the top of this file (>=1 workout_set row,
// never merely a session row) intact. Dropping the !inner would silently
// widen the definition to "a day with a session row", which is exactly the
// empty-session bug that definition exists to avoid.
//
// The embedded limit(1, { referencedTable: 'workout_set' }) only trims the
// child array to 1 id per session (we never read the id, only whether the
// session survives the inner join) — same embedded-limit mechanism as
// getLastLoggedSetsForMuscle in workout-set-repo.ts. PostgREST applies an
// embedded limit inside the per-parent lateral subquery that also enforces
// !inner's row requirement, so limiting to 1 doesn't change which sessions
// have >=1 matching set and get included — it only trims how many of
// those already-matched ids come back. Cross-checked in
// scripts/smoke-calendar-repo.mjs against the same query without the limit.
export async function getTrainedDaysInMonth(year: number, month: number): Promise<string[]> {
  const { start, end } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from('session')
    .select('date, workout_set!inner(id)')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
    .limit(1, { referencedTable: 'workout_set' })
    .returns<TrainedDayRow[]>();

  if (error) throw error;

  // Two session rows can share the same date, so dedupe rather than assuming
  // one session per date.
  return [...new Set(data.map(row => row.date))].sort();
}

type DayDetailRow = {
  id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  rpe: number;
  is_warmup: boolean;
  created_at: string;
  exercise: { name: string };
  session: { date: string };
};

// Null covers BOTH "no session that day" and "session exists but has zero
// sets" — per the repo convention (see CLAUDE.md's undefined-vs-null note),
// null here means confirmed absent, and both cases are equally "nothing
// logged" to the user. Does not assume one session per date: every set for
// the date is collected regardless of which session row it belongs to, sorted
// by created_at then id as tiebreak, and fed into session-blocks.ts.
export async function getSessionDayDetail(date: string): Promise<DayDetail | null> {
  const { data, error } = await supabase
    .from('workout_set')
    .select('id, exercise_id, weight_kg, reps, rpe, is_warmup, created_at, exercise!inner(name), session!inner(date)')
    .eq('session.date', date)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .returns<DayDetailRow[]>();

  if (error) throw error;
  if (data.length === 0) return null;

  const sortedSets: SortedSetRow[] = data.map(row => ({
    exerciseId: row.exercise_id,
    exerciseName: row.exercise.name,
    weightKg: row.weight_kg,
    reps: row.reps,
    rpe: row.rpe,
    isWarmup: row.is_warmup,
    createdAt: row.created_at,
  }));

  return { date, blocks: groupIntoSessionBlocks(sortedSets) };
}
