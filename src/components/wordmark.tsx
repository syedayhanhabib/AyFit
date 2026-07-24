import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { Palette, Typefaces } from '@/constants/theme';

type WordmarkProps = { size?: number };

export function Wordmark({ size = 22 }: WordmarkProps) {
  const textStyle = [styles.text, { fontSize: size, lineHeight: size * 1.2 }];
  // MaskedView composites two separately-rendered trees (the mask shape and
  // the gradient) — without an explicit height on both, they don't share a
  // resolved layout box to composite against, so it silently falls back to
  // rendering the mask element's own flat color instead of the gradient.
  const boxStyle = { height: size * 1.2 };

  return (
    <MaskedView style={boxStyle} maskElement={<Text style={textStyle}>AyFit</Text>}>
      <LinearGradient
        style={boxStyle}
        colors={[Palette.brand, Palette.brandDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[textStyle, styles.hidden]}>AyFit</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: Typefaces.wordmark,
    letterSpacing: 0.5,
    // Native MaskedView only uses this element's alpha as the gradient's
    // mask shape and discards its color — but the web shim has no real
    // masking support and renders this element as-is, so give it a solid
    // fallback color rather than the browser's default black.
    color: Palette.brand,
  },
  hidden: { opacity: 0 },
});
