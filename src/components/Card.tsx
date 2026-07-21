import { Pressable, View, StyleSheet, ViewStyle, StyleProp, PressableProps } from 'react-native';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
  pressable?: boolean;
  /** Dark spruce anchor surface — one per screen at most. */
  ink?: boolean;
};

// Surface separated from the page by a real value step and a hairline,
// grounded with a soft shadow in light mode. Presses sink gently.
export function Card({ children, style, onPress, onLongPress, pressable = false, ink = false }: Props) {
  const { c, cardShadow } = useTheme();
  const base: ViewStyle = {
    backgroundColor: ink ? c.ink : c.surface,
    borderRadius: radius.lg,
    borderWidth: ink ? 0 : 1,
    borderColor: c.line,
    padding: 20,
  };
  if (pressable || onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          base,
          cardShadow,
          style,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, cardShadow, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
});
