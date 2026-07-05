import { useCallback, useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExercisesForCategory } from '@/lib/exercises-repo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/types/exercise';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const theme = useTheme();
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
      <Stack.Screen options={{ title: category }} />
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {error ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText type="default" themeColor="textSecondary">{error}</ThemedText>
              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => [
                  styles.retryButton,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">Retry</ThemedText>
              </Pressable>
            </ThemedView>
          ) : exercises === null ? (
            <ThemedView style={styles.emptyState}>
              <ActivityIndicator color={theme.textSecondary} />
            </ThemedView>
          ) : exercises.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText type="default" themeColor="textSecondary">
                No exercises found for this category.
              </ThemedText>
            </ThemedView>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {exercises.map(exercise => (
                <Pressable
                  key={exercise.id}
                  onPress={() =>
                    router.push({
                      pathname: '/exercise/[exerciseId]',
                      params: { exerciseId: exercise.id, name: exercise.name },
                    })
                  }
                  android_ripple={{ color: theme.backgroundSelected }}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="default" style={styles.label}>{exercise.name}</ThemedText>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: 16, gap: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.75 },
  label: { flex: 1 },
});
