/**
 * Muscle names are stored lowercase ('front delt', 'glutes') — the first rows
 * were seeded that way and `exercise.muscle_id` references them, so renaming
 * them in the database isn't worth the risk. Capitalise at display time
 * instead: 'front delt' -> 'Front delt', 'glutes' -> 'Glutes'.
 *
 * Sentence case, not title case, so multi-word names read as one label rather
 * than two proper nouns.
 */
export function formatMuscleName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
