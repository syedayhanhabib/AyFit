import { supabase } from '@/lib/supabase';
import { epleyE1rm } from '@/utils/e1rm';

export type FavouriteBest = { exerciseId: string; name: string; bestE1rm: number };

type FavouriteBestRow = {
  id: string;
  name: string;
  workout_set: { weight_kg: number; reps: number }[];
};

// Best-ever e1RM for every favourited exercise, in one round trip — feeds
// Profile's relative-strength card ("1.62x bodyweight bench").
//
// (a) One query with an embedded limit, rather than calling
// getE1rmHistory (workout-set-repo.ts) once per favourite: that would be
// the same N+1 commit 3 already removed from the exercise list. Same
// embedded-resource-limit pattern as getLastLoggedSetsForMuscle —
// PostgREST turns the embed into a lateral subquery per parent row, and
// the embedded is_warmup filter lands inside THAT subquery's WHERE, so it
// applies BEFORE the limit.
//
// (b) Why limit 50, not fetch-everything: this query's TOP-LEVEL table is
// `exercise`, so the result is at most one row per favourite — PostgREST's
// 1000-row cap applies to top-level rows, and that's already structurally
// out of reach here, same reasoning as calendar-repo.ts's
// getTrainedDaysInMonth. So the embedded limit is NOT truncation
// protection. What it actually does: bounds payload size and latency,
// since e1RM is computed client-side (below) and a fetch-everything embed
// would grow without limit over years of history. Whether PostgREST's
// max-rows cap also applies to EMBEDDED rows has not been verified in this
// project and isn't being asserted either way — the limit makes it moot.
//
// (c) Why top-50-BY-WEIGHT-THEN-REPS is provably sufficient, not a guess: a
// set of weight w has a maximum possible e1RM of w * (1 + 50/30) = 2.67w,
// since the reps wheel caps at 50. So any set lighter than best / 2.67
// cannot beat `best`. Fetching the 50 heaviest leaves an enormous margin.
// The secondary reps-desc order (below) closes the equal-weight case: 50
// sets at an identical weight is ordinary during a plateau, and without a
// tiebreak the highest-rep set at that weight could fall outside the
// window, producing a wrong-but-plausible best. Ordering weight desc THEN
// reps desc guarantees the max-reps set at any given weight is inside it.
// The one remaining open bound is the reps-ceiling argument itself — if
// the reps wheel's ceiling ever rises above 50, revisit this bound rather
// than assuming it still holds.
//
// (d) `exercise_favourite!inner` here, where exercises-repo.ts deliberately
// embeds the SAME table WITHOUT !inner: that screen must keep
// non-favourited exercises in the list; this one must exclude them. Same
// table, opposite requirement, both deliberate.
//
// (e) `workout_set!inner` + the is_warmup filter is what implements
// DESIGN.md's "favourites INTERSECTED with lifts that have e1RM history" —
// a favourite with zero working sets is excluded by the join itself, so no
// client-side filter is needed for that case.
export async function getFavouriteBests(): Promise<FavouriteBest[]> {
  const { data, error } = await supabase
    .from('exercise')
    .select('id, name, exercise_favourite!inner(id), workout_set!inner(weight_kg, reps)')
    .is('exercise_favourite.user_id', null)
    .eq('workout_set.is_warmup', false)
    .order('weight_kg', { ascending: false, referencedTable: 'workout_set' })
    .order('reps', { ascending: false, referencedTable: 'workout_set' })
    .limit(50, { referencedTable: 'workout_set' })
    .returns<FavouriteBestRow[]>();

  if (error) throw error;

  const result: FavouriteBest[] = [];
  for (const row of data) {
    // Defensive only — workout_set!inner above should already guarantee a
    // non-empty array for every returned row.
    if (row.workout_set.length === 0) continue;

    // bestE1rm() (src/utils/e1rm.ts) is not reused here: it takes
    // LoggedSet[], and these are raw { weight_kg, reps } PostgREST rows, so
    // mapping them into LoggedSet purely to call it would add a conversion
    // for nothing. The Epley formula itself IS shared via epleyE1rm below —
    // only the max-reduction is local, and that's the trivial part; this
    // isn't an unaware third copy of max-e1RM logic.
    const bestE1rm = Math.max(...row.workout_set.map(set => epleyE1rm(set.weight_kg, set.reps)));
    result.push({ exerciseId: row.id, name: row.name, bestE1rm });
  }

  return result.sort((a, b) => b.bestE1rm - a.bestE1rm);
}
