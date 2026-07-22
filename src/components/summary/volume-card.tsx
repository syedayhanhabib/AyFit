import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { CategoryAccent, Palette, Typefaces, type CategoryName } from '@/constants/theme';
import { hexToRgba } from '@/utils/hex-to-rgba';
import { GlossaryInfoDot } from './glossary-info-dot';

const CATEGORIES: CategoryName[] = ['Chest', 'Back', 'Arms', 'Legs', 'Shoulders'];
const BAR_MAX_HEIGHT = 110;

// Placeholder — real source is a follow-up: working-set count per muscle
// category this week.
const VOLUME_SETS: Record<CategoryName, number> = {
  Chest: 12,
  Back: 14,
  Arms: 8,
  Legs: 16,
  Shoulders: 6,
};

export function VolumeCard() {
  const maxVal = Math.max(...Object.values(VOLUME_SETS));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Volume by muscle</Text>
        <GlossaryInfoDot term="volume" />
        <View style={styles.spacer} />
        <Text style={styles.thisWeek}>This week</Text>
      </View>

      <View style={styles.barsRow}>
        {CATEGORIES.map(name => {
          const raw = VOLUME_SETS[name];
          const height = Math.max(6, Math.round((raw / maxVal) * BAR_MAX_HEIGHT));
          const accent = CategoryAccent[name];
          return (
            <View key={name} style={styles.barColumn}>
              <Text style={styles.barCount}>{raw}</Text>
              <LinearGradient colors={[accent, hexToRgba(accent, 0.35)]} style={[styles.bar, { height }]} />
            </View>
          );
        })}
      </View>

      <View style={styles.divider} />

      <View style={styles.legendRow}>
        {CATEGORIES.map(name => (
          <View key={name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CategoryAccent[name] }]} />
            <Text style={styles.legendLabel}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 14,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  title: { fontFamily: Typefaces.uiBold, fontSize: 16, color: Palette.text },
  spacer: { flex: 1 },
  thisWeek: { fontFamily: Typefaces.uiRegular, fontSize: 12, color: Palette.textMuted },
  barsRow: { flexDirection: 'row', alignItems: 'stretch', gap: 4 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 140 },
  barCount: { fontFamily: Typefaces.numeralBold, fontSize: 13, color: Palette.text, marginBottom: 6 },
  bar: { width: 26, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'stretch', gap: 4 },
  legendItem: { flex: 1, alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontFamily: Typefaces.uiRegular, fontSize: 11, color: Palette.textSecondary },
});
