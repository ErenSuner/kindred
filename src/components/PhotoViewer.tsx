import { View, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';

type Props = {
  visible: boolean;
  onClose: () => void;
  uri?: string;
  title?: string;
};

// Full-bleed square view of a profile picture. Avatars are cropped to a circle
// everywhere else, so this is the only place the original framing is visible —
// which is the point of tapping it. Always near-black, whatever the theme:
// photographs read best against darkness.
export function PhotoViewer({ visible, onClose, uri, title }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={styles.backdrop}>
        {/* Tapping anywhere off the photo dismisses, the photo itself doesn't. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.top, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
          {title && (
            <Txt variant="subMed" color="#F5F2E8" style={{ flex: 1 }} numberOfLines={1}>
              {title}
            </Txt>
          )}
          <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
            <Icon name="close" size={24} color="#F5F2E8" />
          </Pressable>
        </View>

        <Animated.View entering={FadeIn.duration(240)} pointerEvents="none">
          <Image
            source={{ uri }}
            style={{ width, height: width }}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 9, 7, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 2,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
