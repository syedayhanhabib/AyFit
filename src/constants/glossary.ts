export type GlossaryTermKey = 'rpe' | 'e1rm' | 'progressiveOverload' | 'volume' | 'warmUp';

export type GlossaryEntry = { title: string; description: string };

export const GLOSSARY: Record<GlossaryTermKey, GlossaryEntry> = {
  rpe: {
    title: 'RPE',
    description:
      "Rate of Perceived Exertion. A 1-10 scale of how hard a set felt. ~10 = couldn't do another rep; lower numbers = more left in the tank.",
  },
  e1rm: {
    title: 'e1RM',
    description:
      'Estimated one-rep max. The weight you could theoretically lift once, calculated from the weight and reps you actually did. Used to track strength across different rep ranges.',
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
};
