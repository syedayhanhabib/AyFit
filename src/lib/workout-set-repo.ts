import { supabase } from '@/lib/supabase';
import type { LoggedSet } from '@/types/logged-set';
import { epleyE1rm } from '@/utils/e1rm';

type InsertSetParams = {
  sessionId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  rpe: number;
  isWarmup: boolean;
};

export async function insertSet(params: InsertSetParams): Promise<string> {
  const { data, error } = await supabase
    .from('workout_set')
    .insert({
      session_id: params.sessionId,
      exercise_id: params.exerciseId,
      weight_kg: params.weightKg,
      reps: params.reps,
      rpe: params.rpe,
      is_warmup: params.isWarmup,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('workout_set').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSetsForSession(sessionId: string, exerciseId: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workout_set')
    .select('id, exercise_id, weight_kg, reps, rpe, is_warmup')
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    exerciseId: row.exercise_id,
    weightKg: row.weight_kg,
    reps: row.reps,
    rpe: row.rpe,
    isWarmup: row.is_warmup,
  }));
}

export type LastLoggedSet = { weightKg: number; reps: number; rpe: number; sessionDate: string };

type LastLoggedSetRow = { weight_kg: number; reps: number; rpe: number; session: { date: string } };

// Read-only, cross-session lookup for the "previous session" card — most recent
// working set for this exercise, ever. excludeSessionId keeps today's own sets
// (the session currently being logged) out of "previous".
//
// Kept alongside getLastLoggedSetsForMuscle below, which is NOT a drop-in
// replacement: this one is per-exercise and can exclude a session, which the
// logging screen needs so "LAST TIME" doesn't just echo the set you added ten
// seconds ago. The batched one has no exclusion by design.
export async function getLastLoggedSet(
  exerciseId: string,
  excludeSessionId?: string,
): Promise<LastLoggedSet | undefined> {
  let query = supabase
    .from('workout_set')
    .select('weight_kg, reps, rpe, session!inner(date)')
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (excludeSessionId) {
    query = query.neq('session_id', excludeSessionId);
  }

  const { data, error } = await query.returns<LastLoggedSetRow[]>();

  if (error) throw error;
  if (data.length === 0) return undefined;

  const row = data[0];
  return { weightKg: row.weight_kg, reps: row.reps, rpe: row.rpe, sessionDate: row.session.date };
}

// The `| undefined` is deliberate, don't simplify it away: keys are OMITTED for
// exercises with no history, and noUncheckedIndexedAccess isn't on, so without
// the union a missing-key lookup types as LastLoggedSet and the call site's
// `lastLogged && ...` guard could be dropped with no type error.
export type LastLoggedByExerciseId = Record<string, LastLoggedSet | undefined>;

type LastLoggedBatchRow = {
  id: string;
  workout_set: { weight_kg: number; reps: number; rpe: number; session: { date: string } }[];
};

/**
 * Batched sibling of getLastLoggedSet: the last working set for EVERY exercise
 * in one muscle, in a single round trip, keyed by exercise id.
 *
 * Replaces an N+1 — the exercise list used to call getLastLoggedSet once per
 * row. That was survivable at ~4 rows per muscle and isn't at 25.
 *
 * Semantics deliberately match getLastLoggedSet exactly: non-warmup sets only,
 * newest by created_at, and NO session exclusion (this is the browsing screen,
 * where "last logged" means literally the last time even if that was today).
 *
 * One query, not fetch-everything-and-reduce: PostgREST applies an embedded
 * limit per parent row, so `.limit(1, { referencedTable: 'workout_set' })`
 * yields the latest set per exercise rather than one set overall. The
 * is_warmup filter is a separate embedded filter param, which PostgREST puts
 * inside the lateral subquery's WHERE — so it applies BEFORE the limit, and a
 * trailing warm-up can't come back as the last logged set.
 * (`referencedTable` is the current option name; `foreignTable` is deprecated
 * in the installed @supabase/postgrest-js 2.110.0 type defs.)
 */
export async function getLastLoggedSetsForMuscle(muscle: string): Promise<LastLoggedByExerciseId> {
  const { data, error } = await supabase
    .from('exercise')
    // muscle uses !inner per the Postgrest convention in CLAUDE.md. workout_set
    // deliberately does NOT — this is the exception to that rule: an exercise
    // with no sets yet must still come back, with an empty embed, so it still
    // renders as a row. Adding !inner here would silently hide every
    // never-logged exercise from the list. Don't "fix" it.
    .select('id, muscle!inner(name), workout_set(weight_kg, reps, rpe, session!inner(date))')
    .eq('muscle.name', muscle)
    .eq('workout_set.is_warmup', false)
    .order('created_at', { referencedTable: 'workout_set', ascending: false })
    .limit(1, { referencedTable: 'workout_set' })
    .returns<LastLoggedBatchRow[]>();

  if (error) throw error;

  const result: LastLoggedByExerciseId = {};
  for (const row of data) {
    const set = row.workout_set[0];
    // No history: omit the key entirely rather than storing undefined, so the
    // call site's `lastLogged && ...` check renders no subtitle for this row.
    if (set === undefined) continue;
    result[row.id] = {
      weightKg: set.weight_kg,
      reps: set.reps,
      rpe: set.rpe,
      sessionDate: set.session.date,
    };
  }
  return result;
}

export type ExerciseHistoryEntry = { id: string; name: string };

type ExerciseHistoryRow = { exercise_id: string; exercise: { name: string } };

// Read-only: every exercise with real (non-warmup) history, most-recently
// logged first — feeds Summary's Progression exercise picker.
export async function getExercisesWithHistory(): Promise<ExerciseHistoryEntry[]> {
  const { data, error } = await supabase
    .from('workout_set')
    .select('exercise_id, exercise!inner(name)')
    .eq('is_warmup', false)
    .order('created_at', { ascending: false })
    .returns<ExerciseHistoryRow[]>();

  if (error) throw error;

  const seen = new Set<string>();
  const result: ExerciseHistoryEntry[] = [];
  for (const row of data) {
    if (seen.has(row.exercise_id)) continue;
    seen.add(row.exercise_id);
    result.push({ id: row.exercise_id, name: row.exercise.name });
  }
  return result;
}

export type E1rmPoint = { date: string; e1rm: number };

type E1rmHistoryRow = { weight_kg: number; reps: number; session: { date: string } };

// Read-only: one point per session (that session's best working-set e1RM),
// ascending by date — feeds Summary's Progression chart.
export async function getE1rmHistory(exerciseId: string): Promise<E1rmPoint[]> {
  const { data, error } = await supabase
    .from('workout_set')
    .select('weight_kg, reps, session!inner(date)')
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .returns<E1rmHistoryRow[]>();

  if (error) throw error;

  const bestBySessionDate = new Map<string, number>();
  for (const row of data) {
    const e1rm = epleyE1rm(row.weight_kg, row.reps);
    const best = bestBySessionDate.get(row.session.date);
    if (best === undefined || e1rm > best) {
      bestBySessionDate.set(row.session.date, e1rm);
    }
  }

  return [...bestBySessionDate.entries()]
    .map(([date, e1rm]) => ({ date, e1rm }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
