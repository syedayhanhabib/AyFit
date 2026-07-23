import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getConsistency } from '@/lib/summary-repo';
import { Palette, Typefaces } from '@/constants/theme';
import { hexToRgba } from '@/utils/hex-to-rgba';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ALL_FALSE_WEEK = [false, false, false, false, false, false, false];

type Consistency = { sessionsThisWeek: number; weeklyStreak: number; completedDays: boolean[] };

export function ConsistencyCard() {
  // null = not yet fetched.
  const [consistency, setConsistency] = useState<Consistency | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConsistency()
      .then(result => {
        if (!cancelled) setConsistency(result);
      })
      .catch(() => {
        if (!cancelled) setConsistency({ sessionsThisWeek: 0, weeklyStreak: 0, completedDays: ALL_FALSE_WEEK });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Consistency</Text>

      {consistency === null ? (
        <ActivityIndicator color={Palette.textSecondary} style={styles.loading} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Sessions this week</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{consistency.sessionsThisWeek}</Text>
                <Text style={styles.statUnit}>/7 days</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Streak</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{consistency.weeklyStreak}</Text>
                <Text style={styles.statUnit}>{consistency.weeklyStreak === 1 ? 'week' : 'weeks'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.ledgerRow}>
            {DAY_LETTERS.map((letter, i) => (
              <View key={i} style={styles.ledgerColumn}>
                {consistency.completedDays[i] ? (
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
    padding: 18,
  },
  title: { fontFamily: Typefaces.uiBold, fontSize: 16, color: Palette.text, marginBottom: 16 },
  loading: { paddingVertical: 32 },
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
