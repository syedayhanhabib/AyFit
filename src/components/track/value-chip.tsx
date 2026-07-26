import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { TrackColors, TrackFonts, TrackTouchTarget } from '@/constants/track-theme';

type Props = {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  icon?: ReactNode;
  /** Formatted current value, or '' when nothing has been picked yet. */
  value: string;
  onPress: () => void;
  flex?: number;
};

/**
 * Replaces the old three-up StepperField row (label + minus + TextInput +
 * plus, x3 in one row) — see DESIGN.md's Track Phase 1.5 batch 3 note. This
 * carries no embedded controls at all: it just shows the current value and
 * opens a wheel picker, so there's nothing left to cram against the edges.
 */
export function ValueChip({ label, labelStyle, icon, value, onPress, flex = 1 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { flex }, pressed && styles.chipPressed]}
    >
      <View style={styles.labelRow}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.value, value === '' && styles.valueEmpty]} numberOfLines={1}>
        {value === '' ? '—' : value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: TrackTouchTarget + 24,
    backgroundColor: TrackColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TrackColors.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  chipPressed: { borderColor: TrackColors.brand, backgroundColor: TrackColors.surface },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: TrackColors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: TrackFonts.numeralBold,
    // 28, not 30: the widest realistic weight is 5 chars ("102.5" is an ordinary
    // plate-math number, not an edge case) and at 30 that clips inside the Kg
    // chip on a 320pt-wide screen. Same numeral size the old stepper input used,
    // but now with the whole chip to itself instead of sharing a row with +/-.
    fontSize: 28,
    lineHeight: 34,
    color: TrackColors.text,
    fontVariant: ['tabular-nums'],
  },
  valueEmpty: { color: TrackColors.textMuted },
});
