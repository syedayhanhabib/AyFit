-- =============================================================================
-- AyFit — Supabase schema
--
-- Source of truth for the database schema. Run manually via the Supabase
-- SQL Editor (not applied by any build/deploy step).
--
-- RLS is deliberately OFF for v1: single user, no auth. Revisit this file
-- when multi-user / auth lands (see the user_id note on `session` below).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- muscle
-- -----------------------------------------------------------------------------
create table if not exists muscle (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  nav_category text not null check (nav_category in ('Chest', 'Back', 'Arms', 'Legs', 'Shoulders'))
);

-- -----------------------------------------------------------------------------
-- exercise
-- -----------------------------------------------------------------------------
create table if not exists exercise (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  muscle_id  uuid not null references muscle(id)
);

create index if not exists exercise_muscle_id_idx on exercise(muscle_id);

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

-- =============================================================================
-- Seed data — re-runnable without duplicating rows.
-- =============================================================================

insert into muscle (name, nav_category) values
  ('chest',      'Chest'),
  ('back',       'Back'),
  ('biceps',     'Arms'),
  ('triceps',    'Arms'),
  ('quads',      'Legs'),
  ('hamstrings', 'Legs'),
  ('front delt', 'Shoulders'),
  ('side delt',  'Shoulders'),
  ('rear delt',  'Shoulders')
on conflict (name) do nothing;

insert into exercise (name, muscle_id)
select v.name, m.id
from (values
  -- Chest
  ('Bench Press',       'chest'),
  ('Incline DB Press',  'chest'),
  ('Flat DB Press',     'chest'),
  ('Cable Fly',         'chest'),
  -- Back
  ('Lat Pulldown',      'back'),
  ('Barbell Row',       'back'),
  ('Seated Cable Row',  'back'),
  ('Pull-Up',           'back'),
  -- Arms
  ('Barbell Curl',      'biceps'),
  ('Hammer Curl',       'biceps'),
  ('Tricep Pushdown',   'triceps'),
  ('Skull Crusher',     'triceps'),
  -- Legs
  ('Back Squat',        'quads'),
  ('Leg Press',         'quads'),
  ('Romanian Deadlift', 'hamstrings'),
  ('Leg Curl',          'hamstrings'),
  -- Shoulders
  ('Overhead Press',    'front delt'),
  ('Lateral Raise',     'side delt'),
  ('Rear Delt Fly',     'rear delt'),
  ('Front Raise',       'front delt')
) as v(name, muscle_name)
join muscle m on m.name = v.muscle_name
on conflict (name) do nothing;
