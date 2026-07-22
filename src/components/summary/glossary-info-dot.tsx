import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GLOSSARY, type GlossaryTermKey } from '@/constants/glossary';
import { Palette, Typefaces } from '@/constants/theme';

// Same glossary content/behavior as components/info-tip.tsx, but styled to
// match Summary.dc.html's circle-and-serif-"i" glyph and the v3 dark palette
// (info-tip.tsx still targets the light/dark useTheme() system used by
// screens that haven't had their v3 pass yet).
type Props = { term: GlossaryTermKey };

export function GlossaryInfoDot({ term }: Props) {
  const [visible, setVisible] = useState(false);
  const entry = GLOSSARY[term];

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={8} style={styles.dot}>
        <Text style={styles.dotGlyph}>i</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{entry.title}</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={8}>
                <Text style={styles.closeGlyph}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.cardBody}>{entry.description}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Palette.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotGlyph: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 9,
    color: Palette.textSecondary,
    lineHeight: 10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: Typefaces.uiBold, fontSize: 14, color: Palette.text },
  closeGlyph: { fontSize: 20, lineHeight: 20, color: Palette.textSecondary },
  cardBody: { fontFamily: Typefaces.uiRegular, fontSize: 14, lineHeight: 20, color: Palette.textSecondary },
});
