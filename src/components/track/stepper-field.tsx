import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TrackColors, TrackFonts } from '@/constants/track-theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  inputWidth?: number;
};

export function StepperField({ label, value, onChangeText, onDecrement, onIncrement, keyboardType, inputWidth = 44 }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
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
  field: { flex: 1, backgroundColor: TrackColors.surface, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 4 },
  label: {
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: TrackColors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  step: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  minusIcon: { width: 12, height: 2, backgroundColor: TrackColors.textSecondary },
  plusIconV: { position: 'absolute', width: 2, height: 12, backgroundColor: TrackColors.textSecondary },
  plusIconH: { position: 'absolute', width: 12, height: 2, backgroundColor: TrackColors.textSecondary },
  input: {
    textAlign: 'center',
    fontFamily: TrackFonts.numeralBold,
    fontSize: 19,
    color: TrackColors.text,
    paddingVertical: 0,
  },
});
