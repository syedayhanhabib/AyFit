import { supabase } from '@/lib/supabase';

function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Cached per local date so rapid taps (before the first insert resolves)
// reuse the same in-flight request instead of racing into two session rows.
let cachedDate: string | null = null;
let cachedSessionPromise: Promise<string> | null = null;

async function resolveTodaySession(date: string): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from('session')
    .select('id')
    .eq('date', date)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('session')
    .insert({ date })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return created.id;
}

export async function getOrCreateTodaySession(): Promise<string> {
  const date = todayLocalDate();
  if (cachedDate !== date) {
    cachedDate = date;
    cachedSessionPromise = null;
  }
  if (!cachedSessionPromise) {
    cachedSessionPromise = resolveTodaySession(date).catch(error => {
      cachedSessionPromise = null; // allow the next call to retry
      throw error;
    });
  }
  return cachedSessionPromise;
}
