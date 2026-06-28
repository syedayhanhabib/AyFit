import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type CategoryIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type Category = { name: string; icon: CategoryIconName };

export const CATEGORIES: Category[] = [
  { name: 'Chest',     icon: 'weight-lifter' },
  { name: 'Back',      icon: 'human-handsdown' },
  { name: 'Arms',      icon: 'arm-flex' },
  { name: 'Legs',      icon: 'run' },
  { name: 'Shoulders', icon: 'human' },
];
