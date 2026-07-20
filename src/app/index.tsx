import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius, dark } from '@/theme/tokens';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { useTranslation } from 'react-i18next';

// The welcome screen is the lamp before it's lit: always the deep spruce ink,
// whatever the theme, with one candle-amber line. First impression = identity.
const c = dark;

export default function Welcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: '#141A15' }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.stackXl, paddingBottom: insets.bottom + spacing.stackXl },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(700)} style={styles.brandRow}>
          <View style={[styles.flameDot, { backgroundColor: c.flame }]} />
          <Txt color={c.onInk} style={styles.wordmark}>{t('welcome_brand')}</Txt>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View entering={FadeInDown.duration(700).delay(120)}>
          <Txt color={c.onInk} style={styles.headline}>
            {t('welcome_headline')}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(700).delay(240)} style={{ marginTop: spacing.stackMd, maxWidth: 420 }}>
          <Txt variant="body" color={c.onInkMuted}>
            {t('welcome_sub')}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(700).delay(360)} style={styles.actions}>
          <Button
            label={t('get_started')}
            iconRight="arrow-forward"
            fullWidth
            onPress={() => router.push('/register')}
          />
          {/* Styled by hand: this screen is always ink, whatever the active
              theme, so themed Button variants would clash here. */}
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.loginBtn,
              { borderColor: c.inkSoft },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Txt variant="bodySemi" color={c.onInkMuted}>{t('log_in')}</Txt>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerMobile + 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flameDot: { width: 10, height: 10, borderRadius: radius.full },
  wordmark: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 40,
    lineHeight: 47,
    letterSpacing: -0.8,
  },
  actions: {
    marginTop: spacing.stackXl,
    gap: spacing.stackMd,
    maxWidth: 420,
    width: '100%',
  },
  loginBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
});
