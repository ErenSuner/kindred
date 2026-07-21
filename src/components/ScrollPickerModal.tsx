import { View, Modal, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
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

  if (!visible) return null;

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
        entering={SlideInDown.duration(300).springify()}
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

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {options.map((opt) => {
            const isSelected = opt.value === selectedValue;
            return (
              <Pressable
                key={String(opt.value)}
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
