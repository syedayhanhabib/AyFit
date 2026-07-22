import { View, type ViewStyle } from 'react-native';

type Props = { color: string; size?: number; style?: ViewStyle };

export function CategoryDot({ color, size = 8, style }: Props) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, flexShrink: 0 },
        style,
      ]}
    />
  );
}
