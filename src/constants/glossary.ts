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
      "Body Mass Index — your weight divided by your height squared. It's a population-level screening ratio, not a measure of body composition: it has no term for muscle, so it can't tell lean mass from fat mass. That's why trained lifters routinely read overweight or higher while carrying low body fat — a 178cm, 95kg lifter comes out at 30.0. Standard WHO cutoffs are used here. Some health bodies apply lower thresholds for people of South Asian, Chinese and other Asian descent — overweight from 23.0, obese from 27.5 — because cardiometabolic risk rises at a lower BMI in those populations.",
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
