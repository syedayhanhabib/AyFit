import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/CategoryTile';
import { CATEGORIES } from '@/constants/categories';
import { ThemedView } from '@/components/themed-view';

export default function TrackScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.list}>
          {CATEGORIES.map(cat => (
            <CategoryTile
              key={cat.name}
              name={cat.name}
              icon={cat.icon}
              onPress={() => router.push(`/category/${cat.name}`)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: 16, gap: 12 },
});
