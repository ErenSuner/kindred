import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { IMPORTANCE_ORDER, type Importance } from '@/utils/importance';

const TRACK_HEIGHT = 10;
const HANDLE = 30;
const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };
// How much the handle swells while it is held.
const PRESS_GROWTH = 0.15;

type Props = {
  value: Importance;
  onChange: (next: Importance) => void;
};

// How much this birthday matters, as one thing to drag.
//
// It replaced a reminder editor that could hold four separate lead times. That
// editor was accurate and nobody used it: picking "3 days before, and 1 week
// before" is a scheduling decision, and the user is not making a scheduling
// decision. They are saying how much they care. The slider asks that question
// instead and turns the answer into lead times behind their back.
//
// Three stops rather than a continuous range, because there is no meaningful
// difference between five days and six, and a slider that lands on "5 days
// before" invites fiddling with a number that does not matter.
export function ImportanceSlider({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { c, floatShadow } = useTheme();
  const [width, setWidth] = useState(0);

  const index = Math.max(0, IMPORTANCE_ORDER.indexOf(value));
  const last = IMPORTANCE_ORDER.length - 1;

  // How far the handle can travel. Measured from the track, which is inset by
  // half a handle at each end so the handle never overhangs its own row.
  const span = Math.max(0, width - HANDLE);
  const step = last > 0 ? span / last : 0;

  // Where the handle is, in pixels. The single source of truth for both the
  // handle and the fill behind it: a drag writes it directly, a release or a
  // tap springs it to the selected stop.
  //
  // It has to be one shared value holding a plain number. An animation is only
  // understood when it *is* the value of a style property, so `withSpring` has
  // to be assigned to a shared value, never dropped into an expression:
  // `HANDLE / 2 + withSpring(...)` stringifies the animation object, which is
  // why the fill used to freeze wherever the finger left it while the handle
  // carried on springing.
  const pos = useSharedValue(0);
  // Zero at rest, one while held. A number rather than an animation for the
  // same reason: the scale is worked out with arithmetic.
  const press = useSharedValue(0);
  const dragging = useSharedValue(false);
  const startPos = useSharedValue(0);
  // The stop `pos` was last sent to. Keeps the release and the effect that
  // follows the prop change from starting the same spring twice.
  const target = useSharedValue(-1);
  const placed = useRef(false);

  useEffect(() => {
    // Nothing has been measured yet, so there is no position to move to.
    if (span <= 0) return;

    const next = index * step;
    if (target.value === next) return;
    target.value = next;

    // A finger on the handle outranks the selection it is in the middle of
    // changing.
    if (dragging.value) return;

    // The first placement is where the handle already belongs, not somewhere it
    // should be seen travelling to.
    pos.value = placed.current ? withSpring(next, SPRING) : next;
    placed.current = true;
  }, [index, step, span, pos, target, dragging]);

  const settle = (next: Importance) => {
    if (next !== value) onChange(next);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      startPos.value = pos.value;
      dragging.value = true;
      press.value = withSpring(1, SPRING);
    })
    .onUpdate((e) => {
      pos.value = Math.min(span, Math.max(0, startPos.value + e.translationX));
    })
    .onEnd(() => {
      const nearest = step > 0 ? Math.round(pos.value / step) : 0;
      const clamped = Math.min(last, Math.max(0, nearest));

      // Sprung here as well as through the effect, so the handle settles on
      // release rather than waiting for the round trip through React. Writing
      // `target` too means the effect that follows the prop change sees the
      // stop it is already heading for and leaves the spring alone.
      target.value = clamped * step;
      pos.value = withSpring(clamped * step, SPRING);
      runOnJS(settle)(IMPORTANCE_ORDER[clamped]);
    })
    .onFinalize((_e, success) => {
      // A gesture cancelled rather than ended never reached onEnd, so the
      // handle is left mid-track. Put it back on its stop.
      if (!success && target.value >= 0) pos.value = withSpring(target.value, SPRING);
      dragging.value = false;
      press.value = withSpring(0, SPRING);
    });

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value }, { scale: 1 + press.value * PRESS_GROWTH }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: HANDLE / 2 + pos.value,
  }));

  const moveBy = (delta: number) => {
    const next = Math.min(last, Math.max(0, index + delta));
    if (next !== index) onChange(IMPORTANCE_ORDER[next]);
  };

  return (
    <View>
      <View
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel={t('importance')}
        accessibilityValue={{ text: t(`importance_${value}`) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => moveBy(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <View style={[styles.rail, { backgroundColor: c.surfaceAlt }]} />
        {/* Its own style rather than the rail's: a stretched rail pins both
            edges, and a pinned right edge fights the width being animated. */}
        <Animated.View style={[styles.fill, { backgroundColor: c.flame }, fillStyle]} />

        {/* Tap targets over each stop. Dragging is the gesture the control is
            about, but a three-position slider that cannot be tapped is a
            three-position slider that is annoying. */}
        {IMPORTANCE_ORDER.map((level, i) => (
          <Pressable
            key={level}
            onPress={() => onChange(level)}
            style={[styles.stopHit, { left: i * step, width: HANDLE }]}
            accessibilityRole="button"
            accessibilityLabel={t(`importance_${level}`)}
          >
            <View
              style={[
                styles.tick,
                { backgroundColor: i <= index ? c.onFlame : c.lineStrong, opacity: i === index ? 0 : 0.5 },
              ]}
            />
          </Pressable>
        ))}

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.handle, { backgroundColor: c.flame, borderColor: c.bg }, floatShadow, handleStyle]}>
            <View style={[styles.grip, { backgroundColor: c.onFlame }]} />
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.labels}>
        {IMPORTANCE_ORDER.map((level, i) => (
          <Txt
            key={level}
            variant={level === value ? 'subMed' : 'sub'}
            color={level === value ? c.text : c.faint}
            style={[
              styles.label,
              i === 0 && { textAlign: 'left' },
              i === last && { textAlign: 'right' },
            ]}
          >
            {t(`importance_${level}`)}
          </Txt>
        ))}
      </View>

      {/* The promise, in words. This is the point of the control: the user
          should be able to read back what the app has just agreed to do. */}
      <Txt variant="sub" color={c.muted} style={styles.description}>
        {t(`importance_desc_${value}`)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HANDLE,
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: radius.full,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: radius.full,
  },
  stopHit: {
    position: 'absolute',
    top: 0,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  handle: {
    position: 'absolute',
    left: 0,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 10,
    height: 3,
    borderRadius: 2,
    opacity: 0.55,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 10,
  },
  label: { flex: 1, textAlign: 'center' },
  description: { marginTop: 10 },
});
