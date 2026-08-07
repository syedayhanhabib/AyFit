import { StyleSheet, Text, View } from 'react-native';

import { InfoTip } from '@/components/info-tip';
import { sectionLabelStyle } from '@/components/profile/gated-section';
import { Palette, Typefaces } from '@/constants/theme';
import type { Sex } from '@/types/profile';
import { pluralize } from '@/utils/pluralize';
import { calculateTdee, roundedTrainingDays } from '@/utils/tdee';

type Props = {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  age: number;
  avgTrainedDaysPerWeek: number | undefined;
  loadFailed: boolean;
};

export function CaloricMaintenanceSection({
  sex,
  heightCm,
  weightKg,
  age,
  avgTrainedDaysPerWeek,
  loadFailed,
}: Props) {
  const tdee =
    avgTrainedDaysPerWeek !== undefined
      ? calculateTdee(sex, weightKg, heightCm, age, avgTrainedDaysPerWeek)
      : undefined;
  const days = avgTrainedDaysPerWeek !== undefined ? roundedTrainingDays(avgTrainedDaysPerWeek) : undefined;

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={sectionLabelStyle}>Caloric maintenance</Text>
        <InfoTip term="tdee" />
      </View>

      {age < 18 ? (
        // Checked BEFORE loadFailed, deliberately: a load failure is
        // transient (a retry might work), an age is not. Showing "couldn't
        // load" to a minor would promise a retry can produce a number that
        // will never come. calculateTdee returns undefined for both
        // under-18 and bad input, so that return value alone can't
        // distinguish this case — age is checked directly here, ahead of
        // calling it.
        <Text style={styles.message}>
          Maintenance estimates use a formula validated on adults, so it isn&apos;t shown under 18.
        </Text>
      ) : loadFailed ? (
        <Text style={styles.message}>Couldn&apos;t load your activity level.</Text>
      ) : avgTrainedDaysPerWeek === undefined || tdee === undefined || days === undefined ? (
        // avgTrainedDaysPerWeek === undefined means the 4-week window had
        // zero trained days — no history to average, a missing input, not
        // an error and not the same as a real low reading like 0.25 (which
        // is a number and reaches the branch below). The tdee/days
        // undefined checks alongside it are unreachable given age >= 18
        // and a real avgTrainedDaysPerWeek above, but render the same
        // copy rather than a dash if they ever aren't.
        <Text style={styles.message}>Log a workout to estimate maintenance.</Text>
      ) : (
        <>
          <Text style={styles.tdeeValue}>{`${tdee} kcal`}</Text>
          <Text style={styles.derivation}>
            {`based on ${days} ${pluralize(days, 'training day')}/week over the last 4 weeks`}
          </Text>
          <Text style={styles.caveat}>A formula estimate — typically within 15-20% of measured.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  // Matches bmi-section.tsx's bmiValue, which itself matches profile.tsx's
  // heroValue (the current-weight number) — same face, size and colour,
  // with the unit inline in this same Text, same as "76.5 kg" there. No
  // thousands separator: a plain template literal never inserts one.
  tdeeValue: {
    fontFamily: Typefaces.numeralBold,
    fontSize: 52,
    lineHeight: 56,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  derivation: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  caveat: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
});
