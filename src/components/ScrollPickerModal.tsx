import { View, Modal, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme/tokens';
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

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View entering={SlideInDown.duration(300).springify()} exiting={SlideOutDown.duration(200)} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.stackLg }]}>
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <Txt variant="headlineMd" color={colors.onSurface}>{title}</Txt>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {options.map((opt) => {
            const isSelected = opt.value === selectedValue;
            return (
              <Pressable
                key={String(opt.value)}
                style={({ pressed }) => [
                  styles.optionBtn,
                  isSelected && styles.optionSelected,
                  pressed && { backgroundColor: colors.surfaceContainerHigh }
                ]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Txt 
                  variant="bodyLg" 
                  color={isSelected ? colors.onPrimaryContainer : colors.onSurface}
                  style={isSelected && { fontWeight: '600' }}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
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
    backgroundColor: colors.outlineVariant,
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
  optionSelected: {
    backgroundColor: colors.primaryContainer,
  },
});
