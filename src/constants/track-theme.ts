// Design tokens for the Track flow (muscle picker, exercise list, per-set logging),
// per DESIGN.md. Dark-only by design intent — scoreboard/logbook feel, not a
// generic app dark-mode. Scoped to Track only; Summary/Calendar/Profile still use
// the light/dark `useTheme()` palette in constants/theme.ts until they get their
// own design pass.

export const TrackColors = {
  background: '#16181B',
  surface: '#1F2226',
  border: '#2A2E33',
  text: '#EDEAE3',
  textSecondary: '#8A8F94',
  textMuted: '#55585C',
  brand: '#B14EFF',
  brandPressed: '#9A3AE0',
  prGold: '#FFC738',
} as const;

export type CategoryName = 'Chest' | 'Back' | 'Arms' | 'Legs' | 'Shoulders';

// Category color is an identifier, not a decoration — contained to the icon
// glyph fill or a small dot, never a border/background tint/glow.
export const CategoryAccent: Record<CategoryName, string> = {
  Chest: '#FF3860',
  Back: '#2EE6FF',
  Arms: '#F5FF3D',
  Legs: '#4CFF6B',
  Shoulders: '#B14EFF',
};

export const TrackFonts = {
  numeralRegular: 'JetBrainsMono_400Regular',
  numeralMedium: 'JetBrainsMono_500Medium',
  numeralBold: 'JetBrainsMono_700Bold',
  uiRegular: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemiBold: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
} as const;

export const TrackType = {
  numeralLg: { fontFamily: TrackFonts.numeralBold, fontSize: 40, lineHeight: 44 },
  numeralSm: { fontFamily: TrackFonts.numeralBold, fontSize: 20, lineHeight: 24 },
  h1: { fontFamily: TrackFonts.uiBold, fontSize: 24, lineHeight: 32 },
  body: { fontFamily: TrackFonts.uiRegular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: TrackFonts.uiMedium, fontSize: 13, lineHeight: 18 },
} as const;

export const TrackTouchTarget = 48;
