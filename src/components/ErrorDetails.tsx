import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';

type Props = {
  // The block from @/utils/authDiagnostics. Untranslated on purpose — it is
  // meant to be pasted somewhere, not read as prose.
  report?: string | null;
};

// Closed until asked for. An error people can act on gets one sentence; this is
// for the other kind, where the sentence is wrong or says nothing and the only
// way forward is the server's own words.
//
// Shipped in release builds rather than behind __DEV__: the failures worth
// chasing are the ones that happen on someone else's phone, and a report they
// can't reach is a report that doesn't exist.
export function ErrorDetails({ report }: Props) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  if (!report) return null;

  const share = () => {
    // Share is the one copy path that needs no extra dependency and exists on
    // both phones. On web it may be missing, where the text is selectable
    // anyway — so a failure here is not worth interrupting anyone over.
    Share.share({ message: report }).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        hitSlop={8}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Icon name={open ? 'expand-less' : 'expand-more'} size={16} color={c.danger} />
        <Txt variant="sub" color={c.danger}>
          {open ? t('error_details_hide') : t('error_details')}
        </Txt>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          <Txt
            variant="sub"
            color={c.danger}
            selectable
            style={[styles.report, { borderColor: c.danger }]}
          >
            {report}
          </Txt>

          {Platform.OS !== 'web' && (
            <Pressable onPress={share} hitSlop={8} style={styles.share} accessibilityRole="button">
              <Icon name="share" size={15} color={c.danger} />
              <Txt variant="subMed" color={c.danger}>{t('error_share')}</Txt>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  // Monospaced so the block's columns line up and a codepoint escape can be
  // read character by character.
  report: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.85,
    borderLeftWidth: 2,
    paddingLeft: 8,
    marginTop: 6,
    borderRadius: radius.sm,
  },
  share: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
});
