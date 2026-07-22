import { useRef } from 'react';
import { View, Modal, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';

export type PickerOption = {
  label: string;
  value: string | number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  options: PickerOption[];
  selectedValue?: string | number;
  onSelect: (value: string | number) => void;
  title: string;
};

export function ScrollPickerModal({ visible, onClose, options, selectedValue, onSelect, title }: Props) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  // Only the first time the sheet lays out. Scrolling again on every re-layout
  // would fight the finger.
  const scrolled = useRef(false);

  // A 24-hour list opens at midnight, so the hour actually set is off-screen
  // and has to be hunted for. Bring it into view instead, a little below the
  // top edge so the neighbouring options give it context.
  const revealSelected = (y: number) => {
    if (scrolled.current) return;
    scrolled.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 96), animated: false });
  };

  if (!visible) {
    scrolled.current = false;
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[styles.backdrop, { backgroundColor: c.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutDown.duration(200)}
        style={[
          styles.sheet,
          { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.stackLg },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.lineStrong }]} />

        <View style={styles.header}>
          <Txt variant="heading">{title}</Txt>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {options.map((opt) => {
            const isSelected = opt.value === selectedValue;
            return (
              <Pressable
                key={String(opt.value)}
                onLayout={isSelected ? (e) => revealSelected(e.nativeEvent.layout.y) : undefined}
                style={({ pressed }) => [
                  styles.optionBtn,
                  isSelected && { backgroundColor: c.flameWash },
                  pressed && { backgroundColor: c.surfaceAlt },
                ]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Txt
                  variant={isSelected ? 'bodySemi' : 'body'}
                  color={isSelected ? c.flameDeep : c.text}
                >
                  {opt.label}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill as any,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    ...Platform.select({
      web: { maxWidth: 600, marginHorizontal: 'auto' },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    padding: spacing.stackLg,
    paddingBottom: spacing.stackSm,
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackLg,
  },
  optionBtn: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: 4,
  },
});
