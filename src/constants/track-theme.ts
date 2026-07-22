// Track-prefixed aliases for the shared v3 design tokens in constants/theme.ts.
// The tokens themselves (palette, category accents, type scale) turned out to
// be genuinely app-wide, not Track-specific — they now live in theme.ts and
// are consumed directly by Summary. This file stays only so Track's existing
// screens/components don't need import changes.
import { CategoryAccent, MinTouchTarget, Typefaces, TypeScale, Palette } from '@/constants/theme';
import type { CategoryName } from '@/constants/theme';

export const TrackColors = Palette;
export { CategoryAccent };
export type { CategoryName };
export const TrackFonts = Typefaces;
export const TrackType = TypeScale;
export const TrackTouchTarget = MinTouchTarget;
