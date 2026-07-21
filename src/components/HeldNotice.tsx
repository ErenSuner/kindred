import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';

type Held = { title: string; detail?: string };

// --- tiny module-level emitter -------------------------------------------
// Forms call showHeld() just before they close; the single mounted notice
// picks it up. No context needed — this is fire-and-forget UI.
let listener: ((held: Held) => void) | null = null;

/**
 * Tell the user the app has taken the job on. The reassurance is the product:
 * every successful save should answer with one of these.
 */
export function showHeld(title: string, detail?: string) {
  listener?.({ title, detail });
}

// --- the notice itself -----------------------------------------------------
// A small ink card that drops in from the top, holds a moment, and leaves.
// The flame dot is the "lamp lit" mark — the same mark the home screen uses
// for things that are close.
export function HeldNotice() {
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const [held, setHeld] = useState<Held | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (next) => {
      setHeld(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setHeld(null), 3200);
    };
    return () => {
      listener = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!held) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(260).springify().damping(18)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={[styles.wrap, { paddingTop: insets.top + 10 }]}
    >
      <View style={[styles.bar, { backgroundColor: c.ink }, floatShadow]}>
        <View style={[styles.dot, { backgroundColor: c.flame }]} />
        <View style={{ flex: 1 }}>
          <Txt variant="subMed" color={c.onInk}>{held.title}</Txt>
          {held.detail ? (
            <Txt variant="sub" color={c.onInkMuted} style={{ marginTop: 1 }}>
              {held.detail}
            </Txt>
          ) : null}
        </View>
        <Icon name="check" size={18} color={c.flame} />
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
    zIndex: 30,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignSelf: 'stretch',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
