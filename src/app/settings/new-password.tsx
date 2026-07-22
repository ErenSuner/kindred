import { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { PasswordField } from '@/components/PasswordField';
import { showHeld } from '@/components/HeldNotice';
import { authErrorDetail, describeAuthError } from '@/utils/authErrors';
import { firstPasswordProblem } from '@/utils/password';
import { supabase } from '@/lib/supabase';
import { Sentry } from '@/lib/sentry';
import { useAuth } from '@/context/AuthContext';

// Where a "forgot your password" link lands.
//
// No current password is asked for, and that is not an oversight: the proof of
// identity is the link itself, which only reaches the mailbox on the account.
// Asking for the old password here would ask for the one thing the person came
// because they don't have.
export default function NewPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const liveProblem = useMemo(
    () =>
      password.length > 0
        ? firstPasswordProblem(password, {
            email: user?.email,
            confirm: confirmPassword.length > 0 ? confirmPassword : undefined,
          })
        : null,
    [password, confirmPassword, user?.email],
  );

  const handleSave = async () => {
    setError(null);
    setErrorDetail(null);

    if (!password || !confirmPassword) {
      setError(t('fill_all_fields'));
      return;
    }

    const problem = firstPasswordProblem(password, {
      email: user?.email,
      confirm: confirmPassword,
    });
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;

      // Whoever forced the reset — or whoever was already signed in on another
      // device — loses their session. That is the point of resetting.
      try {
        await supabase.auth.signOut({ scope: 'others' });
      } catch (e) {
        Sentry.captureException(e);
      }

      showHeld(t('password_updated'), t('signed_out_other_devices'));
      router.replace('/home');
    } catch (e) {
      setError(describeAuthError(e, 'authed'));
      setErrorDetail(authErrorDetail(e));
      Sentry.captureException(e);
    } finally {
      setSaving(false);
    }
  };

  // The link is what creates the session. Without one the screen has nothing to
  // update, and saying so beats a save that fails for reasons nobody can see.
  const noSession = !authLoading && !user;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.line }]}>
        <Pressable onPress={() => router.replace(user ? '/home' : '/login')} hitSlop={8}>
          <Icon name="arrow-back" size={26} color={c.muted} />
        </Pressable>
        <Txt variant="title">{t('reset_password_title')}</Txt>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            paddingTop: spacing.stackLg,
            paddingBottom: insets.bottom + spacing.stackXl,
            gap: spacing.stackMd,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: spacing.stackMd }}>
            <Txt variant="body" color={c.muted}>
              {noSession ? t('reset_password_no_session') : t('reset_password_sub')}
            </Txt>

            {user?.email && (
              <View style={styles.accountRow}>
                <Icon name="email" size={18} color={c.flameDeep} />
                <Txt variant="sub" color={c.muted} numberOfLines={1}>{user.email}</Txt>
              </View>
            )}

            <View>
              <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('new_password')}</Txt>
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder={t('enter_new_password')}
                purpose="new"
                showStrength
                autoFocus={!noSession}
                editable={!saving && !noSession}
              />
            </View>

            <View>
              <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('confirm_new_password_label')}</Txt>
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t('confirm_new_password')}
                purpose="confirm"
                editable={!saving && !noSession}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {!error && liveProblem && (
              <Txt variant="sub" color={c.muted} style={{ marginLeft: 4 }}>{liveProblem}</Txt>
            )}

            <FormError message={error} detail={errorDetail} />

            <Button
              label={saving ? t('saving') : t('set_password')}
              icon="shield"
              fullWidth
              disabled={saving || noSession || !password || !confirmPassword}
              onPress={handleSave}
            />
          </Animated.View>
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
  subLabel: { marginBottom: 6, marginLeft: 4 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
