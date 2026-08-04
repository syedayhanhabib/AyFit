import { supabase } from '@/lib/supabase';
import type { BodyweightEntry } from '@/types/profile';

type BodyweightRow = { date: string; weight_kg: number };

function toEntry(row: BodyweightRow): BodyweightEntry {
  return { date: row.date, weightKg: row.weight_kg };
}

// Most recent weigh-in by date descending. undefined when none exists yet —
// there's no single row identity being looked up here (unlike getProfile's
// singleton), so this is a pure "no such value" rather than a
// DB-confirmed-absent null.
export async function getLatestBodyweight(): Promise<BodyweightEntry | undefined> {
  const { data, error } = await supabase
    .from('bodyweight_log')
    .select('date, weight_kg')
    .order('date', { ascending: false })
    .limit(1)
    .returns<BodyweightRow[]>();

  if (error) throw error;
  if (data.length === 0) return undefined;
  return toEntry(data[0]);
}

// Reverse-chronological. Backs the plain entry list — DESIGN.md's Profile —
// Phase 4 defers the bodyweight chart itself until progression-card.tsx's
// Catmull-Rom smoothing is extracted into a shared util.
export async function getBodyweightHistory(limit = 30): Promise<BodyweightEntry[]> {
  const { data, error } = await supabase
    .from('bodyweight_log')
    .select('date, weight_kg')
    .order('date', { ascending: false })
    .limit(limit)
    .returns<BodyweightRow[]>();

  if (error) throw error;
  return data.map(toEntry);
}

// READ-THEN-INSERT-OR-UPDATE, same pattern and reasoning as
// profile-repo.ts's saveProfile: the guard here is the partial index
// bodyweight_log_date_anon_idx, so onConflict: 'date' can't be inferred by
// .upsert() either, for the same reasons documented there. `date` is a
// LOCAL date supplied by the caller via todayLocalDate() — this function
// does not compute it and must not derive it from a timestamptz.
export async function logBodyweight(date: string, weightKg: number): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from('bodyweight_log')
    .select('id')
    .eq('date', date)
    .maybeSingle<{ id: string }>();

  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from('bodyweight_log')
      .update({ weight_kg: weightKg })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('bodyweight_log').insert({ date, weight_kg: weightKg });
  if (error) throw error;
}
