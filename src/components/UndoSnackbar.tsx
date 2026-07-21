import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { useUndo } from '@/context/UndoContext';
import { useTranslation } from "react-i18next";

// Floats above the tab bar so it survives navigation — deleting from a detail
// screen pops back to a list, and the offer to undo has to come along.
export function UndoSnackbar() {
    const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { pending, undo } = useUndo();

  if (!pending) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 96 }]}
    >
      <View style={[styles.bar, { backgroundColor: c.ink }, floatShadow]}>
        <Icon name="delete-outline" size={18} color={c.onInkMuted} />
        <Txt variant="subMed" color={c.onInk} style={{ flex: 1 }}>
          {pending.message}
        </Txt>
        <Pressable
          onPress={undo}
          hitSlop={10}
          style={({ pressed }) => [styles.undo, pressed && { opacity: 0.7 }]}
        >
          <Txt variant="label" color={c.flame}>{t('undo')}</Txt>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.containerMobile,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  undo: { paddingHorizontal: 6, paddingVertical: 2 },
});
