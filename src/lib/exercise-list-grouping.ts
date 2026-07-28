import type { Exercise } from '@/types/exercise';

// Display order for Back's section labels — not alphabetical, not stored in
// the DB. See CLAUDE.md's "movement_group" section for why these four.
export const MOVEMENT_GROUP_ORDER = [
  'vertical pull',
  'horizontal pull',
  'traps',
  'lower back',
] as const;

const KNOWN_MOVEMENT_GROUPS: readonly string[] = MOVEMENT_GROUP_ORDER;

function byName(a: Exercise, b: Exercise): number {
  return a.name.localeCompare(b.name);
}

/**
 * Splits one muscle's exercises into the Favourites section (always A-Z,
 * regardless of movement_group) and everything else, further split into
 * movement_group sections when any are set (Back only today) or left as a
 * single unlabelled section otherwise.
 *
 * Invariant: favourites.length + sum of every section's exercises.length ===
 * exercises.length. Nothing is ever silently dropped — a movement_group value
 * outside the four known constants (shouldn't happen given the DB CHECK
 * constraint, but this is a pure client function that shouldn't trust that)
 * lands in a trailing unlabelled section rather than being discarded.
 */
export function groupExercisesForList(exercises: Exercise[]): {
  favourites: Exercise[];
  sections: { label: string | null; exercises: Exercise[] }[];
} {
  const favourites = exercises.filter(e => e.isFavourited).sort(byName);
  const rest = exercises.filter(e => !e.isFavourited);

  if (rest.every(e => e.movementGroup === null)) {
    return {
      favourites,
      sections: rest.length > 0 ? [{ label: null, exercises: [...rest].sort(byName) }] : [],
    };
  }

  const sections: { label: string | null; exercises: Exercise[] }[] = [];

  for (const group of MOVEMENT_GROUP_ORDER) {
    const inGroup = rest.filter(e => e.movementGroup === group).sort(byName);
    if (inGroup.length > 0) sections.push({ label: group, exercises: inGroup });
  }

  const unrecognised = rest
    .filter(e => e.movementGroup === null || !KNOWN_MOVEMENT_GROUPS.includes(e.movementGroup))
    .sort(byName);
  if (unrecognised.length > 0) sections.push({ label: null, exercises: unrecognised });

  return { favourites, sections };
}
