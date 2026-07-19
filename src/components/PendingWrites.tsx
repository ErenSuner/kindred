import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { usePeople } from '@/context/PeopleContext';

// Says what the app is holding on to. Writes made without a connection are
// already on screen, which is the right behaviour but would otherwise be a lie
// — this is the part that admits they haven't left the phone yet.
export function PendingWrites() {
  const { pendingWrites, retryPendingWrites } = usePeople();
  const insets = useSafeAreaInsets();
  const [retrying, setRetrying] = useState(false);

  if (pendingWrites === 0) return null;

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
      <View style={styles.bar}>
        <Icon name="cloud-off" size={16} color={colors.onSurfaceVariant} />
        <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.text}>
          {pendingWrites === 1 ? '1 change waiting to sync' : `${pendingWrites} changes waiting to sync`}
        </Txt>

        <Pressable onPress={retry} disabled={retrying} hitSlop={8}>
          {retrying ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Txt variant="labelSm" color={colors.primary}>Retry</Txt>
          )}
        </Pressable>
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
  text: { flex: 1, fontWeight: 'normal' },
});
