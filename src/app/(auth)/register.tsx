import { useEffect, useMemo, useState } from 'react';
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
import { authRedirectUrl } from '@/utils/authLinks';
import { firstPasswordProblem } from '@/utils/password';
import { supabase } from '@/lib/supabase';
import { Sentry } from '@/lib/sentry';
import { useTranslation } from 'react-i18next';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

export default function Register() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [emailTaken, setEmailTaken] = useState(false);
  // Only true when Supabase sent a confirmation instead of a session — the one
  // case where offering to send it again means anything.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendLeft, setResendLeft] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendLeft]);

  // The same rules the change-password screen enforces, shown while typing
  // rather than only on submit.
  const liveProblem = useMemo(
    () =>
      password.length > 0
        ? firstPasswordProblem(password, {
            email: email.trim() || undefined,
            confirm: confirmPassword.length > 0 ? confirmPassword : undefined,
          })
        : null,
    [password, confirmPassword, email],
  );

  const handleRegister = async () => {
    setEmailTaken(false);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg(t('error_fill_fields'));
      return;
    }

    if (!EMAIL.test(email.trim())) {
      setErrorMsg(t('invalid_email_format'));
      return;
    }

    // Was `password.length < 6` here and 8 on the change-password screen, so an
    // account could be created with a password the app would later refuse.
    const problem = firstPasswordProblem(password, {
      email: email.trim(),
      confirm: confirmPassword,
    });
    if (problem) {
      setErrorMsg(problem);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setErrorDetail(null);
    setSuccessMsg('');

    const full = name.trim();
    const parts = full.split(' ');
    let finalName = full;
    let finalSurname = '';

    if (parts.length > 1) {
      finalSurname = parts.pop() || '';
      finalName = parts.join(' ');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        // Sent as typed — see the note in @/utils/password on why nothing here
        // trims a password.
        email: email.trim(),
        password,
        options: {
          data: {
            name: finalName,
            surname: finalSurname,
          },
          // Without this the confirmation link falls back to the project's Site
          // URL instead of opening the app.
          emailRedirectTo: authRedirectUrl(),
        },
      });

      if (error) throw error;

      if (data?.session) {
        // Logged in immediately (email confirmation disabled)
        setSuccessMsg(t('register_success'));
      } else {
        // Email confirmation enabled — and this is the state people get stuck
        // in, when the first mail lands in spam or never arrives at all.
        setSuccessMsg(t('register_success_email'));
        setAwaitingConfirmation(true);
        setResendLeft(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err) {
      setErrorMsg(describeAuthError(err, 'public', 'create your account'));
      setErrorDetail(authErrorDetail(err, authRedirectUrl()));
      Sentry.captureException(err);
      // Sign-up is the one screen where a collision has to be said out loud, or
      // the person keeps retyping an address that will never work. Offer the
      // way out rather than only the wall.
      const code = authErrorCode(err);
      setEmailTaken(
        code === 'email_exists' || code === 'user_already_exists' || code === 'identity_already_exists',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendLeft > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    setErrorDetail(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      setSuccessMsg(t('register_success_email'));
      setResendLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setErrorMsg(describeAuthError(err, 'public', 'send that email'));
      setErrorDetail(authErrorDetail(err, authRedirectUrl()));
      Sentry.captureException(err);
    } finally {
      setResending(false);
    }
  };

  const input = [styles.input, { backgroundColor: c.surfaceAlt, color: c.text }];
  const label = (text: string) => (
    <Txt variant="eyebrow" color={c.faint} style={styles.label}>{text}</Txt>
  );

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
            <Txt variant="display">{t('join_brand')}</Txt>
          </View>
          <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
            {t('join_sub')}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Card style={styles.card}>
            {errorMsg ? (
              <View style={[styles.msgBox, { backgroundColor: c.dangerWash }]}>
                <Icon name="error-outline" size={20} color={c.danger} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Txt variant="sub" color={c.danger}>{errorMsg}</Txt>
                  {errorDetail ? (
                    <Txt variant="sub" color={c.danger} style={{ opacity: 0.7, marginTop: 2 }} selectable>
                      {errorDetail}
                    </Txt>
                  ) : null}
                  {emailTaken && (
                    <Pressable onPress={() => router.push('/login')} hitSlop={8}>
                      <Txt
                        variant="subMed"
                        color={c.danger}
                        style={{ textDecorationLine: 'underline', marginTop: 4 }}
                      >
                        {t('sign_in_instead')}
                      </Txt>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}

            {successMsg ? (
              <View style={[styles.msgBox, { backgroundColor: c.goodWash }]}>
                <Icon name="check-circle" size={20} color={c.good} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Txt variant="sub" color={c.good}>{successMsg}</Txt>
                  {awaitingConfirmation && (
                    <Pressable
                      onPress={handleResend}
                      hitSlop={8}
                      disabled={resendLeft > 0 || resending}
                      style={(resendLeft > 0 || resending) && { opacity: 0.45 }}
                    >
                      <Txt variant="subMed" color={c.good} style={{ marginTop: 4 }}>
                        {resendLeft > 0
                          ? t('email_resend_in', { seconds: resendLeft })
                          : t('resend_confirmation')}
                      </Txt>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}

            <View style={{ gap: spacing.stackSm }}>
              {label(t('full_name'))}
              <TextInput
                style={input}
                placeholder={t('name_placeholder')}
                placeholderTextColor={c.faint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading && !successMsg}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              {label(t('email_address'))}
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
                editable={!loading && !successMsg}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              {label(t('password'))}
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder={t('password_placeholder')}
                purpose="new"
                showStrength
                editable={!loading && !successMsg}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              {label(t('confirm_password'))}
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t('confirm_password_placeholder')}
                purpose="confirm"
                editable={!loading && !successMsg}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />
            </View>

            {!errorMsg && liveProblem ? (
              <Txt variant="sub" color={c.muted} style={{ marginTop: spacing.stackSm, marginLeft: 2 }}>
                {liveProblem}
              </Txt>
            ) : null}

            <Button
              label={loading ? t('creating_account') : t('sign_up')}
              onPress={handleRegister}
              fullWidth
              style={{ marginTop: spacing.stackLg }}
              disabled={loading || !!successMsg}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.footer}>
          <Txt variant="body" color={c.muted}>
            {t('already_have_account')}
          </Txt>
          <Pressable onPress={() => router.push('/login')}>
            <Txt variant="bodySemi" color={c.flameDeep} style={{ textDecorationLine: 'underline' }}>
              {t('sign_in')}
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
  msgBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
