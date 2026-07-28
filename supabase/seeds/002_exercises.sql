-- ============================================================
-- 002_exercises.sql — canonical exercise catalogue
-- ============================================================
-- DML only. Idempotent, re-runnable, safe to run twice.
-- Run order: schema.sql -> seeds/001_muscles.sql -> THIS FILE
--
-- Requires: exercise.movement_group column + the
-- exercise_movement_group_check constraint (commit 2a DDL).
--
-- NAMING GRAMMAR — [Angle] [Equipment] [Movement].
-- The angle/position is always explicit, never implied, so that
-- alphabetical sort clusters variants by how you actually
-- choose: angle first, then implement. "Flat barbell bench
-- press" files under F rather than B on purpose.
--
-- Names are GLOBALLY unique (existing constraint on
-- exercise.name). Every movement therefore has exactly one
-- home muscle and exactly one row, so its e1RM line and PR
-- history can never fragment across duplicates. If a lift feels
-- like it belongs to two muscles, pick one — do not add it
-- twice.
--
-- movement_group is populated for BACK ONLY. Back is the one
-- muscle where alphabetisation cannot do the grouping work,
-- because "Lat pulldown", "Pull-up" and "Chin-up" are the same
-- pattern under three unrelated letters. Every other muscle
-- gets NULL and relies on the grammar.
-- ============================================================


-- ------------------------------------------------------------
-- All muscles except back. movement_group stays NULL.
-- ------------------------------------------------------------
insert into exercise (name, muscle_id)
select v.name, m.id
from (values

  -- chest --------------------------------------------------
  ('Flat barbell bench press',        'chest'),
  ('Flat dumbbell press',             'chest'),
  ('Flat Smith press',                'chest'),
  ('Flat machine chest press',        'chest'),
  ('Flat dumbbell fly',               'chest'),
  ('Flat cable fly',                  'chest'),
  ('Incline barbell bench press',     'chest'),
  ('Incline dumbbell press',          'chest'),
  ('Incline Smith press',             'chest'),
  ('Incline machine chest press',     'chest'),
  ('Incline dumbbell fly',            'chest'),
  ('Incline cable fly',               'chest'),
  ('Decline barbell bench press',     'chest'),
  ('Decline dumbbell press',          'chest'),
  ('Decline Smith press',             'chest'),
  ('Decline machine chest press',     'chest'),
  ('Decline cable fly',               'chest'),
  ('Low-to-high cable fly',           'chest'),
  ('High-to-low cable fly',           'chest'),
  ('Pec deck fly',                    'chest'),
  ('Standing cable press',            'chest'),
  ('Chest dip',                       'chest'),
  ('Weighted chest dip',              'chest'),
  ('Push-up',                         'chest'),
  ('Weighted push-up',                'chest'),

  -- biceps -------------------------------------------------
  ('Standing barbell curl',           'biceps'),
  ('Standing EZ-bar curl',            'biceps'),
  ('Standing dumbbell curl',          'biceps'),
  ('Seated dumbbell curl',            'biceps'),
  ('Incline dumbbell curl',           'biceps'),
  ('Hammer curl',                     'biceps'),
  ('Cross-body hammer curl',          'biceps'),
  ('Preacher barbell curl',           'biceps'),
  ('Preacher EZ-bar curl',            'biceps'),
  ('Preacher dumbbell curl',          'biceps'),
  ('Machine preacher curl',           'biceps'),
  ('Cable curl',                      'biceps'),
  ('Single-arm cable curl',           'biceps'),
  ('High cable curl',                 'biceps'),
  ('Concentration curl',              'biceps'),
  ('Spider curl',                     'biceps'),
  ('Reverse-grip barbell curl',       'biceps'),
  ('Zottman curl',                    'biceps'),

  -- triceps ------------------------------------------------
  -- Close-grip bench lives here, not chest: it is the
  -- triceps-dominant variant and global uniqueness forces one home.
  ('Close-grip barbell bench press',  'triceps'),
  ('Flat EZ-bar skull crusher',       'triceps'),
  ('Flat dumbbell skull crusher',     'triceps'),
  ('Incline EZ-bar skull crusher',    'triceps'),
  ('Decline EZ-bar skull crusher',    'triceps'),
  ('Overhead barbell extension',      'triceps'),
  ('Overhead dumbbell extension',     'triceps'),
  ('Overhead single-arm dumbbell extension', 'triceps'),
  ('Overhead cable extension',        'triceps'),
  ('Overhead single-arm cable extension',    'triceps'),
  ('Straight-bar cable pushdown',     'triceps'),
  ('Rope cable pushdown',             'triceps'),
  ('V-bar cable pushdown',            'triceps'),
  ('Single-arm reverse-grip cable pushdown', 'triceps'),
  ('Machine triceps extension',       'triceps'),
  ('Triceps dip',                     'triceps'),
  ('Weighted triceps dip',            'triceps'),
  ('Bench dip',                       'triceps'),
  ('Triceps kickback',                'triceps'),
  ('Diamond push-up',                 'triceps'),

  -- quads --------------------------------------------------
  ('Barbell back squat',              'quads'),
  ('Barbell front squat',             'quads'),
  ('Smith machine squat',             'quads'),
  ('Hack squat',                      'quads'),
  ('Pendulum squat',                  'quads'),
  ('Belt squat',                      'quads'),
  ('Box squat',                       'quads'),
  ('Goblet squat',                    'quads'),
  ('Sissy squat',                     'quads'),
  ('Leg press',                       'quads'),
  ('Single-leg press',                'quads'),
  ('Bulgarian split squat',           'quads'),
  ('Barbell walking lunge',           'quads'),
  ('Dumbbell walking lunge',          'quads'),
  ('Reverse lunge',                   'quads'),
  ('Step-up',                         'quads'),
  ('Leg extension',                   'quads'),
  ('Single-leg extension',            'quads'),

  -- hamstrings ---------------------------------------------
  -- RDL/stiff-leg live here; conventional and sumo deadlifts
  -- are filed under back > lower back. Different names, so no
  -- collision and no duplicated history.
  ('Romanian deadlift',               'hamstrings'),
  ('Dumbbell Romanian deadlift',      'hamstrings'),
  ('Single-leg Romanian deadlift',    'hamstrings'),
  ('Stiff-leg deadlift',              'hamstrings'),
  ('Seated leg curl',                 'hamstrings'),
  ('Lying leg curl',                  'hamstrings'),
  ('Single-leg lying curl',           'hamstrings'),
  ('Standing single-leg curl',        'hamstrings'),
  ('Nordic curl',                     'hamstrings'),
  ('Glute-ham raise',                 'hamstrings'),

  -- glutes -------------------------------------------------
  ('Barbell hip thrust',              'glutes'),
  ('Single-leg hip thrust',           'glutes'),
  ('Machine hip thrust',              'glutes'),
  ('Smith machine hip thrust',        'glutes'),
  ('Barbell glute bridge',            'glutes'),
  ('Glute bridge',                    'glutes'),
  ('Cable pull-through',              'glutes'),
  ('Cable glute kickback',            'glutes'),
  ('Machine glute kickback',          'glutes'),
  ('Dumbbell sumo squat',             'glutes'),
  ('Kettlebell swing',                'glutes'),
  ('Hip abduction machine',           'glutes'),
  ('Banded hip abduction',            'glutes'),
  ('Curtsy lunge',                    'glutes'),

  -- calves -------------------------------------------------
  ('Standing calf raise',             'calves'),
  ('Standing single-leg calf raise',  'calves'),
  ('Barbell standing calf raise',     'calves'),
  ('Dumbbell standing calf raise',    'calves'),
  ('Smith machine calf raise',        'calves'),
  ('Seated calf raise',               'calves'),
  ('Leg press calf raise',            'calves'),
  ('Donkey calf raise',               'calves'),
  ('Tibialis raise',                  'calves'),

  -- front delt ---------------------------------------------
  ('Standing barbell overhead press', 'front delt'),
  ('Seated barbell overhead press',   'front delt'),
  ('Standing dumbbell overhead press','front delt'),
  ('Seated dumbbell overhead press',  'front delt'),
  ('Single-arm dumbbell overhead press', 'front delt'),
  ('Seated Smith overhead press',     'front delt'),
  ('Machine shoulder press',          'front delt'),
  ('Arnold press',                    'front delt'),
  ('Push press',                      'front delt'),
  ('Landmine press',                  'front delt'),
  ('Front dumbbell raise',            'front delt'),
  ('Front barbell raise',             'front delt'),
  ('Front cable raise',               'front delt'),
  ('Front plate raise',               'front delt'),

  -- side delt ----------------------------------------------
  ('Standing dumbbell lateral raise', 'side delt'),
  ('Seated dumbbell lateral raise',   'side delt'),
  ('Leaning single-arm dumbbell lateral raise', 'side delt'),
  ('Cable lateral raise',             'side delt'),
  ('Single-arm cable lateral raise',  'side delt'),
  ('Behind-the-back cable lateral raise', 'side delt'),
  ('Machine lateral raise',           'side delt'),
  ('Band lateral raise',              'side delt'),
  ('Upright barbell row',             'side delt'),
  ('Upright dumbbell row',            'side delt'),
  ('Upright cable row',               'side delt'),

  -- rear delt ----------------------------------------------
  ('Seated dumbbell rear delt fly',   'rear delt'),
  ('Bent-over dumbbell rear delt fly','rear delt'),
  ('Chest-supported dumbbell rear delt fly', 'rear delt'),
  ('Prone incline dumbbell rear delt fly',   'rear delt'),
  ('Cable rear delt fly',             'rear delt'),
  ('Reverse pec deck fly',            'rear delt'),
  ('Rope face pull',                  'rear delt'),
  ('Seated rope face pull',           'rear delt'),
  ('Wide-grip cable rear delt row',   'rear delt'),
  ('Band pull-apart',                 'rear delt')

) as v(name, muscle_name)
join muscle m on m.name = v.muscle_name
on conflict (name) do nothing;


-- ------------------------------------------------------------
-- Back only. movement_group drives the section labels on the
-- exercise list — four sections, deliberately mixing two
-- movement patterns with two regions because that is what
-- actually covers the muscle. Vertical/horizontal alone leaves
-- shrugs and deadlifts in an unlabelled void.
--
-- Values must match exercise_movement_group_check exactly:
--   'vertical pull' | 'horizontal pull' | 'traps' | 'lower back'
--
-- Intended DISPLAY order is vertical pull -> horizontal pull ->
-- traps -> lower back. That is a client-side constant, not
-- alphabetical, and not stored here.
-- ------------------------------------------------------------
insert into exercise (name, muscle_id, movement_group)
select v.name, m.id, v.movement_group
from (values

  -- vertical pull ------------------------------------------
  ('Wide-grip lat pulldown',          'back', 'vertical pull'),
  ('Close-grip lat pulldown',         'back', 'vertical pull'),
  ('Neutral-grip lat pulldown',       'back', 'vertical pull'),
  ('Reverse-grip lat pulldown',       'back', 'vertical pull'),
  ('Single-arm cable lat pulldown',   'back', 'vertical pull'),
  ('Machine pulldown',                'back', 'vertical pull'),
  ('Straight-arm cable pulldown',     'back', 'vertical pull'),
  ('Wide-grip pull-up',               'back', 'vertical pull'),
  ('Neutral-grip pull-up',            'back', 'vertical pull'),
  ('Chin-up',                         'back', 'vertical pull'),
  ('Weighted pull-up',                'back', 'vertical pull'),
  ('Assisted pull-up',                'back', 'vertical pull'),

  -- horizontal pull ----------------------------------------
  ('Bent-over barbell row',           'back', 'horizontal pull'),
  ('Reverse-grip barbell row',        'back', 'horizontal pull'),
  ('Pendlay row',                     'back', 'horizontal pull'),
  ('Bent-over dumbbell row',          'back', 'horizontal pull'),
  ('Single-arm dumbbell row',         'back', 'horizontal pull'),
  ('Chest-supported dumbbell row',    'back', 'horizontal pull'),
  ('Chest-supported machine row',     'back', 'horizontal pull'),
  ('Wide-grip seated cable row',      'back', 'horizontal pull'),
  ('Neutral-grip seated cable row',   'back', 'horizontal pull'),
  ('Single-arm seated cable row',     'back', 'horizontal pull'),
  ('T-bar row',                       'back', 'horizontal pull'),
  ('Meadows row',                     'back', 'horizontal pull'),
  ('Smith machine row',               'back', 'horizontal pull'),
  ('Seal row',                        'back', 'horizontal pull'),
  ('Inverted row',                    'back', 'horizontal pull'),

  -- traps ---------------------------------------------------
  ('Barbell shrug',                   'back', 'traps'),
  ('Dumbbell shrug',                  'back', 'traps'),
  ('Smith machine shrug',             'back', 'traps'),
  ('Cable shrug',                     'back', 'traps'),
  ('Trap bar shrug',                  'back', 'traps'),

  -- lower back ----------------------------------------------
  ('Conventional deadlift',           'back', 'lower back'),
  ('Sumo deadlift',                   'back', 'lower back'),
  ('Trap bar deadlift',               'back', 'lower back'),
  ('Rack pull',                       'back', 'lower back'),
  ('Back extension',                  'back', 'lower back'),
  ('Weighted back extension',         'back', 'lower back'),
  ('Reverse hyperextension',          'back', 'lower back'),
  ('Good morning',                    'back', 'lower back')

) as v(name, muscle_name, movement_group)
join muscle m on m.name = v.muscle_name
on conflict (name) do nothing;


-- ------------------------------------------------------------
-- Verification. Expected: 189 total, back = 40, and the four
-- back groups at 12 / 15 / 5 / 8. Every non-back row NULL.
-- ------------------------------------------------------------
select m.name as muscle, e.movement_group, count(*) as exercises
from exercise e
join muscle m on m.id = e.muscle_id
group by rollup (m.name, e.movement_group)
order by m.name nulls last, e.movement_group nulls first;
