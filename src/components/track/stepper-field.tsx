import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { TrackColors, TrackFonts } from '@/constants/track-theme';

type Props = {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  icon?: ReactNode;
  value: string;
  onChangeText: (text: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  inputWidth?: number;
  flex?: number;
};

export function StepperField({
  label,
  labelStyle,
  icon,
  value,
  onChangeText,
  onDecrement,
  onIncrement,
  keyboardType,
  inputWidth = 44,
  flex = 1,
}: Props) {
  return (
    <View style={[styles.field, { flex }]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        {icon}
      </View>
      <View style={styles.row}>
        <Pressable onPress={onDecrement} hitSlop={8} style={styles.step}>
          <View style={styles.minusIcon} />
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          style={[styles.input, { width: inputWidth }]}
          selectTextOnFocus
        />
        <Pressable onPress={onIncrement} hitSlop={8} style={styles.step}>
          <View style={styles.plusIconV} />
          <View style={styles.plusIconH} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, backgroundColor: TrackColors.surface, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: TrackColors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  step: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  minusIcon: { width: 12, height: 2, backgroundColor: TrackColors.textSecondary },
  plusIconV: { position: 'absolute', width: 2, height: 12, backgroundColor: TrackColors.textSecondary },
  plusIconH: { position: 'absolute', width: 12, height: 2, backgroundColor: TrackColors.textSecondary },
  input: {
    textAlign: 'center',
    fontFamily: TrackFonts.numeralBold,
    // Numeral-lg (40/44) felt oversized squeezed into this three-field
    // stepper row — landed on 28/32 as the live-input size, paired with
    // wider input boxes (see [exerciseId].tsx's inputWidth props) so it
    // doesn't clip multi-digit values.
    fontSize: 28,
    lineHeight: 32,
    color: TrackColors.text,
    paddingVertical: 0,
    // row's minus/plus buttons sit flush against the input's edges (no
    // outer gap to spare in the squeezed three-field row) — this internal
    // padding is what keeps a 4-char value like "57.5" from reading as
    // touching the button glyph, without costing any extra row width.
    paddingHorizontal: 2,
  },
});
