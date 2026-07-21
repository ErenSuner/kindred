import { StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';

type Props = {
  message?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

// Inline replacement for alert(): stays on screen next to the thing that failed
// instead of interrupting, and can offer a way out.
export function FormError({ message, onRetry, retryLabel }: Props) {
  const { t } = useTranslation();
  const retry = retryLabel ?? t('try_again');
  const { c } = useTheme();
  if (!message) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.row, { backgroundColor: c.dangerWash }]}
    >
      <Icon name="error-outline" size={18} color={c.danger} />
      <Txt variant="sub" color={c.danger} style={styles.text}>
        {message}
      </Txt>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          style={({ pressed }) => [
            styles.retry,
            { borderBottomColor: c.danger },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Txt variant="subMed" color={c.danger}>{retry}</Txt>
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
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: { flex: 1 },
  retry: {
    borderBottomWidth: 1,
  },
});
