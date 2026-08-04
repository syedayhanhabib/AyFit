export type GlossaryTermKey =
  | 'rpe'
  | 'e1rm'
  | 'progressiveOverload'
  | 'volume'
  | 'warmUp'
  | 'bmi'
  | 'tdee'
  | 'relativeStrength';

export type GlossaryEntry = { title: string; description: string };

export const GLOSSARY: Record<GlossaryTermKey, GlossaryEntry> = {
  rpe: {
    title: 'RPE',
    description:
      "Rate of Perceived Exertion — how hard a set felt, on a 1-10 scale. 10 means you couldn't have done another rep with good form; a 7 leaves about three reps in the tank. The scale started as a 1960s tool for cardio, later adapted by strength coaches to anchor each number to 'reps in reserve' — so it's less a mood score and more an estimate of how close you got to failure.",
  },
  e1rm: {
    title: 'e1RM',
    description:
      "Estimated one-rep max — the weight you could theoretically lift once, calculated from the weight and reps you actually did (Epley formula). AyFit takes your best working set each session and tracks that number over time — it's the core 'am I getting stronger' line. Most accurate under about 10 reps; for higher-rep sets, trust the trend more than the exact figure.",
  },
  progressiveOverload: {
    title: 'Progressive overload',
    description:
      'Gradually doing more over time (more weight, more reps, or more sets) so your muscles keep adapting. The core driver of progress.',
  },
  volume: {
    title: 'Volume',
    description: 'Total work done, roughly weight x reps x sets. A key driver of muscle growth.',
  },
  warmUp: {
    title: 'Warm-up set',
    description:
      "Lighter preparatory sets done before your real working sets. Logged for completeness, but excluded from progress tracking (e1RM, volume, PRs) so easy sets don't skew your numbers.",
  },
  bmi: {
    title: 'BMI',
    description:
      "Body Mass Index — weight relative to height squared, with no body-composition term. It can't tell muscle from fat, so a muscular lifter often reads high: a 178cm, 95kg lifter is BMI 30.0, not obese. It's a population screening tool, not an individual diagnosis. WHO publishes lower cutoffs for Asian and South Asian populations (overweight from 23.0, obese from 27.5), since cardiometabolic risk rises at a lower BMI in those groups — this app shows the standard cutoffs.",
  },
  tdee: {
    title: 'TDEE',
    description:
      'Total Daily Energy Expenditure — your estimated maintenance calories. AyFit calculates this with the Mifflin-St Jeor formula, which runs roughly ±15-20% against a measured value, so treat it as a ballpark rather than a precise number. Activity level is derived from your logged training days, not a self-reported guess.',
  },
  relativeStrength: {
    title: 'Relative strength',
    description:
      "Your estimated one-rep max (e1RM) divided by your bodyweight, e.g. '1.6x bodyweight bench'. It's how lifters compare strength across different body sizes. Note it compares your best-ever lift against your CURRENT bodyweight, not your weight at the time of that lift.",
  },
};
