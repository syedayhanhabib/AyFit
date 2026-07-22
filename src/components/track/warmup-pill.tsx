import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TrackColors, TrackFonts } from '@/constants/track-theme';

type Props = { value: boolean; onToggle: () => void };

export function WarmupPill({ value, onToggle }: Props) {
  return (
    <Pressable onPress={onToggle} style={styles.pill} hitSlop={4}>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.dot, value && styles.dotOn]} />
      </View>
      <Text style={styles.label}>Warm-up</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 24,
    backgroundColor: TrackColors.surface,
    flexShrink: 0,
  },
  track: {
    width: 36,
    height: 22,
    borderRadius: 11,
    backgroundColor: TrackColors.background,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: '#3A3D42' },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: TrackColors.text,
    marginLeft: 3,
  },
  dotOn: { marginLeft: 17 },
  label: { fontFamily: TrackFonts.uiRegular, fontSize: 13, color: TrackColors.textSecondary },
});
