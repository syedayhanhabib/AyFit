import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { InfoTip } from '@/components/info-tip';
import { sectionLabelStyle } from '@/components/profile/gated-section';
import { Palette, Typefaces } from '@/constants/theme';
import { calculateAge } from '@/utils/age';
import { bmiCategory, bmiMarkerPosition, calculateBmi, type BmiCategoryResult } from '@/utils/bmi';
import { todayLocalDate } from '@/utils/local-date';

type Props = {
  heightCm: number;
  weightKg: number;
  dateOfBirth?: string;
};

// Scale bar cutoffs, expressed as a fraction of the 15-40 track — 18.5 and
// 25.0 exactly, per DESIGN.md ("14% and 40%, not 18.5 and 24.9 — the bar is
// continuous geometry, 24.9 is a display convention that belongs in the
// text").
const BAND_LEFT_PERCENT = 14;
const BAND_WIDTH_PERCENT = 26;

function categoryLineText(result: BmiCategoryResult): string {
  switch (result.kind) {
    case 'category':
      return result.category;
    case 'needs-dob':
      return 'Add your date of birth for a category.';
    case 'under-eighteen':
      return "Fixed BMI categories aren't valid under 18 — under-18s need age-and-sex percentile charts.";
    case 'needs-measurements':
      // Unreachable from this component: heightCm/weightKg are non-nullable
      // props, and profile.tsx only renders BmiSection once both are
      // present (positive, per their DB CHECK constraints), so
      // calculateBmi's result is always finite here.
      return '';
  }
}

export function BmiSection({ heightCm, weightKg, dateOfBirth }: Props) {
  const bmi = calculateBmi(weightKg, heightCm);
  if (bmi === undefined) {
    return null;
  }

  const age = dateOfBirth !== undefined ? calculateAge(dateOfBirth, todayLocalDate()) : undefined;
  const category = bmiCategory(bmi, age);
  const { fraction, offScale } = bmiMarkerPosition(bmi);

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={sectionLabelStyle}>Body mass index</Text>
        <InfoTip term="bmi" />
      </View>

      <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>

      <View style={styles.track}>
        <View style={styles.band} />
        <View style={[styles.tick, { left: `${BAND_LEFT_PERCENT}%` }]} />
        <View style={[styles.tick, { left: `${BAND_LEFT_PERCENT + BAND_WIDTH_PERCENT}%` }]} />
        {offScale === 'low' && (
          <MaterialCommunityIcons
            name="chevron-left"
            size={14}
            color={Palette.brand}
            style={styles.chevronLow}
          />
        )}
        {offScale === 'high' && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color={Palette.brand}
            style={styles.chevronHigh}
          />
        )}
        <View style={[styles.marker, { left: `${fraction * 100}%` }]} />
      </View>

      <Text style={styles.categoryLine}>{categoryLineText(category)}</Text>
      <Text style={styles.caveat}>BMI has no term for muscle — trained lifters read high.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Matches profile.tsx's `heroValue` (the current-weight number) exactly —
  // same face, size and colour, so the two read as siblings down the Ledger.
  bmiValue: {
    fontFamily: Typefaces.numeralBold,
    fontSize: 52,
    lineHeight: 56,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.border,
    position: 'relative',
    // Visible, not hidden: the marker is 16px tall against an 8px track and
    // must protrude top and bottom without being clipped.
    overflow: 'visible',
  },
  band: {
    position: 'absolute',
    left: `${BAND_LEFT_PERCENT}%`,
    width: `${BAND_WIDTH_PERCENT}%`,
    top: 0,
    height: 8,
    backgroundColor: Palette.referenceRange,
  },
  tick: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: 8,
    backgroundColor: Palette.text,
    opacity: 0.35,
  },
  marker: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 16,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: Palette.brand,
  },
  chevronLow: { position: 'absolute', left: -6, top: -3 },
  chevronHigh: { position: 'absolute', right: -6, top: -3 },
  categoryLine: { fontFamily: Typefaces.uiRegular, fontSize: 14, color: Palette.textSecondary },
  caveat: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
});
