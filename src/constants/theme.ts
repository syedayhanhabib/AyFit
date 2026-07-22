/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// v3 design system tokens (per DESIGN.md) — dark, warm-charcoal palette,
// category accent colors, and the JetBrains Mono/Inter type scale. Shared
// across any screen that's had its v3 design pass (Track, Summary); screens
// still on the original light/dark `Colors` above (Calendar, Profile) will
// adopt these once they get their own pass.
export const Palette = {
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
// glyph fill, a small dot, or (per Summary's volume chart) a bar/gradient
// tied to that one category. Never a border/background tint on unrelated UI.
export const CategoryAccent: Record<CategoryName, string> = {
  Chest: '#FF3860',
  Back: '#2EE6FF',
  Arms: '#F5FF3D',
  Legs: '#4CFF6B',
  Shoulders: '#B14EFF',
};

export const Typefaces = {
  numeralRegular: 'JetBrainsMono_400Regular',
  numeralMedium: 'JetBrainsMono_500Medium',
  numeralBold: 'JetBrainsMono_700Bold',
  uiRegular: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemiBold: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
  uiExtraBold: 'Inter_800ExtraBold',
} as const;

export const TypeScale = {
  numeralLg: { fontFamily: Typefaces.numeralBold, fontSize: 40, lineHeight: 44 },
  numeralSm: { fontFamily: Typefaces.numeralBold, fontSize: 20, lineHeight: 24 },
  h1: { fontFamily: Typefaces.uiBold, fontSize: 24, lineHeight: 32 },
  body: { fontFamily: Typefaces.uiRegular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: Typefaces.uiMedium, fontSize: 13, lineHeight: 18 },
} as const;

export const MinTouchTarget = 48;
