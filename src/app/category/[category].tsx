import { useCallback, useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExercisesForCategory } from '@/lib/exercises-repo';
import { BackButton } from '@/components/track/back-button';
import { CategoryDot } from '@/components/track/category-dot';
import { CategoryAccent, TrackColors, TrackFonts } from '@/constants/track-theme';
import type { Exercise } from '@/types/exercise';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const accent = CategoryAccent[category as keyof typeof CategoryAccent] ?? TrackColors.brand;
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchExercisesForCategory(category)
      .then(result => {
        setError(null);
        setExercises(result);
      })
      .catch(() => setError('Could not load exercises. Check your connection and try again.'));
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setError(null);
    setExercises(null);
    load();
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
                {exercises === null ? '—' : `${exercises.length} exercises`}
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
          ) : exercises === null ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={TrackColors.textSecondary} />
            </View>
          ) : exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exercises found for this category.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {exercises.map((exercise, index) => (
                <Pressable
                  key={exercise.id}
                  onPress={() =>
                    router.push({
                      pathname: '/exercise/[exerciseId]',
                      params: { exerciseId: exercise.id, name: exercise.name, category },
                    })
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Text style={styles.rowLabel}>{exercise.name}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={TrackColors.textMuted} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 18, paddingTop: 4 },
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
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: TrackColors.border,
  },
  rowPressed: { backgroundColor: TrackColors.surface },
  rowLabel: { flex: 1, fontFamily: TrackFonts.uiSemiBold, fontSize: 16, color: TrackColors.text },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyText: { fontFamily: TrackFonts.uiRegular, fontSize: 14, color: TrackColors.textSecondary, textAlign: 'center' },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: TrackColors.surface },
  retryLabel: { fontFamily: TrackFonts.uiBold, fontSize: 14, color: TrackColors.text },
  pressed: { opacity: 0.75 },
});
