import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from './Txt';

type Props = {
  uri?: string;
  initials?: string;
  size?: number;
  ring?: boolean; // surface-coloured border ring used on cards
};

// Circular avatar — the faces are the content. Falls back to Fraunces
// initials on a warm amber wash.
export function Avatar({ uri, initials, size = 48, ring = true }: Props) {
  const { c } = useTheme();
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      style={[
        styles.wrap,
        dim,
        { backgroundColor: c.surfaceAlt },
        ring && { borderWidth: 2, borderColor: c.surface },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={[dim, styles.img]} contentFit="cover" transition={200} />
      ) : (
        <View style={[dim, styles.initials, { backgroundColor: c.flameWash }]}>
          <Txt
            color={c.flameDeep}
            style={{
              fontFamily: fonts.frauncesSemiBold,
              fontSize: Math.max(13, Math.round(size * 0.38)),
              lineHeight: Math.max(16, Math.round(size * 0.46)),
            }}
          >
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
  },
  img: { width: '100%', height: '100%' },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
