import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();

  return (
    <>
      <Stack.Screen options={{ title: category }} />
      <ThemedView style={styles.container}>
        <ThemedText type="default" themeColor="textSecondary">
          Exercises coming soon
        </ThemedText>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
