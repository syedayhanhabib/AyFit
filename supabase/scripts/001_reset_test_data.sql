-- ============================================================
-- DESTRUCTIVE. ONE-TIME. DO NOT RE-RUN.
-- ============================================================
-- Run once on 2026-07-28, before seeding the real exercise
-- catalogue (supabase/seeds/002_exercises.sql).
--
-- Why this is NOT in the seeds/ folder:
-- seed files are idempotent and re-runnable by design. A DELETE
-- inside one is a landmine the day it gets re-run against real
-- training history. This lives in scripts/ precisely so it is
-- never part of the normal run order.
--
-- Run order for a fresh database is unchanged and does NOT
-- include this file:
--   schema.sql -> seeds/001_muscles.sql -> seeds/002_exercises.sql
--
-- Context: the ~20 original exercise rows were named before the
-- angle-first naming grammar existed. Everything logged against
-- them was throwaway test data, so they are deleted outright
-- rather than renamed in place. Muscle rows are NOT touched.
-- ============================================================

begin;

-- workout_set first: exercise_id has no ON DELETE CASCADE
-- (deliberately restrictive, so history can never be silently
-- orphaned by deleting an exercise).
delete from workout_set;

-- Sessions would otherwise be left behind empty.
delete from session;

-- Now the exercises themselves are unreferenced and deletable.
delete from exercise;

-- Sanity check before committing. All three must be 0.
select
  (select count(*) from workout_set) as workout_sets,
  (select count(*) from session)     as sessions,
  (select count(*) from exercise)    as exercises,
  (select count(*) from muscle)      as muscles_should_be_11;

commit;
