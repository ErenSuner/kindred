import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { showHeld } from '@/components/HeldNotice';
import { describeWriteError } from '@/utils/loadError';
import { sendFeedback, type FeedbackKind } from '@/lib/feedbackApi';
import { SUPPORT_EMAIL } from '@/lib/links';
import { Sentry } from '@/lib/sentry';
import { useAuth } from '@/context/AuthContext';

const MAX_BODY = 2000;

const KINDS: { value: FeedbackKind; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
  { value: 'bug', label: 'feedback_kind_bug', icon: 'bug-report' },
  { value: 'idea', label: 'feedback_kind_idea', icon: 'lightbulb' },
  { value: 'other', label: 'feedback_kind_other', icon: 'chat-bubble' },
];

// Feedback, written and sent from inside the app.
//
// It used to be a `mailto:` link. On Android 11+ that cannot resolve without a
// <queries> manifest entry, so the system passed it to the browser and the
// person watched a blank page load. Nothing about "tell us what's wrong" should
// depend on whether a mail app happens to be installed and configured.
export default function Feedback() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useAuth();

  const [kind, setKind] = useState<FeedbackKind>('other');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState(user?.email ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only offered when something can actually answer it. Checked rather than
  // assumed, because assuming is what produced the blank page.
  const [mailAvailable, setMailAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Linking.canOpenURL(`mailto:${SUPPORT_EMAIL}`)
      .then((ok) => {
        if (!cancelled) setMailAvailable(ok);
      })
      .catch(() => {
        if (!cancelled) setMailAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async () => {
    setError(null);
    if (!body.trim()) return;

    setSending(true);
    try {
      await sendFeedback({ kind, body, replyTo });
      showHeld(t('feedback_sent'), t('feedback_sent_detail'));
      router.back();
    } catch (e) {
      // The typed message stays exactly where it is. Losing what someone just
      // wrote is the one failure that guarantees they never write it again.
      Sentry.captureException(e);
      setError(describeWriteError(e, 'send'));
    } finally {
      setSending(false);
    }
  };

  const openMail = () => {
    const subject = encodeURIComponent(t('feedback_mail_subject'));
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      // canOpenURL said yes and it still failed: stop offering the link rather
      // than leaving a button that does nothing.
      setMailAvailable(false);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.line }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={26} color={c.muted} />
        </Pressable>
        <Txt variant="title">{t('feedback')}</Txt>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            paddingTop: spacing.stackLg,
            paddingBottom: insets.bottom + spacing.stackXl,
            gap: spacing.stackLg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: spacing.stackSm }}>
            <Txt variant="body" color={c.muted}>{t('feedback_intro')}</Txt>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(30)} style={{ gap: spacing.stackSm }}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('feedback_kind')}</Txt>
            <View style={styles.kindRow}>
              {KINDS.map((option) => {
                const active = kind === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setKind(option.value)}
                    disabled={sending}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.kindChip,
                      {
                        backgroundColor: active ? c.flameWash : c.surface,
                        borderColor: active ? c.flame : c.line,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Icon name={option.icon} size={18} color={active ? c.flameDeep : c.faint} />
                    <Txt variant="sub" color={active ? c.flameDeep : c.muted}>
                      {t(option.label)}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(60)} style={{ gap: spacing.stackSm }}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('feedback_message')}</Txt>
            <TextInput
              style={[styles.textArea, { backgroundColor: c.surface, borderColor: c.line, color: c.text }]}
              placeholder={t('feedback_placeholder')}
              placeholderTextColor={c.faint}
              value={body}
              onChangeText={(v) => setBody(v.slice(0, MAX_BODY))}
              multiline
              textAlignVertical="top"
              editable={!sending}
              autoFocus
            />
            <Txt variant="sub" color={c.faint} style={{ alignSelf: 'flex-end' }}>
              {body.length} / {MAX_BODY}
            </Txt>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(90)} style={{ gap: spacing.stackSm }}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('feedback_reply_to')}</Txt>
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Icon name="email" size={20} color={c.faint} style={{ marginRight: 12 }} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('feedback_reply_to_placeholder')}
                placeholderTextColor={c.faint}
                value={replyTo}
                onChangeText={setReplyTo}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!sending}
              />
            </View>
            <Txt variant="sub" color={c.faint} style={{ marginLeft: 4 }}>{t('feedback_reply_to_hint')}</Txt>
          </Animated.View>

          <FormError message={error} />

          <Button
            label={sending ? t('feedback_sending') : t('feedback_send')}
            icon="send"
            fullWidth
            disabled={sending || !body.trim()}
            onPress={handleSend}
          />

          {/* The old route, kept as a choice rather than the only way through —
              and only when the phone has something that can honour it. */}
          <View style={styles.mailFallback}>
            {mailAvailable ? (
              <Pressable onPress={openMail} hitSlop={8}>
                <Txt variant="sub" color={c.flameDeep} style={{ textAlign: 'center' }}>
                  {t('feedback_prefer_email')}
                </Txt>
              </Pressable>
            ) : (
              <Txt variant="sub" color={c.faint} style={{ textAlign: 'center' }} selectable>
                {t('feedback_email_us', { email: SUPPORT_EMAIL })}
              </Txt>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  fieldLabel: { marginLeft: 4 },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  textArea: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    minHeight: 160,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
    lineHeight: 23,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    height: 56,
  },
  input: {
    flex: 1,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
    height: '100%',
  },
  mailFallback: { marginTop: spacing.stackSm },
});
