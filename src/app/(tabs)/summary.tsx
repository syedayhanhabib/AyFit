import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConsistencyCard } from '@/components/summary/consistency-card';
import { ProgressionCard } from '@/components/summary/progression-card';
import { RecentPrsCard } from '@/components/summary/recent-prs-card';
import { VolumeCard } from '@/components/summary/volume-card';
import { Palette, Typefaces } from '@/constants/theme';

export default function SummaryScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>AYFIT</Text>
          <Text style={styles.eyebrow}>Summary</Text>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          <ConsistencyCard />
          <VolumeCard />
          <ProgressionCard />
          <RecentPrsCard />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  wordmark: { fontFamily: Typefaces.uiExtraBold, fontSize: 20, letterSpacing: 1, color: Palette.brand },
  eyebrow: {
    fontFamily: Typefaces.numeralMedium,
    fontSize: 12,
    letterSpacing: 2,
    color: Palette.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  list: { gap: 16, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
});
