import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
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
import { authRedirectUrl } from '@/utils/authLinks';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from "react-i18next";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { c, floatShadow } = useTheme();
  const { user, signOut } = useAuth();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = strength(password);
  const tierLabel = score <= 1 ? t('strength_weak') : score < 4 ? t('strength_medium') : t('strength_strong');
  const tierColor = score <= 1 ? c.danger : score < 4 ? c.flame : c.good;

  const memberSince = user?.created_at ? formatOccurrenceDate(new Date(user.created_at)) : null;

  // Kept apart from the password fields: they save through different calls and
  // an error in one must not clear the other.
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = async () => {
    setEmailError(null);
    const next = email.trim();

    if (!EMAIL.test(next)) {
      setEmailError(t('invalid_email_format'));
      return;
    }

    setEmailSaving(true);
    try {
      // Without emailRedirectTo, Supabase falls back to the project's Site URL
      // — which is where the confirmation link used to land on localhost.
      const { error: err } = await supabase.auth.updateUser(
        { email: next },
        { emailRedirectTo: authRedirectUrl() },
      );
      if (err) throw err;

      // The address does not change until the link is opened, so the screen
      // must not pretend it already has. The typed value stays put.
      showHeld(t('email_confirm_sent'), t('email_confirm_sent_detail'));
    } catch (e) {
      console.error(e);
      setEmailError(describeWriteError(e));
    } finally {
      setEmailSaving(false);
    }
  };

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

  // Deleting the account lives here rather than on the settings screen: it is
  // the one action nothing can undo, and it should take a deliberate walk to
  // reach. Two confirmations once you're here.
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    setDeleteStep(1);
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const { error: err } = await supabase.rpc('delete_user');
      if (err) throw err;

      // If successful, log out
      await signOut();
    } catch (e) {
      // The cause is almost always a missing delete_user RPC, which is a
      // deployment problem — not something the person tapping the button can
      // act on. It goes to the console; they get a plain apology.
      console.error('Account deletion failed', e);
      Alert.alert(t('delete_failed'), t('delete_failed_body'));
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
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

          {/* Changing the address is a credential change, same as the password,
              and it only takes effect once both mailboxes have confirmed it. */}
          <Animated.View entering={FadeInDown.duration(400).delay(30)} style={{ gap: spacing.stackSm }}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('change_email')}</Txt>

            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Icon name="email" size={20} color={c.faint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('email_address')}
                placeholderTextColor={c.faint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Txt variant="sub" color={c.faint} style={{ marginLeft: 4 }}>{t('email_change_note')}</Txt>

            <FormError message={emailError} />

            <Button
              label={emailSaving ? t('saving') : t('update_email')}
              variant="quiet"
              icon="mark-email-read"
              small
              style={{ alignSelf: 'flex-start' }}
              disabled={emailSaving || !email.trim() || email.trim() === user?.email}
              onPress={handleEmailChange}
            />
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

          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Txt variant="eyebrow" color={c.danger} style={styles.fieldLabel}>{t('danger_zone')}</Txt>
            <View style={[styles.dangerCard, { backgroundColor: c.surface, borderColor: c.danger }]}>
              <Txt variant="sub" color={c.muted}>{t('delete_account_hint')}</Txt>
              <Button
                label={t('delete_account')}
                variant="danger"
                icon="delete-forever"
                small
                style={{ alignSelf: 'flex-start', marginTop: 14 }}
                onPress={handleDeleteAccount}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={deleteModalVisible} transparent animationType="none" onRequestClose={() => setDeleteModalVisible(false)}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeleteModalVisible(false)} />
          <Animated.View
            entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(200)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="warning" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>
              {deleteStep === 1 ? t('delete_account') : t('final_warning')}
            </Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center', marginBottom: 24 }}>
              {deleteStep === 1
                ? t('are_you_absolutely_sure_this_w')
                : t('this_is_your_last_chance_all_y')}
            </Txt>

            <View style={{ width: '100%', gap: 12 }}>
              <Button
                label={deleteStep === 1 ? t('delete_everything') : t('yes_delete_my_account')}
                variant="dangerSolid"
                onPress={() => {
                  if (deleteStep === 1) setDeleteStep(2);
                  else executeDelete();
                }}
                disabled={isDeleting}
                fullWidth
              />
              <Button
                label={t('cancel')}
                variant="quiet"
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
                fullWidth
              />
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

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
  dangerCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  modalContent: {
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
