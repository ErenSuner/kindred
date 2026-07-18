import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';

type Props = {
  message?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

// Inline replacement for alert(): stays on screen next to the thing that failed
// instead of interrupting, and can offer a way out.
export function FormError({ message, onRetry, retryLabel = 'Try again' }: Props) {
  if (!message) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.row}>
      <Icon name="error-outline" size={18} color={colors.onErrorContainer} />
      <Txt variant="labelSm" color={colors.onErrorContainer} style={styles.text}>
        {message}
      </Txt>
      {onRetry && (
        <Pressable onPress={onRetry} hitSlop={8} style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}>
          <Txt variant="labelSm" color={colors.onErrorContainer}>{retryLabel}</Txt>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: { flex: 1, fontWeight: 'normal', lineHeight: 18 },
  retry: {
    borderBottomWidth: 1,
    borderBottomColor: colors.onErrorContainer,
  },
});
