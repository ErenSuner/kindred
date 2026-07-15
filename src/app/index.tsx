import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';

const BG =
  'https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=900&q=80';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <Image source={{ uri: BG }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient
        colors={['rgba(252,249,248,0.4)', 'rgba(252,249,248,0.65)', colors.background]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom + spacing.stackXl, minHeight: height }]}>
        <Animated.View entering={FadeInDown.duration(700)}>
          <Txt variant="headlineMd" color={colors.primary}>
            Kindred
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(700).delay(120)} style={{ marginTop: spacing.stackLg }}>
          <Txt variant="headlineLgMobile" color={colors.onSurface}>
            Never miss a special moment with those who matter most.
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(700).delay(240)} style={{ marginTop: spacing.stackMd, maxWidth: 420 }}>
          <Txt variant="bodyLg" color={colors.onSurfaceVariant}>
            A mindful space to remember birthdays, anniversaries, and the quiet moments that build lifelong connections.
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(700).delay(360)} style={styles.actions}>
          <Button
            label="Get Started"
            iconRight="arrow-forward"
            fullWidth
            onPress={() => router.push('/register')}
          />
          <Button
            label="Log In"
            variant="tonal"
            fullWidth
            onPress={() => router.push('/login')}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.containerMobile,
  },
  actions: {
    marginTop: spacing.stackXl,
    gap: spacing.stackMd,
    maxWidth: 420,
    width: '100%',
  },
});
