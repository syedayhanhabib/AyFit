import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATEGORIES, type Category } from '@/constants/categories';
import { CategoryAccent, TrackColors, TrackFonts } from '@/constants/track-theme';

export default function TrackScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>AYFIT</Text>
          <Text style={styles.eyebrow}>Track — pick a muscle</Text>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {CATEGORIES.map((cat, index) => (
            <MuscleRow
              key={cat.name}
              category={cat}
              index={index}
              onPress={() => router.push(`/category/${cat.name}`)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type MuscleRowProps = { category: Category; index: number; onPress: () => void };

function MuscleRow({ category, index, onPress }: MuscleRowProps) {
  const accent = CategoryAccent[category.name as keyof typeof CategoryAccent] ?? TrackColors.brand;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        index === 0 && styles.rowFirst,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</Text>
      <MaterialCommunityIcons name={category.icon} size={22} color={accent} />
      <Text style={styles.rowLabel}>{category.name}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={TrackColors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TrackColors.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 },
  wordmark: {
    fontFamily: TrackFonts.uiBold,
    fontSize: 22,
    letterSpacing: 1,
    color: TrackColors.brand,
  },
  eyebrow: {
    fontFamily: TrackFonts.numeralMedium,
    fontSize: 12,
    letterSpacing: 2,
    color: TrackColors.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 72,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: TrackColors.border,
  },
  rowFirst: { borderTopWidth: 1, borderTopColor: TrackColors.border },
  rowPressed: {
    backgroundColor: TrackColors.surface,
    borderLeftWidth: 2,
    borderLeftColor: TrackColors.brand,
    paddingLeft: 18,
  },
  rowIndex: {
    fontFamily: TrackFonts.numeralRegular,
    fontSize: 13,
    color: TrackColors.textMuted,
    width: 20,
  },
  rowLabel: {
    flex: 1,
    fontFamily: TrackFonts.uiSemiBold,
    fontSize: 17,
    color: TrackColors.text,
  },
});
