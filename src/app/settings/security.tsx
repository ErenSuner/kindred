import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { showHeld } from '@/components/HeldNotice';
import { describeWriteError } from '@/utils/loadError';
import { formatOccurrenceDate } from '@/utils/dates';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from "react-i18next";

// A blunt strength read: length carries most of it, character variety the rest.
// 0-4, mapped to weak / medium / strong below.
function strength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

// A password field that can reveal itself — typing a new password blind is the
// fastest way to lock yourself out of your own account.
function SecureField({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const { c } = useTheme();
  const [reveal, setReveal] = useState(false);
  return (
    <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Icon name="lock" size={20} color={c.faint} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, { color: c.text }]}
        placeholder={placeholder}
        placeholderTextColor={c.faint}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!reveal}
        autoCapitalize="none"
        autoFocus={autoFocus}
      />
      <Pressable onPress={() => setReveal((v) => !v)} hitSlop={8}>
        <Icon name={reveal ? 'visibility-off' : 'visibility'} size={20} color={c.faint} />
      </Pressable>
    </View>
  );
}

export default function SecuritySettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useAuth();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = strength(password);
  const tierLabel = score <= 1 ? t('strength_weak') : score < 4 ? t('strength_medium') : t('strength_strong');
  const tierColor = score <= 1 ? c.danger : score < 4 ? c.flame : c.good;

  const memberSince = user?.created_at ? formatOccurrenceDate(new Date(user.created_at)) : null;

  const forgot = async () => {
    if (!user?.email) return;
    setError(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(user.email);
      if (err) throw err;
      showHeld(t('reset_email_sent'));
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!current.trim() || !password.trim() || !confirmPassword.trim()) {
      setError(t('fill_all_fields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwords_no_match'));
      return;
    }
    if (password.length < 8) {
      setError(t('password_min'));
      return;
    }
    if (!user?.email) return;

    setLoading(true);
    try {
      // Re-auth first: proving you know the current password is what stops a
      // borrowed unlocked phone from silently changing the account's password.
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current.trim(),
      });
      if (reauthErr) {
        setError(t('current_password_wrong'));
        setLoading(false);
        return;
      }

      const { error: err } = await supabase.auth.updateUser({ password: password.trim() });
      if (err) throw err;

      router.back();
      showHeld(t('password_updated'));
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.line }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={26} color={c.muted} />
        </Pressable>
        <Txt variant="title">{t('security')}</Txt>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            paddingTop: spacing.stackLg,
            paddingBottom: insets.bottom + 140,
            gap: spacing.stackLg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Account details — who this password belongs to. */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('account_details')}</Txt>
            <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={styles.infoRow}>
                <Icon name="email" size={20} color={c.flameDeep} />
                <Txt variant="bodyMed" style={{ flex: 1 }} numberOfLines={1}>{user?.email}</Txt>
              </View>
              {memberSince && (
                <>
                  <View style={[styles.infoDivider, { backgroundColor: c.line }]} />
                  <View style={styles.infoRow}>
                    <Icon name="event-available" size={20} color={c.flameDeep} />
                    <Txt variant="sub" color={c.muted} style={{ flex: 1 }}>
                      {t('member_since', { date: memberSince })}
                    </Txt>
                  </View>
                </>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(50)} style={{ gap: spacing.stackMd }}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('change_password')}</Txt>

            <View>
              <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('current_password')}</Txt>
              <SecureField value={current} onChange={setCurrent} placeholder={t('enter_current_password')} />
              <Pressable onPress={forgot} hitSlop={8} style={styles.forgotLink}>
                <Txt variant="sub" color={c.flameDeep}>{t('forgot_password_q')}</Txt>
              </Pressable>
            </View>

            <View>
              <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('new_password')}</Txt>
              <SecureField value={password} onChange={setPassword} placeholder={t('enter_new_password')} />
              {password.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBar}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSeg,
                          { backgroundColor: i < score ? tierColor : c.surfaceAlt },
                        ]}
                      />
                    ))}
                  </View>
                  <Txt variant="sub" color={c.muted}>
                    {t('password_strength')}: {tierLabel}
                  </Txt>
                </View>
              )}
            </View>

            <View>
              <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('confirm_new_password')}</Txt>
              <SecureField value={confirmPassword} onChange={setConfirmPassword} placeholder={t('confirm_new_password')} />
            </View>
          </Animated.View>

          <FormError message={error} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: c.bg, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <Button
          label={loading ? t('saving') : t('update_password')}
          onPress={handleSave}
          disabled={loading || !current.trim() || !password.trim() || !confirmPassword.trim()}
          icon="shield"
          fullWidth
        />
      </View>
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
  fieldLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  subLabel: { marginBottom: 6, marginLeft: 4 },
  infoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  infoDivider: { height: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
    height: '100%',
  },
  forgotLink: { alignSelf: 'flex-end', marginTop: 8, marginRight: 2 },
  strengthWrap: { marginTop: 10, gap: 6 },
  strengthBar: { flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.containerMobile,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
