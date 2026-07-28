/**
 * Sentence-cases a movement_group value for exercise list section headers
 * ('vertical pull' -> 'Vertical pull'). Kept separate from
 * format-muscle-name.ts even though today's capitalisation logic is
 * identical: that function's doc/semantics are specifically about muscle
 * names (lowercase storage, renaming risk), not movement_group phrases.
 */
export function formatMovementGroupName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
