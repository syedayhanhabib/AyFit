import { useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { GLOSSARY, type GlossaryTermKey } from '@/constants/glossary';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type InfoTipProps = {
  term: GlossaryTermKey;
};

export function InfoTip({ term }: InfoTipProps) {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();
  const entry = GLOSSARY[term];

  return (
    <>
      <Pressable onPress={() => setVisible(true)} hitSlop={8}>
        <MaterialCommunityIcons name="information-outline" size={16} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={[styles.card, { backgroundColor: theme.background }]} onPress={() => {}}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold">{entry.title}</ThemedText>
              <Pressable onPress={() => setVisible(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="default" themeColor="textSecondary">
              {entry.description}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
