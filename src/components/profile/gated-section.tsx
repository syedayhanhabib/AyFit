import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Typefaces } from '@/constants/theme';

type Props = {
  /** e.g. 'BODY MASS INDEX'. Rendered as-is — callers pass it uppercase. */
  label: string;
  /** Holds the shape of the number that will land here once wired (6g/6h/6i), e.g. '––.–'. */
  placeholder: string;
  /** What this section is waiting for, e.g. 'Needs height'. Omit when every
   * input this section needs is already present — see the component
   * comment below for why that renders label + placeholder only. */
  waitingText?: string;
  /** Omit both to render no link at all — some gates (relative strength) have
   * no in-Profile fix, so there is nothing to link to. Never render a link
   * with no onPress. */
  actionLabel?: string;
  onPressAction?: () => void;
};

// The GATED rendering for BMI / relative strength / caloric maintenance —
// all three share this exact shape (label, dash placeholder, waiting text,
// optional unlock action), so one component renders all three rather than
// three near-identical blocks. This is deliberately the ONLY state these
// sections have this commit: no bmi.ts / relative-strength.ts /
// relative-strength-repo.ts / activity-repo.ts import anywhere near this
// file. 6g/6h/6i replace this with the real computed card, keyed off the
// same "is everything this section needs actually present" condition the
// caller already computes to choose waitingText.
//
// A section can be FULLY SATISFIED (every input it needs is already on
// file) while this commit still can't compute its real number — the caller
// passes no waitingText for that case, and this renders label + placeholder
// only. That silence is deliberate: any "needs ___" text at that point
// would be false (the input isn't missing), and inventing filler copy like
// "Coming soon" would be a lie of a different kind. Silence is the only
// honest thing available until the real card lands.
export function GatedSection({ label, placeholder, waitingText, actionLabel, onPressAction }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.placeholder}>{placeholder}</Text>
      {waitingText !== undefined && (
        <View style={styles.waitingRow}>
          <Text style={styles.waitingText}>{waitingText}</Text>
          {actionLabel !== undefined && onPressAction !== undefined && (
            <Pressable onPress={onPressAction}>
              <Text style={styles.actionLink}>{actionLabel}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  // Exported below as `sectionLabelStyle` — bmi-section.tsx shares this
  // instead of forking a third copy (gated-section.tsx and profile.tsx
  // already each have their own).
  label: {
    fontFamily: Typefaces.uiSemiBold,
    fontSize: 11,
    // 0.14em of an 11px face — the same em-to-point approximation the old
    // Details fieldLabel style already used (1.5 for its own 11px label).
    letterSpacing: 1.5,
    color: Palette.textSecondary,
    textTransform: 'uppercase',
  },
  placeholder: {
    fontFamily: Typefaces.numeralBold,
    fontSize: 30,
    lineHeight: 34,
    color: Palette.textMuted,
  },
  waitingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  waitingText: { fontFamily: Typefaces.uiRegular, fontSize: 13, color: Palette.textSecondary },
  actionLink: { fontFamily: Typefaces.uiSemiBold, fontSize: 13, color: Palette.brand },
});

// Shared with bmi-section.tsx so the two sections' labels are guaranteed
// identical rather than independently maintained.
export const sectionLabelStyle = styles.label;
