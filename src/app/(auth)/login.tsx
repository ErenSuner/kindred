import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PasswordField } from '@/components/PasswordField';
import { authErrorCode, authErrorDetail, describeAuthError } from '@/utils/authErrors';
import { authDiagnostics } from '@/utils/authDiagnostics';
import { ErrorDetails } from '@/components/ErrorDetails';
import { authRedirectUrl } from '@/utils/authLinks';
import { isOffline } from '@/utils/outbox';
import { supabase } from '@/lib/supabase';
import { Sentry } from '@/lib/sentry';
import { useTranslation } from 'react-i18next';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_COOLDOWN_SECONDS = 60;

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [errorDiag, setErrorDiag] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState('');
  const [resetLeft, setResetLeft] = useState(0);

  useEffect(() => {
    if (resetLeft <= 0) return;
    const id = setTimeout(() => setResetLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resetLeft]);

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setErrorDetail(null);
    setErrorDiag(null);
    setNoticeMsg('');
    if (!EMAIL.test(email.trim())) {
      setErrorMsg(t('reset_enter_email'));
      return;
    }
    if (resetLeft > 0) return;

    try {
      // redirectTo is what keeps the emailed link out of the project's Site URL
      // — which is where every reset link used to land on localhost. It brings
      // the person back into the app, onto /settings/new-password.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl(),
      });
      if (error) throw error;
    } catch (err) {
      // Only a rate limit and a dead connection are reported. Everything else is
      // swallowed on purpose: an error that appears for unknown addresses and
      // not for known ones turns this button into a way of checking who has an
      // account here.
      const code = authErrorCode(err);
      if (code?.startsWith('over_') || isOffline(err)) {
        setErrorMsg(describeAuthError(err, 'public', 'send that email'));
        setErrorDetail(authErrorDetail(err, authRedirectUrl()));
        setErrorDiag(
          authDiagnostics(err, {
            action: 'password_reset',
            email: email.trim(),
            redirect: authRedirectUrl(),
          }),
        );
        return;
      }
      // Still worth knowing about, even though the screen stays quiet.
      Sentry.captureException(err);
    }

    // Said the same way whether or not the address exists.
    setNoticeMsg(t('reset_link_generic'));
    setResetLeft(RESET_COOLDOWN_SECONDS);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg(t('error_fill_fields'));
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setErrorDetail(null);
    setErrorDiag(null);
    setNoticeMsg('');

    try {
      // The password is sent exactly as typed. Trimming it here would lock out
      // anyone whose password legitimately ends in a space.
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // router.replace('/home') will be handled by the route guard in _layout.tsx
    } catch (err) {
      // 'public': "no such account" and "wrong password" must read identically,
      // or this screen becomes a tool for finding out who is registered.
      setErrorMsg(describeAuthError(err, 'public', 'sign you in'));
      setErrorDetail(authErrorDetail(err));
      // The sentence above is deliberately vague — it has to be, on a screen
      // anyone can reach. The report is not: whoever is looking at it is the
      // one who just failed to sign in to their own account.
      setErrorDiag(authDiagnostics(err, { action: 'sign_in', email: email.trim() }));
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  };

  const input = [styles.input, { backgroundColor: c.surfaceAlt, color: c.text }];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: insets.top + spacing.stackXl,
          paddingBottom: insets.bottom + spacing.stackMd,
          justifyContent: 'center',
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', marginBottom: spacing.stackXl }}>
          <View style={styles.brandRow}>
            <View style={[styles.flameDot, { backgroundColor: c.flame }]} />
            <Txt variant="display">{t('welcome_brand')}</Txt>
          </View>
          <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
            {t('welcome_back')}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Card style={styles.card}>
            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: c.dangerWash }]}>
                <Icon name="error-outline" size={20} color={c.danger} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Txt variant="sub" color={c.danger}>{errorMsg}</Txt>
                  {errorDetail ? (
                    <Txt variant="sub" color={c.danger} style={{ opacity: 0.7, marginTop: 2 }} selectable>
                      {errorDetail}
                    </Txt>
                  ) : null}
                  <ErrorDetails report={errorDiag} />
                </View>
              </View>
            ) : null}

            {noticeMsg ? (
              <View style={[styles.errorBox, { backgroundColor: c.goodWash }]}>
                <Icon name="mark-email-read" size={20} color={c.good} style={{ marginTop: 1 }} />
                <Txt variant="sub" color={c.good} style={{ flex: 1, marginLeft: 8 }}>
                  {noticeMsg}
                </Txt>
              </View>
            ) : null}

            <View style={{ gap: spacing.stackSm }}>
              <Txt variant="eyebrow" color={c.faint} style={styles.label}>{t('email_address')}</Txt>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('email_placeholder')}
                placeholderTextColor={c.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                style={input}
                editable={!loading}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              <Txt variant="eyebrow" color={c.faint} style={styles.label}>{t('password')}</Txt>
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                purpose="current"
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={handleForgotPassword}
                hitSlop={8}
                disabled={resetLeft > 0}
                style={[{ alignSelf: 'flex-end', marginTop: 4 }, resetLeft > 0 && { opacity: 0.45 }]}
              >
                <Txt variant="sub" color={c.flameDeep}>
                  {resetLeft > 0 ? t('email_resend_in', { seconds: resetLeft }) : t('forgot_password')}
                </Txt>
              </Pressable>
            </View>

            <Button
              label={loading ? t('signing_in') : t('sign_in')}
              onPress={handleLogin}
              fullWidth
              disabled={loading}
              style={{ marginTop: spacing.stackLg }}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.footer}>
          <Txt variant="body" color={c.muted}>
            {t('no_account')}
          </Txt>
          <Pressable onPress={() => router.push('/register')}>
            <Txt variant="bodySemi" color={c.flameDeep} style={{ textDecorationLine: 'underline' }}>
              {t('sign_up')}
            </Txt>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flameDot: { width: 10, height: 10, borderRadius: 5 },
  card: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    marginLeft: 2,
  },
  input: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
  },
  errorBox: {
    flexDirection: 'row',
    // Top-aligned, not centred: the details block underneath can be a dozen
    // lines tall, and an icon floating halfway down it reads as a bug.
    alignItems: 'flex-start',
    borderRadius: radius.DEFAULT,
    padding: 12,
    marginBottom: spacing.stackMd,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.stackLg,
  },
});
