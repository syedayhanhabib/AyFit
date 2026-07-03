import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { EXERCISES } from '@/constants/exercises';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ExerciseScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const exercise = EXERCISES.find(item => item.id === exerciseId);

  return (
    <>
      <Stack.Screen options={{ title: exercise?.name ?? 'Exercise' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="default" themeColor="textSecondary">
          {exercise?.name ?? 'Exercise not found'}
        </ThemedText>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
