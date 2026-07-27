import { useEffect, useState } from 'react';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchMusclesForCategory } from '@/lib/muscle-repo';
import { BackButton } from '@/components/track/back-button';
import { CategoryDot } from '@/components/track/category-dot';
import { CategoryAccent, TrackColors, TrackFonts } from '@/constants/track-theme';
import type { Muscle } from '@/types/muscle';
import { formatMuscleName } from '@/utils/format-muscle-name';
import { pluralize } from '@/utils/pluralize';

export default function MusclePickerScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const accent = CategoryAccent[category as keyof typeof CategoryAccent] ?? TrackColors.brand;
  const [muscles, setMuscles] = useState<Muscle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // Mount, not focus — deliberately. Muscle rows only change when the seed file
  // is re-run, and this screen shows nothing per-session (no "last trained"
  // subtitles), so there is nothing here that can go stale while the app is
  // open. That keeps it off the focus-refetch path the exercise list and
  // Summary's cards need, and keeps the single-muscle redirect below from
  // re-evaluating on every focus.
  //
  // `reloadCount` is how Retry re-runs this: bumping it re-triggers the effect
  // rather than duplicating the fetch in the handler, so there is exactly one
  // fetch path and it always gets the `cancelled` guard.
  useEffect(() => {
    let cancelled = false;

    fetchMusclesForCategory(category)
      .then(result => {
        if (cancelled) return;
        setError(null);
        setMuscles(result);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load muscles. Check your connection and try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [category, reloadCount]);

  function handleRetry() {
    setError(null);
    setMuscles(null);
    setReloadCount(count => count + 1);
  }

  // The navigation rule, and the only place it lives: one muscle means the
  // picker would be a dead tap, so skip it. `Redirect` calls router.replace
  // (verified in expo-router's Redirect.js), which swaps this screen out of the
  // stack rather than stacking on top of it — so back from the exercise list
  // goes to the category tiles, not to a picker that would bounce forward
  // again. A push here would produce exactly that bounce.
  if (muscles?.length === 1) {
    return (
      <Redirect
        href={{
          pathname: '/category/[category]/[muscle]',
          params: { category, muscle: muscles[0].name },
        }}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <CategoryDot color={accent} />
                <Text style={styles.title}>{category}</Text>
              </View>
              <Text style={styles.eyebrow}>
                {muscles === null
                  ? '—'
                  : `${muscles.length} ${pluralize(muscles.length, 'muscle')}`}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{error}</Text>
              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryLabel}>Retry</Text>
              </Pressable>
            </View>
          ) : muscles === null ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={TrackColors.textSecondary} />
            </View>
          ) : muscles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No muscles found for this category.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {muscles.map((muscle, index) => (
                <Pressable
                  key={muscle.id}
                  onPress={() =>
                    router.push({
                      pathname: '/category/[category]/[muscle]',
                      params: { category, muscle: muscle.name },
                    })
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Text style={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.rowLabel}>{formatMuscleName(muscle.name)}</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={TrackColors.textMuted}
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TrackColors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 4,
  },
  headerText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: TrackFonts.uiBold, fontSize: 22, color: TrackColors.text },
  eyebrow: {
    fontFamily: TrackFonts.numeralMedium,
    fontSize: 12,
    letterSpacing: 1.5,
    color: TrackColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 68,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: TrackColors.border,
  },
  rowPressed: { backgroundColor: TrackColors.surface },
  rowIndex: { fontFamily: TrackFonts.numeralRegular, fontSize: 13, color: TrackColors.textMuted, width: 20 },
  rowLabel: { flex: 1, fontFamily: TrackFonts.uiSemiBold, fontSize: 16, color: TrackColors.text },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyText: { fontFamily: TrackFonts.uiRegular, fontSize: 14, color: TrackColors.textSecondary, textAlign: 'center' },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: TrackColors.surface },
  retryLabel: { fontFamily: TrackFonts.uiBold, fontSize: 14, color: TrackColors.text },
  pressed: { opacity: 0.75 },
});
