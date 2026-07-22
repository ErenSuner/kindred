import { View, Modal, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { useTranslation } from "react-i18next";

type Choice = 'once' | 'weekly';

type Props = {
  visible: boolean;
  onClose: () => void;
  onChoose: (choice: Choice) => void;
};

// The one decision the user actually has in their head — is this a one-off, or
// does it come round every week — asked once, so a single "Add" button can lead
// to either the dated form or the weekly one. Keeps the two entry points from
// splitting a single intent in two.
const OPTIONS: { choice: Choice; icon: React.ComponentProps<typeof Icon>['name']; titleKey: string; subKey: string }[] = [
  { choice: 'once', icon: 'event', titleKey: 'add_on_a_date', subKey: 'add_on_a_date_sub' },
  { choice: 'weekly', icon: 'repeat', titleKey: 'add_every_week', subKey: 'add_every_week_sub' },
];

export function AddEventSheet({ visible, onClose, onChoose }: Props) {
    const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        // A spring with no stiffness set overshoots hard enough to throw the
        // sheet past the top of the screen and wobble back. A decelerating
        // curve arrives once and settles.
        entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.cubic))}
        style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.stackLg }]}
      >
        <View style={[styles.handle, { backgroundColor: c.lineStrong }]} />

        <Txt variant="heading" style={styles.title}>{t('add_something')}</Txt>

        <View style={styles.options}>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.choice}
              onPress={() => {
                onChoose(opt.choice);
                onClose();
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: c.surfaceAlt, borderColor: c.line },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.optionIcon, { backgroundColor: c.flameWash }]}>
                <Icon name={opt.icon} size={22} color={c.flameDeep} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="bodySemi">{t(opt.titleKey)}</Txt>
                <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>{t(opt.subKey)}</Txt>
              </View>
              <Icon name="chevron-right" size={20} color={c.faint} />
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...Platform.select({ web: { maxWidth: 600, marginHorizontal: 'auto' } }),
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  title: { textAlign: 'center', marginTop: spacing.stackMd, marginBottom: spacing.stackMd },
  options: { paddingHorizontal: spacing.containerMobile, gap: spacing.stackSm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
