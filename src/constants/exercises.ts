import type { Category } from '@/constants/categories';

export type Exercise = {
  id: string;
  name: string;
  categoryId: Category['name'];
};

export const EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', categoryId: 'Chest' },
  { id: 'incline-db-press', name: 'Incline DB Press', categoryId: 'Chest' },
  { id: 'flat-db-press', name: 'Flat DB Press', categoryId: 'Chest' },
  { id: 'cable-fly', name: 'Cable Fly', categoryId: 'Chest' },
  // Back
  { id: 'lat-pulldown', name: 'Lat Pulldown', categoryId: 'Back' },
  { id: 'barbell-row', name: 'Barbell Row', categoryId: 'Back' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', categoryId: 'Back' },
  { id: 'pull-up', name: 'Pull-Up', categoryId: 'Back' },
  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', categoryId: 'Arms' },
  { id: 'hammer-curl', name: 'Hammer Curl', categoryId: 'Arms' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', categoryId: 'Arms' },
  { id: 'skull-crusher', name: 'Skull Crusher', categoryId: 'Arms' },
  // Legs
  { id: 'back-squat', name: 'Back Squat', categoryId: 'Legs' },
  { id: 'leg-press', name: 'Leg Press', categoryId: 'Legs' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', categoryId: 'Legs' },
  { id: 'leg-curl', name: 'Leg Curl', categoryId: 'Legs' },
  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', categoryId: 'Shoulders' },
  { id: 'lateral-raise', name: 'Lateral Raise', categoryId: 'Shoulders' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', categoryId: 'Shoulders' },
  { id: 'front-raise', name: 'Front Raise', categoryId: 'Shoulders' },
];

// Alphabetical for now; will become most-recent/most-used-first once set logging exists.
export function sortExercises(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name));
}

export function getExercisesForCategory(categoryId: Category['name']): Exercise[] {
  return sortExercises(EXERCISES.filter(exercise => exercise.categoryId === categoryId));
}
