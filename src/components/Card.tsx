import { Pressable, View, StyleSheet, ViewStyle, PressableProps } from 'react-native';
import { colors, radius, ambientShadow } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: PressableProps['onPress'];
  pressable?: boolean;
};

// White surface lifted with a soft ambient shadow. When pressable it scales to
// 98% on press, simulating a gentle physical press per DESIGN.md.
export function Card({ children, style, onPress, pressable = false }: Props) {
  if (pressable || onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          style,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 24,
    ...ambientShadow,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.04,
  },
});
