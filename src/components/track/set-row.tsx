import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { TrackColors, TrackFonts } from '@/constants/track-theme';
import type { LoggedSet } from '@/types/logged-set';
import { fmt } from '@/utils/format-number';

type Props = { set: LoggedSet; index: number; onDelete: () => void };

export function SetRow({ set, index, onDelete }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 260 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 10 },
      { scale: 0.97 + progress.value * 0.03 },
    ],
  }));

  return (
    <Animated.View style={[styles.row, !set.isWarmup && styles.rowWorking, animatedStyle]}>
      <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.body}>
        <Text style={[styles.weightReps, set.isWarmup ? styles.weightRepsWarmup : styles.weightRepsWorking]}>
          {fmt(set.weightKg)}kg × {set.reps}
        </Text>
        <Text style={styles.meta}>
          {set.isWarmup ? `warm-up · RPE ${fmt(set.rpe)}` : `RPE ${fmt(set.rpe)}`}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
        <MaterialCommunityIcons name="trash-can-outline" size={16} color={TrackColors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderRadius: 8,
  },
  rowWorking: { backgroundColor: TrackColors.surface },
  index: { fontFamily: TrackFonts.numeralRegular, fontSize: 12, color: TrackColors.textMuted, width: 18 },
  body: { flex: 1, minWidth: 0 },
  weightReps: { fontVariant: ['tabular-nums'] },
  weightRepsWorking: { fontFamily: TrackFonts.numeralBold, fontSize: 18, color: TrackColors.text },
  weightRepsWarmup: { fontFamily: TrackFonts.uiRegular, fontSize: 14, color: TrackColors.textMuted },
  meta: { fontFamily: TrackFonts.uiRegular, fontSize: 12, color: TrackColors.textMuted, marginTop: 2 },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
