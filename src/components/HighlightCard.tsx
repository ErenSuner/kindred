import { forwardRef, useImperativeHandle } from 'react';
import { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/theme/tokens';

export type HighlightHandle = {
  pulse: () => void;
};

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
};

// Draws attention to a card the user was just sent to. The ring is always laid
// out at full width and only its colour animates, so firing a pulse never
// shifts anything on screen.
export const HighlightCard = forwardRef<HighlightHandle, Props>(function HighlightCard({ children, style, onLayout }, ref) {
  const progress = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    pulse: () => {
      progress.value = 0;
      progress.value = withSequence(
        withTiming(1, { duration: 320 }),
        withTiming(0.35, { duration: 320 }),
        withTiming(1, { duration: 320 }),
        withTiming(0, { duration: 620 }),
      );
    },
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], ['rgba(139,76,77,0)', colors.primary]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.015]) }],
  }));

  return (
    <Animated.View
      onLayout={onLayout}
      style={[{ borderWidth: 2, borderColor: 'transparent', borderRadius: radius.lg + 2 }, animatedStyle, style]}
    >
      {children}
    </Animated.View>
  );
});
