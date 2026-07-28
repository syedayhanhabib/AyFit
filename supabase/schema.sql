-- =============================================================================
-- AyFit — Supabase schema
--
-- STRUCTURE ONLY. No INSERTs live in this file. Row data is owned by the seed
-- files, which are canonical for it:
--
--   Run order for a fresh database:
--     schema.sql -> seeds/001_muscles.sql -> seeds/002_exercises.sql
--
-- schema.sql used to carry its own copy of the muscle and exercise rows. That
-- duplicated seeds/ and could drift, so it was resolved in favour of the seed
-- files: change rows there, not here.
--
-- supabase/scripts/ holds one-time DESTRUCTIVE scripts and is deliberately NOT
-- part of the run order above. Never run anything from scripts/ as part of a
-- normal setup.
--
-- Run manually via the Supabase SQL Editor (not applied by any build/deploy
-- step). Re-runnable end to end: every statement is guarded.
--
-- RLS is deliberately OFF for v1: single user, no auth. Revisit this file
-- when multi-user / auth lands (see the user_id note on `session` below).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- muscle
--
-- `name` is stored lowercase and capitalised at display time
-- (src/utils/format-muscle-name.ts). It is also a URL route param and the
-- lookup key `fetchExercisesForMuscle` filters on, so renaming a row is a
-- breaking change, not a cosmetic one.
-- -----------------------------------------------------------------------------
create table if not exists muscle (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  nav_category text not null check (nav_category in ('Chest', 'Back', 'Arms', 'Legs', 'Shoulders'))
);

-- Anatomical ordering within a nav_category. Values are set by
-- seeds/001_muscles.sql, not here; 0 is a neutral default that falls back to
-- alphabetical-by-name in the app.
alter table muscle
  add column if not exists display_order integer not null default 0;

-- -----------------------------------------------------------------------------
-- exercise
--
-- `name` is GLOBALLY unique, not unique-per-muscle. Every movement therefore
-- has exactly one home muscle and one row, so its e1RM line and PR history can
-- never fragment across duplicates — and seeds/002_exercises.sql relies on
-- `on conflict (name) do nothing` for idempotency.
-- -----------------------------------------------------------------------------
create table if not exists exercise (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  muscle_id  uuid not null references muscle(id)
);

create index if not exists exercise_muscle_id_idx on exercise(muscle_id);

-- Optional section label for the exercise list. Nullable, and NULL for every
-- muscle except back — back is the one muscle where alphabetisation can't do
-- the grouping work ("Lat pulldown", "Pull-up" and "Chin-up" are the same
-- pattern under three unrelated letters). See seeds/002_exercises.sql.
alter table exercise
  add column if not exists movement_group text;

-- Named so it can be dropped/re-added deterministically. Guarded rather than
-- `if not exists` (which ALTER ... ADD CONSTRAINT does not support) so this
-- file stays re-runnable.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname  = 'exercise_movement_group_check'
      and conrelid = 'exercise'::regclass
  ) then
    alter table exercise
      add constraint exercise_movement_group_check
      check (movement_group is null or movement_group in (
        'vertical pull', 'horizontal pull', 'traps', 'lower back'
      ));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- session
-- -----------------------------------------------------------------------------
create table if not exists session (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  created_at timestamptz not null default now()
  -- user_id will be added here when auth/multi-user lands; ownership lives
  -- at the session level, not per-set.
);

-- One session per calendar day (single-user v1). Once user_id lands above,
-- this becomes a composite unique index on (user_id, date) instead.
create unique index if not exists session_one_per_day on session (date);

-- -----------------------------------------------------------------------------
-- workout_set
-- Maps to CLAUDE.md's `set` entity — renamed because "set" is a reserved
-- word in SQL. Quoting it everywhere isn't worth the friction.
-- -----------------------------------------------------------------------------
create table if not exists workout_set (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references session(id) on delete cascade,
  exercise_id uuid not null references exercise(id),
  weight_kg   numeric(6,2) not null check (weight_kg > 0),
  reps        integer not null check (reps >= 1),
  rpe         numeric(3,1) not null check (rpe >= 1 and rpe <= 10),
  is_warmup   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists workout_set_session_id_idx on workout_set(session_id);
create index if not exists workout_set_exercise_id_idx on workout_set(exercise_id);

-- -----------------------------------------------------------------------------
-- exercise_favourite
--
-- Starred exercises, floated to the top of the exercise list.
--
-- ON DELETE CASCADE on exercise_id is correct HERE specifically because a
-- favourite carries no history — losing it with the exercise loses nothing.
-- That is the opposite of workout_set.exercise_id, which is deliberately
-- restrictive so logged history can never be silently orphaned.
--
-- user_id has no FK: auth does not exist yet, so there is no users table to
-- point at. It stays NULL for the single-user case.
-- -----------------------------------------------------------------------------
create table if not exists exercise_favourite (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid null,
  exercise_id uuid not null references exercise(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, exercise_id)
);

-- The unique constraint above does NOT cover the current single-user case:
-- Postgres treats NULLs as distinct in a unique index, so (null, X) can be
-- inserted repeatedly and the same exercise starred twice. This partial index
-- closes that hole. Deliberately not NULLS NOT DISTINCT, which would tie the
-- schema to Postgres 15+.
create unique index if not exists exercise_favourite_exercise_id_anon_idx
  on exercise_favourite (exercise_id)
  where user_id is null;
