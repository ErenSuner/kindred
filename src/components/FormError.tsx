import { StyleSheet, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';

type Props = {
  message?: string | null;
  // A second, quieter line under the message — the server's own error code, or
  // the exact URL it rejected. The first line is already written for a person;
  // this is what makes a report actionable instead of a guessing game.
  detail?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

// Inline replacement for alert(): stays on screen next to the thing that failed
// instead of interrupting, and can offer a way out.
export function FormError({ message, detail, onRetry, retryLabel }: Props) {
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
      <View style={styles.text}>
        <Txt variant="sub" color={c.danger}>
          {message}
        </Txt>
        {detail ? (
          <Txt variant="sub" color={c.danger} style={styles.detail} selectable>
            {detail}
          </Txt>
        ) : null}
      </View>
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
  // Selectable so a code can be copied straight out of a bug report.
  detail: { opacity: 0.7, marginTop: 2 },
  retry: {
    borderBottomWidth: 1,
  },
});
