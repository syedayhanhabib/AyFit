import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getVolumeByMuscle } from '@/lib/summary-repo';
import { CategoryAccent, Palette, Typefaces, type CategoryName } from '@/constants/theme';
import { hexToRgba } from '@/utils/hex-to-rgba';
import { GlossaryInfoDot } from './glossary-info-dot';

const CATEGORIES: CategoryName[] = ['Chest', 'Back', 'Arms', 'Legs', 'Shoulders'];
const BAR_MAX_HEIGHT = 110;
const BAR_MIN_HEIGHT = 6;

export function VolumeCard() {
  // null = not yet fetched. getVolumeByMuscle always returns all five
  // categories (zero-filled if untrained), so once resolved the card always
  // renders bars — there's no "hide the card" case like Progression has.
  const [volume, setVolume] = useState<Record<CategoryName, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVolumeByMuscle()
      .then(result => {
        if (!cancelled) setVolume(result);
      })
      .catch(() => {
        if (!cancelled) setVolume({ Chest: 0, Back: 0, Arms: 0, Legs: 0, Shoulders: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A brand-new week with nothing logged yet means every category is 0 —
  // guard against dividing by a zero max (NaN heights) by falling straight
  // to the minimum bar height in that case.
  const maxVal = volume ? Math.max(...Object.values(volume)) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Volume by muscle</Text>
        <GlossaryInfoDot term="volume" />
        <View style={styles.spacer} />
        <Text style={styles.thisWeek}>This week</Text>
      </View>

      {volume === null ? (
        <ActivityIndicator color={Palette.textSecondary} style={styles.loading} />
      ) : (
        <>
          <View style={styles.barsRow}>
            {CATEGORIES.map(name => {
              const raw = volume[name];
              const height = maxVal > 0 ? Math.max(BAR_MIN_HEIGHT, Math.round((raw / maxVal) * BAR_MAX_HEIGHT)) : BAR_MIN_HEIGHT;
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
        </>
      )}
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
  loading: { paddingVertical: 32 },
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
