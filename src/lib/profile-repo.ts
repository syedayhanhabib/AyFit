import { supabase } from '@/lib/supabase';
import type { Profile, ProfileFields } from '@/types/profile';

type ProfileRow = {
  id: string;
  name: string | null;
  date_of_birth: string | null;
  sex: 'male' | 'female' | null;
  height_cm: number | null;
  goal_weight_kg: number | null;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    sex: row.sex ?? undefined,
    heightCm: row.height_cm ?? undefined,
    goalWeightKg: row.goal_weight_kg ?? undefined,
  };
}

// Single row — the table is capped at one by the partial index
// profile_singleton_anon_idx (see schema.sql / CLAUDE.md). `null` means
// confirmed absent, which is the legitimate day-one state before any
// profile row exists yet.
export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profile')
    .select('id, name, date_of_birth, sex, height_cm, goal_weight_kg')
    .limit(1)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  if (!data) return null;
  return toProfile(data);
}

// READ-THEN-INSERT-OR-UPDATE, deliberately NOT .upsert() — this table will
// look upsert-shaped forever, so the reason has to live here: user_id is
// nullable and the real uniqueness guard is the PARTIAL index
// profile_singleton_anon_idx, not a plain unique column. PostgREST's
// onConflict takes column names, and Postgres can only infer a partial
// index for ON CONFLICT when the index predicate is implied by the
// statement — an INSERT has no WHERE clause, so it never is. Separately,
// onConflict: 'user_id' would not even match an existing NULL row, because
// NULLs are distinct in a unique index. Either way the insert proceeds and
// then trips the partial index with a duplicate-key error. So: read first;
// if no row exists, INSERT; otherwise UPDATE by id. This inverts once auth
// lands and user_id is non-null (onConflict: 'user_id' becomes valid then).
// Single-user, single-device: the read-then-write race this pattern
// normally opens is not a concern here, so no locking is added for it.
//
// This is a FULL REPLACE, not a patch — every field in `fields` overwrites
// its column, `undefined` included. `ProfileFields` (not Omit<Profile,
// 'id'>) is what enforces callers passing the complete current state, so a
// partial object can't silently null out the fields it left unmentioned.
export async function saveProfile(fields: ProfileFields): Promise<void> {
  const existing = await getProfile();

  const row = {
    name: fields.name ?? null,
    date_of_birth: fields.dateOfBirth ?? null,
    sex: fields.sex ?? null,
    height_cm: fields.heightCm ?? null,
    goal_weight_kg: fields.goalWeightKg ?? null,
  };

  if (!existing) {
    const { error } = await supabase.from('profile').insert(row);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('profile').update(row).eq('id', existing.id);
  if (error) throw error;
}
