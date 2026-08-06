import { StyleSheet, Text, View } from 'react-native';

import { InfoTip } from '@/components/info-tip';
import { sectionLabelStyle } from '@/components/profile/gated-section';
import { Palette, Typefaces } from '@/constants/theme';
import type { FavouriteBest } from '@/lib/relative-strength-repo';
import { fmt } from '@/utils/format-number';
import { relativeStrength } from '@/utils/relative-strength';

type Props = {
  lifts: FavouriteBest[];
  bodyweightKg: number;
  loadFailed: boolean;
};

export function RelativeStrengthSection({ lifts, bodyweightKg, loadFailed }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={sectionLabelStyle}>Relative strength</Text>
        <InfoTip term="relativeStrength" />
      </View>

      {loadFailed ? (
        <Text style={styles.message}>Couldn&apos;t load your ratios.</Text>
      ) : lifts.length === 0 ? (
        // getFavouriteBests() joins through workout_set!inner, so a favourite
        // with zero working sets is excluded from the result — this one empty
        // array covers BOTH "no favourites" and "favourites with no logged
        // history", which the repo can't tell apart without a second query.
        // The copy below has to be true in both cases, not just the first.
        <Text style={styles.message}>Star a lift and log a working set to see your ratios.</Text>
      ) : (
        <>
          <View style={styles.list}>
            {lifts.map(lift => {
              const ratio = relativeStrength(lift.bestE1rm, bodyweightKg);
              return (
                <View key={lift.exerciseId} style={styles.row}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {lift.name}
                  </Text>
                  <Text style={styles.ratio}>{ratio !== undefined ? `${ratio.toFixed(2)}×` : '—'}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.denominator}>of {fmt(bodyweightKg)} kg bodyweight</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  list: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  // Chalk, not accent — the 2-accent cap (brand purple, #2E5D45) is fully
  // spent by the BMI section while it's on screen, which is always.
  exerciseName: { flex: 1, fontFamily: Typefaces.uiMedium, fontSize: 15, color: Palette.text },
  ratio: {
    fontFamily: Typefaces.numeralMedium,
    fontSize: 15,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  denominator: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
});
