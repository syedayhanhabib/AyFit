import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet } from 'react-native';

import { TrackColors } from '@/constants/track-theme';

type Props = { onPress: () => void };

export function BackButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name="chevron-left" size={22} color={TrackColors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TrackColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pressed: { backgroundColor: TrackColors.border },
});
