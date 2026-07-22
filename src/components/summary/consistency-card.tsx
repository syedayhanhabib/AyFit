import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Palette, Typefaces } from '@/constants/theme';
import { hexToRgba } from '@/utils/hex-to-rgba';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Placeholder — real source is a follow-up: sessions logged this calendar
// week (Mon-Sun) and consecutive weeks with >=1 session.
const SESSIONS_THIS_WEEK = 4;
const STREAK_WEEKS = 6;
const COMPLETED_DAYS = [true, true, false, true, false, true, false];

export function ConsistencyCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Consistency</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Sessions this week</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{SESSIONS_THIS_WEEK}</Text>
            <Text style={styles.statUnit}>/7 days</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Streak</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{STREAK_WEEKS}</Text>
            <Text style={styles.statUnit}>weeks</Text>
          </View>
        </View>
      </View>

      <View style={styles.ledgerRow}>
        {DAY_LETTERS.map((letter, i) => (
          <View key={i} style={styles.ledgerColumn}>
            {COMPLETED_DAYS[i] ? (
              <LinearGradient
                colors={[Palette.brand, hexToRgba(Palette.brand, 0.35)]}
                style={styles.ledgerBarFilled}
              />
            ) : (
              <View style={styles.ledgerBarEmpty} />
            )}
            <Text style={styles.ledgerLabel}>{letter}</Text>
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
    padding: 18,
  },
  title: { fontFamily: Typefaces.uiBold, fontSize: 16, color: Palette.text, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1 },
  statLabel: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Palette.textMuted,
    textTransform: 'uppercase',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  statValue: { fontFamily: Typefaces.numeralBold, fontSize: 32, color: Palette.text },
  statUnit: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  divider: { width: 1, backgroundColor: Palette.border, marginHorizontal: 18 },
  ledgerRow: { flexDirection: 'row', gap: 6, marginTop: 20 },
  ledgerColumn: { flex: 1, alignItems: 'center', gap: 6 },
  ledgerBarFilled: { width: '100%', height: 30, borderRadius: 6, borderWidth: 1, borderColor: Palette.brand },
  ledgerBarEmpty: {
    width: '100%',
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: 'transparent',
  },
  ledgerLabel: { fontFamily: Typefaces.uiMedium, fontSize: 10, color: Palette.textMuted },
});
