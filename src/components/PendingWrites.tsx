import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { usePeople } from '@/context/PeopleContext';

// Says what the app is holding on to, and what it dropped.
//
// Notes queue and send themselves later, which is the right behaviour but would
// otherwise be a lie — this is the part that admits they haven't left the phone
// yet. It also carries the failures nobody was watching: a staged delete
// finishing in the background, or a pin that quietly slid back.
export function PendingWrites() {
  const { pendingWrites, retryPendingWrites, writeError, clearWriteError } = usePeople();
  const insets = useSafeAreaInsets();
  const [retrying, setRetrying] = useState(false);

  // An outright failure is the more urgent of the two, so it wins the one slot.
  const showingError = !!writeError;
  if (!showingError && pendingWrites === 0) return null;

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await retryPendingWrites();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      exiting={FadeOut.duration(180)}
      style={[styles.wrap, { paddingTop: insets.top + 6 }]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, showingError && styles.barError]}>
        <Icon
          name={showingError ? 'error-outline' : 'cloud-off'}
          size={16}
          color={showingError ? colors.onErrorContainer : colors.onSurfaceVariant}
        />

        <Txt
          variant="labelSm"
          color={showingError ? colors.onErrorContainer : colors.onSurfaceVariant}
          style={styles.text}
        >
          {showingError
            ? writeError
            : pendingWrites === 1
            ? '1 change waiting to sync'
            : `${pendingWrites} changes waiting to sync`}
        </Txt>

        {showingError ? (
          <Pressable onPress={clearWriteError} hitSlop={8}>
            <Icon name="close" size={16} color={colors.onErrorContainer} />
          </Pressable>
        ) : (
          <Pressable onPress={retry} disabled={retrying} hitSlop={8}>
            {retrying ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Txt variant="labelSm" color={colors.primary}>Retry</Txt>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.containerMobile,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  barError: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  text: { flex: 1, fontWeight: 'normal' },
});
