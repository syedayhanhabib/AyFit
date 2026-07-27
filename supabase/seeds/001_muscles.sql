-- =============================================================================
-- AyFit — seed 001: muscle rows
--
-- DML ONLY. Every statement below is an INSERT (plus one read-only SELECT at
-- the end). There is no DDL here: no CREATE, no ALTER, no DROP. The `muscle`
-- table already exists (supabase/schema.sql) and its nav_category CHECK
-- constraint already permits 'Legs', so adding glutes and calves needs no
-- schema change at all.
--
-- Idempotent: `muscle.name` is UNIQUE and the insert is ON CONFLICT DO NOTHING,
-- so re-running this file is a no-op. It never renames or deletes an existing
-- row — `exercise.muscle_id` and, transitively, every logged set depend on the
-- 9 rows that are already there.
--
-- Names are lowercase to match those existing 9 rows. The app capitalises for
-- display (src/utils/format-muscle-name.ts), so 'front delt' renders as
-- "Front delt" without the stored value having to change.
--
-- How to apply: paste this whole file into the Supabase SQL editor and run it.
-- =============================================================================

insert into muscle (name, nav_category) values
  ('chest',      'Chest'),
  ('back',       'Back'),
  ('biceps',     'Arms'),
  ('triceps',    'Arms'),
  ('quads',      'Legs'),
  ('hamstrings', 'Legs'),
  ('glutes',     'Legs'),
  ('calves',     'Legs'),
  ('front delt', 'Shoulders'),
  ('side delt',  'Shoulders'),
  ('rear delt',  'Shoulders')
on conflict (name) do nothing;

-- Verification — read-only, safe to re-run. Expect 11 muscles total, and this
-- is also exactly what drives navigation: a nav_category with muscles > 1
-- shows the muscle picker, one with muscles = 1 skips straight to the exercise
-- list. So Chest and Back should report 1, Arms 2, Legs 4, Shoulders 3.
select nav_category,
       count(*) as muscles,
       string_agg(name, ', ' order by name) as names
from muscle
group by nav_category
order by nav_category;
