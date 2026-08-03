import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTrainedDaysInMonth } from '@/lib/calendar-repo';
import { buildMonthGrid } from '@/utils/month-grid';
import { parseDateLocal, todayLocalDate } from '@/utils/local-date';
import { formatFullDate, formatMonthHeader } from '@/utils/date-display';
import { pluralize } from '@/utils/pluralize';
import { MinTouchTarget, Palette, Typefaces } from '@/constants/theme';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// `year`/`month` are carried on the loaded state (not just the trained-days
// array) so the render below can check the data actually belongs to the
// month currently on screen — see the out-of-order-response note on
// useFocusEffect further down.
type MonthFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; year: number; month: number; trainedDays: string[] }
  | { status: 'error' };

export default function CalendarScreen() {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1; // 1-12, matching buildMonthGrid/getMonthRange's convention
  const todayDateStr = todayLocalDate();

  const [viewed, setViewed] = useState({ year: todayYear, month: todayMonth });
  const [fetchState, setFetchState] = useState<MonthFetchState>({ status: 'loading' });

  const isCurrentMonth = viewed.year === todayYear && viewed.month === todayMonth;
  const grid = useMemo(() => buildMonthGrid(viewed.year, viewed.month), [viewed.year, viewed.month]);

  // Focus, not mount — same reasoning as Summary's cards (fd64f34): once 5c
  // lands, Calendar stays mounted under a pushed /day/[date] route, so a
  // mount-only effect would keep showing whatever was on screen when that
  // route was pushed. Depending on [viewed.year, viewed.month] means an
  // arrow tap re-runs this effect too, which is what makes the out-of-order
  // guard below work: each run's cleanup marks its OWN `cancelled` closure
  // before the next run starts, so a slow response for a month the user has
  // since navigated away from never reaches setFetchState.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const requestedYear = viewed.year;
      const requestedMonth = viewed.month;

      // Only drop to the loading state when switching to a month that isn't
      // already loaded. A same-month refocus (tabbing back to Calendar)
      // keeps the existing dots on screen while it refreshes quietly in the
      // background, same as Summary's cards — reading `prev` via the
      // functional form rather than the outer `fetchState` closure, since
      // `fetchState` isn't (and shouldn't be) a dependency of this effect.
      setFetchState(prev =>
        prev.status === 'loaded' && prev.year === requestedYear && prev.month === requestedMonth
          ? prev
          : { status: 'loading' },
      );

      getTrainedDaysInMonth(requestedYear, requestedMonth)
        .then(trainedDays => {
          if (!cancelled) setFetchState({ status: 'loaded', year: requestedYear, month: requestedMonth, trainedDays });
        })
        .catch(() => {
          // Deliberately NOT falling back to an empty array here — that
          // would render identically to a genuinely empty month ("0 days
          // trained", no dots), which is exactly the null-on-fetch-failure
          // bug parked against [exerciseId].tsx in CLAUDE.md. A failed
          // fetch gets its own explicit state instead.
          if (!cancelled) setFetchState({ status: 'error' });
        });

      return () => {
        cancelled = true;
      };
    }, [viewed.year, viewed.month]),
  );

  // Belt-and-suspenders on top of the cancellation guard above: only trust
  // fetchState's dots if they're tagged for the month actually on screen.
  const currentMonthData =
    fetchState.status === 'loaded' && fetchState.year === viewed.year && fetchState.month === viewed.month
      ? fetchState
      : null;
  const trainedDaySet = useMemo(() => new Set(currentMonthData?.trainedDays ?? []), [currentMonthData]);

  function goToPreviousMonth() {
    setViewed(({ year, month }) => (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }));
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setViewed(({ year, month }) => (month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }));
  }

  function goToToday() {
    setViewed({ year: todayYear, month: todayMonth });
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={goToPreviousMonth}
            style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={Palette.text} />
          </Pressable>

          <View style={styles.monthTitleContainer}>
            <Text style={styles.monthTitle}>{formatMonthHeader(viewed.year, viewed.month)}</Text>
            {/* Line height reserved unconditionally (fixed `height` in the
                style below), same reasoning as the transparent dot/ring and
                the dimmed-not-hidden forward arrow: the grid must not shift
                when the fetch resolves and this text appears. */}
            <Text style={styles.countLine}>
              {currentMonthData
                ? `${trainedDaySet.size} ${pluralize(trainedDaySet.size, 'day trained', 'days trained')}`
                : ''}
            </Text>
          </View>

          <Pressable
            onPress={goToNextMonth}
            disabled={isCurrentMonth}
            style={({ pressed }) => [styles.arrowButton, pressed && !isCurrentMonth && styles.arrowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={isCurrentMonth ? Palette.textMuted : Palette.text}
            />
          </Pressable>
        </View>

        {/* Row always renders (fixed `minHeight` below) — only the button
            inside is conditional, so switching months never shifts the
            grid by the row's height. Same principle as the transparent
            dot/ring and the dimmed-not-hidden forward arrow above. */}
        <View style={styles.todayRow}>
          {!isCurrentMonth && (
            <Pressable onPress={goToToday} style={styles.todayButton} hitSlop={8}>
              <Text style={styles.todayButtonLabel}>Today</Text>
            </Pressable>
          )}
        </View>

        {fetchState.status === 'error' && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Palette.textSecondary} />
            <Text style={styles.errorText}>Couldn&apos;t load this month.</Text>
          </View>
        )}

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map(label => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        {grid.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((dateKey, dayIndex) => {
              if (dateKey === null) {
                return <View key={dayIndex} style={styles.dayCell} />;
              }
              const dayNumber = parseDateLocal(dateKey).getDate();
              const isToday = dateKey === todayDateStr;
              const isTrained = trainedDaySet.has(dateKey);
              const cellContent = (
                <>
                  <View style={[styles.dayNumberRing, isToday && styles.dayNumberRingToday]}>
                    <Text style={styles.dayNumber}>{dayNumber}</Text>
                  </View>
                  <View style={[styles.dot, isTrained && styles.dotVisible]} />
                </>
              );

              // ONLY dotted cells are pressable, per DESIGN.md: the absence
              // of a dot IS the empty state, and the grid must not navigate
              // to a screen that just restates it. Untrained past/future
              // days stay inert — no onPress, no pressed feedback, no
              // accessibility role.
              if (!isTrained) {
                return (
                  <View key={dayIndex} style={styles.dayCell}>
                    {cellContent}
                  </View>
                );
              }

              return (
                <Pressable
                  key={dayIndex}
                  onPress={() => router.push({ pathname: '/day/[date]', params: { date: dateKey } })}
                  style={({ pressed }) => [styles.dayCell, pressed && styles.arrowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatFullDate(dateKey)}, trained day`}
                >
                  {cellContent}
                </Pressable>
              );
            })}
          </View>
        ))}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  arrowButton: { width: MinTouchTarget, height: MinTouchTarget, alignItems: 'center', justifyContent: 'center' },
  arrowPressed: { opacity: 0.5 },
  monthTitleContainer: { flex: 1, alignItems: 'center' },
  monthTitle: {
    fontFamily: Typefaces.uiBold,
    fontSize: 16,
    letterSpacing: 0.5,
    color: Palette.text,
    textAlign: 'center',
  },
  countLine: {
    height: 20,
    lineHeight: 20,
    marginTop: 2,
    fontFamily: Typefaces.numeralMedium,
    fontSize: 14,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  todayRow: { minHeight: MinTouchTarget, alignItems: 'flex-end', marginTop: 2 },
  todayButton: { minHeight: MinTouchTarget, justifyContent: 'center', paddingHorizontal: 4 },
  todayButtonLabel: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 13,
    color: Palette.textSecondary,
    textDecorationLine: 'underline',
  },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  errorText: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  weekdayRow: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Palette.textMuted,
    textTransform: 'uppercase',
  },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayNumberRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberRingToday: { borderColor: Palette.brand },
  dayNumber: { fontFamily: Typefaces.numeralMedium, fontSize: 14, color: Palette.text },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, backgroundColor: 'transparent' },
  dotVisible: { backgroundColor: Palette.text },
});
