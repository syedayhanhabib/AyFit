import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet } from 'react-native';

import type { CategoryIconName } from '@/constants/categories';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  name: string;
  icon: CategoryIconName;
  onPress: () => void;
};

export function CategoryTile({ name, icon, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.backgroundSelected }}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={26} color={theme.text} style={styles.leadIcon} />
      <ThemedText type="default" style={styles.label}>{name}</ThemedText>
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.75 },
  leadIcon: { marginRight: 16 },
  label: { flex: 1 },
});
