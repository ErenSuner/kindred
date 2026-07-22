import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { PRIVACY_POLICY_URL } from '@/lib/links';
import { useTranslation } from "react-i18next";

// Static, localized FAQ — no backend. Questions live as help_q1..N / help_a1..N
// in the locale files; bump this when you add a pair.
const FAQ_COUNT = 6;

export default function HelpCenter() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, cardShadow } = useTheme();
  // One open at a time — the answers are short and a single column stays calm.
  const [open, setOpen] = useState<number | null>(0);

  const toggle = (i: number) => setOpen((cur) => (cur === i ? null : i));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.line }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={26} color={c.muted} />
        </Pressable>
        <Txt variant="title">{t('help_center')}</Txt>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: spacing.stackLg,
          paddingBottom: insets.bottom + 40,
          gap: spacing.stackSm,
        }}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n, i) => {
          const isOpen = open === i;
          return (
            <Animated.View
              key={n}
              layout={LinearTransition.duration(220)}
              style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}
            >
              <Pressable onPress={() => toggle(i)} style={styles.q}>
                <Txt variant="bodyMed" style={{ flex: 1 }}>{t(`help_q${n}`)}</Txt>
                <Icon name={isOpen ? 'expand-less' : 'expand-more'} size={22} color={c.faint} />
              </Pressable>
              {isOpen && (
                <Animated.View entering={FadeIn.duration(160)} style={styles.a}>
                  <Txt variant="body" color={c.muted} style={{ lineHeight: 22 }}>{t(`help_a${n}`)}</Txt>
                </Animated.View>
              )}
            </Animated.View>
          );
        })}

        <View style={{ marginTop: spacing.stackMd, gap: spacing.stackSm }}>
          <Txt variant="eyebrow" color={c.faint} style={{ marginLeft: 4 }}>{t('still_need_help')}</Txt>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Pressable
              onPress={() => router.push('/settings/feedback')}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
                <Icon name="chat-bubble" size={20} color={c.flameDeep} />
              </View>
              <Txt variant="bodyMed" style={{ flex: 1 }}>{t('help_contact')}</Txt>
              <Icon name="chevron-right" size={20} color={c.faint} />
            </Pressable>
            <View style={[styles.divider, { backgroundColor: c.line }]} />
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
                <Icon name="privacy-tip" size={20} color={c.flameDeep} />
              </View>
              <Txt variant="bodyMed" style={{ flex: 1 }}>{t('privacy_policy')}</Txt>
              <Icon name="chevron-right" size={20} color={c.faint} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
    borderBottomWidth: 1,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  q: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  a: { paddingBottom: 16, paddingRight: 8 },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.stackMd,
    padding: spacing.stackMd,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, marginHorizontal: 16 },
});
