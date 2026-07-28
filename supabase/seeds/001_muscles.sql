-- =============================================================================
-- AyFit — seed 001: muscle rows
--
-- DML ONLY. Every statement below is an INSERT (plus one read-only SELECT at
-- the end). There is no DDL here: no CREATE, no ALTER, no DROP. The `muscle`
-- table already exists (supabase/schema.sql) and its nav_category CHECK
-- constraint already permits 'Legs', so adding glutes and calves needs no
-- schema change at all.
--
-- Requires: muscle.display_order column (commit 2a DDL, in schema.sql).
--
-- Idempotent and self-healing: `muscle.name` is UNIQUE and the insert is
-- ON CONFLICT DO UPDATE, so re-running this file re-applies nav_category and
-- display_order to rows that already exist rather than silently skipping them.
-- It never renames or deletes an existing row — `name` is the conflict key, and
-- `exercise.muscle_id` plus, transitively, every logged set depend on the rows
-- that are already there.
--
-- display_order is anatomical ordering WITHIN a nav_category, so the numbers
-- repeat across categories (every category starts at 1). The app orders by
-- display_order then name, and only ever reads one category at a time.
--
-- Names are lowercase to match those existing 9 rows. The app capitalises for
-- display (src/utils/format-muscle-name.ts), so 'front delt' renders as
-- "Front delt" without the stored value having to change.
--
-- How to apply: paste this whole file into the Supabase SQL editor and run it.
-- =============================================================================

insert into muscle (name, nav_category, display_order) values
  ('chest',      'Chest',     1),
  ('back',       'Back',      1),
  ('biceps',     'Arms',      1),
  ('triceps',    'Arms',      2),
  ('quads',      'Legs',      1),
  ('hamstrings', 'Legs',      2),
  ('glutes',     'Legs',      3),
  ('calves',     'Legs',      4),
  ('front delt', 'Shoulders', 1),
  ('side delt',  'Shoulders', 2),
  ('rear delt',  'Shoulders', 3)
on conflict (name) do update set
  nav_category  = excluded.nav_category,
  display_order = excluded.display_order;

-- Verification — read-only, safe to re-run. Expect 11 muscles total, and this
-- is also exactly what drives navigation: a nav_category with muscles > 1
-- shows the muscle picker, one with muscles = 1 skips straight to the exercise
-- list. So Chest and Back should report 1, Arms 2, Legs 4, Shoulders 3.
-- `names` is aggregated in display_order, so it reads exactly as the picker
-- will render it.
select nav_category,
       count(*) as muscles,
       string_agg(name, ', ' order by display_order, name) as names
from muscle
group by nav_category
order by nav_category;
