import { StyleSheet, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { ErrorDetails } from '@/components/ErrorDetails';

type Props = {
  message?: string | null;
  // A second, quieter line under the message — the server's own error code, or
  // the exact URL it rejected. The first line is already written for a person;
  // this is what makes a report actionable instead of a guessing game.
  detail?: string | null;
  // The full report from @/utils/authDiagnostics, folded away behind "Details".
  // The line above names the code; this is everything behind it — what was
  // sent, what came back — for when the code itself turns out to be wrong.
  diagnostics?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

// Inline replacement for alert(): stays on screen next to the thing that failed
// instead of interrupting, and can offer a way out.
export function FormError({ message, detail, diagnostics, onRetry, retryLabel }: Props) {
  const { t } = useTranslation();
  const retry = retryLabel ?? t('try_again');
  const { c } = useTheme();
  if (!message) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.box, { backgroundColor: c.dangerWash }]}
    >
      <View style={styles.row}>
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
      </View>

      {/* Below the row rather than inside it: expanded, the report is taller
          than everything beside it, and a centred icon next to twelve lines of
          text reads as a mistake. */}
      <ErrorDetails report={diagnostics} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: { flex: 1 },
  // Selectable so a code can be copied straight out of a bug report.
  detail: { opacity: 0.7, marginTop: 2 },
  retry: {
    borderBottomWidth: 1,
  },
});
