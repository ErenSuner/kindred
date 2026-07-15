import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/theme/tokens';
import { Txt } from './Txt';

type Props = {
  uri?: string;
  initials?: string;
  size?: number;
  ring?: boolean; // white border ring used on cards
};

// Circular avatar — a core brand identifier. Falls back to initials on a blush chip.
export function Avatar({ uri, initials, size = 48, ring = true }: Props) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      style={[
        styles.wrap,
        dim,
        ring && { borderWidth: 2, borderColor: colors.surface },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={[dim, styles.img]} contentFit="cover" transition={200} />
      ) : (
        <View style={[dim, styles.initials]}>
          <Txt variant="headlineMd" color={colors.onPrimaryContainer}>
            {initials ?? '?'}
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  img: { width: '100%', height: '100%' },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
  },
});
