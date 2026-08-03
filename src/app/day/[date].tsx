import { useCallback, useState } from 'react';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSessionDayDetail } from '@/lib/calendar-repo';
import type { DayDetail } from '@/types/calendar';
import { formatFullDate } from '@/utils/date-display';
import { fmt } from '@/utils/format-number';
import { pluralize } from '@/utils/pluralize';
import { MinTouchTarget, Palette, Typefaces } from '@/constants/theme';

// Reachable by deep link / hand-typed URL, so the param can be anything —
// validate BEFORE querying rather than let a malformed value reach
// .eq('session.date', date), which PostgREST would answer with a 400 that
// would surface here as "couldn't load" when the real problem is the URL.
const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DayFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; detail: DayDetail | null }
  | { status: 'error' };

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const rawDate = typeof date === 'string' ? date : '';
  const isValidDate = DATE_PARAM_PATTERN.test(rawDate);

  // Malformed param: render the SAME empty state a genuinely empty day
  // gets, per DESIGN.md — never queried, so start already "loaded, nothing
  // there" rather than flashing a loading spinner for a fetch that will
  // never fire.
  const [fetchState, setFetchState] = useState<DayFetchState>(
    isValidDate ? { status: 'loading' } : { status: 'loaded', detail: null },
  );

  // Focus, not mount — same convention as calendar.tsx and Summary's cards
  // (fd64f34).
  useFocusEffect(
    useCallback(() => {
      if (!isValidDate) return;
      let cancelled = false;

      // Only drop to loading on a genuine first load — a refocus with data
      // already on screen refreshes quietly in the background rather than
      // flashing a spinner over dots that are still correct.
      setFetchState(prev => (prev.status === 'loaded' ? prev : { status: 'loading' }));

      getSessionDayDetail(rawDate)
        .then(detail => {
          if (!cancelled) setFetchState({ status: 'loaded', detail });
        })
        .catch(() => {
          // Deliberately NOT falling back to "nothing logged" here — that's
          // the parked [exerciseId].tsx bug where a network error reads as
          // a genuinely missing/empty result. A failed fetch gets its own
          // explicit state instead.
          if (!cancelled) setFetchState({ status: 'error' });
        });

      return () => {
        cancelled = true;
      };
    }, [rawDate, isValidDate]),
  );

  const loadedDetail = fetchState.status === 'loaded' ? fetchState.detail : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Back to calendar"
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color={Palette.text} />
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.dateTitle} numberOfLines={1}>
                {isValidDate ? formatFullDate(rawDate) : ''}
              </Text>
              {/* Line height reserved unconditionally, same reasoning as
                  calendar.tsx's count line: the layout must not shift when
                  the fetch resolves. */}
              <Text style={styles.countLine}>
                {loadedDetail
                  ? `${loadedDetail.totalSets} ${pluralize(loadedDetail.totalSets, 'set')} · ${loadedDetail.exerciseCount} ${pluralize(loadedDetail.exerciseCount, 'exercise')}`
                  : ''}
              </Text>
            </View>

            {/* Balances the back button's width so the title stays
                centered, same structure as calendar.tsx's two arrows. */}
            <View style={styles.backButton} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {fetchState.status === 'loading' && (
              <ActivityIndicator color={Palette.textSecondary} style={styles.loading} />
            )}

            {fetchState.status === 'error' && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Palette.textSecondary} />
                <Text style={styles.errorText}>Couldn&apos;t load this day.</Text>
              </View>
            )}

            {fetchState.status === 'loaded' && loadedDetail === null && (
              <Text style={styles.emptyText}>Nothing logged</Text>
            )}

            {loadedDetail?.blocks.map((block, blockIndex) => (
              <View key={blockIndex} style={styles.block}>
                <Text style={styles.exerciseName}>{block.exerciseName}</Text>
                {block.sets.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setRow}>
                    <Text style={[styles.setIndex, set.isWarmup && styles.setIndexWarmup]}>
                      {set.isWarmup ? 'W' : String(set.workingSetNumber).padStart(2, '0')}
                    </Text>
                    <View style={styles.setBody}>
                      <Text style={[styles.weightReps, set.isWarmup ? styles.weightRepsWarmup : styles.weightRepsWorking]}>
                        {fmt(set.weightKg)}kg × {set.reps}
                      </Text>
                      <Text style={styles.meta}>{set.isWarmup ? `warm-up · RPE ${fmt(set.rpe)}` : `RPE ${fmt(set.rpe)}`}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  backButton: { width: MinTouchTarget, height: MinTouchTarget, alignItems: 'center', justifyContent: 'center' },
  backButtonPressed: { opacity: 0.5 },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  dateTitle: { fontFamily: Typefaces.uiBold, fontSize: 16, letterSpacing: 0.5, color: Palette.text, textAlign: 'center' },
  countLine: {
    height: 20,
    lineHeight: 20,
    marginTop: 2,
    fontFamily: Typefaces.numeralMedium,
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  loading: { paddingVertical: 32 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  errorText: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  emptyText: {
    fontFamily: Typefaces.uiRegular,
    fontSize: 14,
    color: Palette.textMuted,
    textAlign: 'center',
    paddingVertical: 32,
  },
  block: { marginBottom: 20 },
  exerciseName: { fontFamily: Typefaces.uiBold, fontSize: 15, color: Palette.text, marginBottom: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  setIndex: { fontFamily: Typefaces.numeralBold, fontSize: 13, color: Palette.text, width: 20 },
  setIndexWarmup: { fontFamily: Typefaces.uiRegular, color: Palette.textMuted },
  setBody: { flex: 1, minWidth: 0 },
  weightReps: { fontVariant: ['tabular-nums'] },
  weightRepsWorking: { fontFamily: Typefaces.numeralBold, fontSize: 16, color: Palette.text },
  weightRepsWarmup: { fontFamily: Typefaces.uiRegular, fontSize: 14, color: Palette.textMuted },
  meta: { fontFamily: Typefaces.uiRegular, fontSize: 12, color: Palette.textMuted, marginTop: 2 },
});
