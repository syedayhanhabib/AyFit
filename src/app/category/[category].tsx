import { router, Stack, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getExercisesForCategory } from '@/constants/exercises';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const theme = useTheme();
  const exercises = getExercisesForCategory(category);

  return (
    <>
      <Stack.Screen options={{ title: category }} />
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {exercises.length === 0 ? (
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
                  onPress={() => router.push(`/exercise/${exercise.id}`)}
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
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
