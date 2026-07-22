import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Palette, Typefaces } from '@/constants/theme';
import { fmt } from '@/utils/format-number';
import { formatRelativeDate } from '@/utils/format-relative-date';
import { hexToRgba } from '@/utils/hex-to-rgba';

// Placeholder — real source (all-time-best e1RM per exercise, auto-detected
// on each new set) is a follow-up; PR detection itself isn't built yet.
const RECENT_PRS = [
  { exercise: 'Back Squat', e1rm: 142.5, daysAgo: 3 },
  { exercise: 'Bench Press', e1rm: 100.5, daysAgo: 7 },
  { exercise: 'Deadlift', e1rm: 181, daysAgo: 14 },
];

function dateStringDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function RecentPrsCard() {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[hexToRgba(Palette.prGold, 0.14), hexToRgba(Palette.prGold, 0.02)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.7 }}
        style={[StyleSheet.absoluteFill, styles.cardBackdrop]}
      />
      <Text style={styles.title}>Recent PRs</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {RECENT_PRS.map(pr => (
          <View key={pr.exercise} style={styles.prCard}>
            <LinearGradient
              colors={[hexToRgba(Palette.prGold, 0.18), hexToRgba(Palette.prGold, 0.03)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.7 }}
              style={[StyleSheet.absoluteFill, styles.cardBackdrop]}
            />
            <View style={styles.prBadgeRow}>
              <LinearGradient
                colors={[Palette.prGold, hexToRgba(Palette.prGold, 0.4)]}
                style={styles.prDot}
              />
              <Text style={styles.prBadgeLabel}>Personal record</Text>
            </View>
            <Text style={styles.prExercise}>{pr.exercise}</Text>
            <MaskedView
              maskElement={
                <Text style={styles.prValue}>
                  {fmt(pr.e1rm)}
                  <Text style={styles.prValueUnit}>kg</Text>
                </Text>
              }
            >
              <LinearGradient
                colors={[Palette.prGold, hexToRgba(Palette.prGold, 0.55)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.prValue, styles.prValueGhost]}>
                  {fmt(pr.e1rm)}
                  <Text style={styles.prValueUnit}>kg</Text>
                </Text>
              </LinearGradient>
            </MaskedView>
            <Text style={styles.prMeta}>e1RM · {formatRelativeDate(dateStringDaysAgo(pr.daysAgo))}</Text>
          </View>
        ))}
      </ScrollView>
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
    paddingBottom: 18,
    paddingLeft: 18,
    overflow: 'hidden',
  },
  title: { fontFamily: Typefaces.uiBold, fontSize: 16, color: Palette.text, marginBottom: 14, paddingRight: 18 },
  row: { gap: 12, paddingRight: 18, paddingBottom: 2 },
  cardBackdrop: { pointerEvents: 'none' },
  prCard: {
    width: 148,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: hexToRgba(Palette.prGold, 0.45),
    borderRadius: 12,
    padding: 14,
    gap: 8,
    overflow: 'hidden',
    boxShadow: `0 0 18px ${hexToRgba(Palette.prGold, 0.16)}`,
  },
  prBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  prDot: { width: 6, height: 6, borderRadius: 3 },
  prBadgeLabel: {
    fontFamily: Typefaces.uiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: Palette.prGold,
    textTransform: 'uppercase',
  },
  prExercise: { fontFamily: Typefaces.uiSemiBold, fontSize: 14, color: Palette.text },
  // Color here only matters as the web fallback (MaskedView's web shim just
  // renders maskElement as-is, ignoring the gradient — see below). On
  // iOS/Android the real native mask only uses this text's alpha/shape, so
  // its color is irrelevant there; the true gradient always comes from the
  // LinearGradient child.
  prValue: { fontFamily: Typefaces.numeralBold, fontSize: 22, color: Palette.prGold },
  prValueGhost: { opacity: 0 },
  prValueUnit: { fontSize: 13 },
  prMeta: { fontFamily: Typefaces.uiRegular, fontSize: 12, color: Palette.textSecondary },
});
