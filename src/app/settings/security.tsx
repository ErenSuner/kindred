import { useEffect, useMemo, useRef, useState } from 'react';
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
import { PasswordField } from '@/components/PasswordField';
import { showHeld } from '@/components/HeldNotice';
import { authErrorDetail, describeAuthError } from '@/utils/authErrors';
import { authDiagnostics, inspectEmail, type DiagContext } from '@/utils/authDiagnostics';
import { firstPasswordProblem } from '@/utils/password';
import { formatOccurrenceDate } from '@/utils/dates';
import { authRedirectUrl } from '@/utils/authLinks';
import { supabase } from '@/lib/supabase';
import { Sentry } from '@/lib/sentry';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Long enough that a stolen phone can't be brute-forced through this screen,
// short enough that a genuine typo doesn't feel like a punishment.
const WRONG_PASSWORD_LIMIT = 3;
const LOCKOUT_SECONDS = 30;
// Supabase's own send limit is stricter than this; stopping here means the user
// sees a countdown instead of a rate-limit error.
const RESEND_COOLDOWN_SECONDS = 60;

// A second-resolution countdown that stops at zero. Used for both the wrong-
// password lockout and the resend cooldown.
function useCountdown(): [number, (seconds: number) => void] {
  const [until, setUntil] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (until === 0) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [until]);

  const start = (seconds: number) => setUntil(Date.now() + seconds * 1000);
  return [left, start];
}

// "just now" / "12 min ago" / "3h ago" — enough to tell a link sent a moment ago
// from one sent yesterday, without pretending to more precision. Returns the
// key and its count so the caller does the translating.
function sentAgo(iso: string | undefined): { key: string; count: number } | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return { key: 'just_now', count: 0 };
  if (minutes < 60) return { key: 'minutes_ago', count: minutes };
  return { key: 'hours_ago', count: Math.floor(minutes / 60) };
}

export default function SecuritySettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { user, signOut } = useAuth();

  const memberSince = user?.created_at ? formatOccurrenceDate(new Date(user.created_at)) : null;
  const verified = !!user?.email_confirmed_at;

  // Supabase keeps a requested address on the user until both mailboxes have
  // confirmed it, which is exactly the state this screen has to show.
  const pendingEmail = user?.new_email ?? null;
  const pendingAgo = sentAgo(user?.email_change_sent_at);
  const pendingSince = pendingAgo ? t(pendingAgo.key, { count: pendingAgo.count }) : null;

  // --- email ---------------------------------------------------------------
  // Nothing is pre-filled: the address already sits at the top of the screen,
  // and a field that starts holding the current value invites editing one
  // character of it by accident.
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDetail, setEmailDetail] = useState<string | null>(null);
  const [emailDiag, setEmailDiag] = useState<string | null>(null);
  const [resendLeft, startResendCooldown] = useCountdown();
  const [resending, setResending] = useState(false);

  const closeEmail = () => {
    setEmailOpen(false);
    setNewEmail('');
    setEmailError(null);
    setEmailDetail(null);
    setEmailDiag(null);
  };

  // Every auth failure lands here. The code goes on screen and to Sentry,
  // because the first version of this screen swallowed both and a working Gmail
  // address ended up reported as malformed with no way to see why.
  //
  // The one-line code was the first attempt at that and it wasn't enough: a code
  // the server sent and a code the app guessed from an English message look
  // identical once printed. So the full report goes on screen too, folded away
  // — what was sent, what came back, and which of the two the code came from.
  const reportAuthError = (
    e: unknown,
    ctx: DiagContext,
    set: (m: string | null) => void,
    setDetail: (d: string | null) => void,
    setDiag: (d: string | null) => void,
  ) => {
    // 'authed' — this person owns the account, so "that address already belongs
    // to an account" costs nothing to say and saves a lot of guessing.
    set(describeAuthError(e, 'authed'));
    setDetail(authErrorDetail(e, ctx.redirect ?? undefined));
    setDiag(authDiagnostics(e, ctx));
    Sentry.captureException(e);
  };

  const handleEmailChange = async () => {
    setEmailError(null);
    setEmailDetail(null);
    setEmailDiag(null);
    const next = newEmail.trim();

    // Before the format check, because a character that looks like an ordinary
    // `i` passes the format check. The Turkish keyboard's dotless `ı`, the
    // combining dot left behind by lowercasing `İ`, a zero-width space carried
    // in by copy-paste — all of them survive `[^\s@]+`, and all of them come
    // back from GoTrue as a flat "email_address_invalid" about an address that
    // looks, on screen, entirely correct.
    const badChar = inspectEmail(next);
    if (badChar) {
      setEmailError(
        t(badChar.key, { char: badChar.char, code: badChar.codepoint, index: badChar.index }),
      );
      return;
    }
    if (!EMAIL.test(next)) {
      setEmailError(t('invalid_email_format'));
      return;
    }
    if (next.toLowerCase() === (user?.email ?? '').toLowerCase()) {
      setEmailError(t('email_same_as_current'));
      return;
    }

    // Read once and reused: the URL that goes to Supabase, the URL named in the
    // success notice and the URL in a failure report all have to be the same
    // string, or the report describes a request that was never made.
    const redirect = authRedirectUrl();

    setEmailSaving(true);
    try {
      // Without emailRedirectTo, Supabase falls back to the project's Site URL
      // — which is where the confirmation link used to land on localhost.
      const { error: err } = await supabase.auth.updateUser(
        { email: next },
        { emailRedirectTo: redirect },
      );
      if (err) throw err;

      // The address does not change until both links are opened, so the screen
      // must not pretend it already has. Naming the address is what catches a
      // typo — there is no second field to catch it any more, and naming the
      // return address is what catches a link that will open the wrong place.
      showHeld(
        t('email_confirm_sent'),
        `${t('email_confirm_sent_to', { email: next })}\n${t('email_confirm_redirect', { url: redirect })}`,
      );
      startResendCooldown(RESEND_COOLDOWN_SECONDS);
      closeEmail();
    } catch (e) {
      reportAuthError(
        e,
        { action: 'email_change', email: next, redirect },
        setEmailError,
        setEmailDetail,
        setEmailDiag,
      );
    } finally {
      setEmailSaving(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail || resendLeft > 0) return;
    setEmailError(null);
    setEmailDetail(null);
    setEmailDiag(null);
    setResending(true);
    const redirect = authRedirectUrl();
    try {
      const { error: err } = await supabase.auth.resend({
        type: 'email_change',
        email: pendingEmail,
        options: { emailRedirectTo: redirect },
      });
      if (err) throw err;
      showHeld(
        t('email_resent'),
        `${t('email_confirm_sent_to', { email: pendingEmail })}\n${t('email_confirm_redirect', { url: redirect })}`,
      );
      startResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      reportAuthError(
        e,
        { action: 'email_change_resend', email: pendingEmail, redirect },
        setEmailError,
        setEmailDetail,
        setEmailDiag,
      );
    } finally {
      setResending(false);
    }
  };

  // --- password ------------------------------------------------------------
  // Closed by default. An always-open change-password form turns a settings
  // screen into something anyone glancing over a shoulder can read.
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [errorDiag, setErrorDiag] = useState<string | null>(null);
  const wrongTries = useRef(0);
  const [lockoutLeft, startLockout] = useCountdown();

  const closePassword = () => {
    setPasswordOpen(false);
    setCurrent('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setErrorDetail(null);
    setErrorDiag(null);
  };

  // Shown as the user types, so the rules arrive before the save button does.
  const liveProblem = useMemo(
    () =>
      password.length > 0
        ? firstPasswordProblem(password, {
            current: current || undefined,
            email: user?.email,
            confirm: confirmPassword.length > 0 ? confirmPassword : undefined,
          })
        : null,
    [password, confirmPassword, current, user?.email],
  );

  const forgot = async () => {
    if (!user?.email) return;
    setError(null);
    setErrorDetail(null);
    setErrorDiag(null);
    const redirect = authRedirectUrl();
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: redirect,
      });
      if (err) throw err;
      showHeld(t('reset_email_sent'), t('email_confirm_redirect', { url: redirect }));
    } catch (e) {
      reportAuthError(
        e,
        { action: 'password_reset', email: user.email, redirect },
        setError,
        setErrorDetail,
        setErrorDiag,
      );
    }
  };

  const handleSave = async () => {
    setError(null);
    setErrorDetail(null);
    setErrorDiag(null);

    if (lockoutLeft > 0) {
      setError(t('too_many_attempts', { seconds: lockoutLeft }));
      return;
    }
    if (!current || !password || !confirmPassword) {
      setError(t('fill_all_fields'));
      return;
    }

    // No trimming anywhere: the old code validated the typed value and saved a
    // trimmed one, so "abcdefg " passed an eight-character check and became a
    // seven-character password.
    const problem = firstPasswordProblem(password, {
      current,
      email: user?.email,
      confirm: confirmPassword,
    });
    if (problem) {
      setError(problem);
      return;
    }

    if (!user?.email) {
      setError(t('auth_err_session_expired'));
      return;
    }

    setLoading(true);
    try {
      // Re-auth first: proving you know the current password is what stops a
      // borrowed unlocked phone from silently changing the account's password.
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (reauthErr) {
        wrongTries.current += 1;
        if (wrongTries.current >= WRONG_PASSWORD_LIMIT) {
          wrongTries.current = 0;
          startLockout(LOCKOUT_SECONDS);
          setError(t('too_many_attempts', { seconds: LOCKOUT_SECONDS }));
        } else {
          // Not always "wrong password" — a rate limit, a dead connection and an
          // expired session all land here and each needs its own answer.
          setError(describeAuthError(reauthErr, 'authed'));
          setErrorDetail(authErrorDetail(reauthErr));
          setErrorDiag(authDiagnostics(reauthErr, { action: 'reauth', email: user.email }));
        }
        setLoading(false);
        return;
      }
      wrongTries.current = 0;

      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;

      // A password change that leaves every other device signed in has not
      // really changed anything — that is the case the change is usually for.
      try {
        await supabase.auth.signOut({ scope: 'others' });
      } catch (e) {
        // Best effort. The password did change; failing to reach the other
        // sessions is worth knowing about but not worth undoing the change for.
        Sentry.captureException(e);
      }

      showHeld(t('password_updated'), t('signed_out_other_devices'));
      closePassword();
      router.back();
    } catch (e) {
      reportAuthError(
        e,
        { action: 'password_update', email: user.email },
        setError,
        setErrorDetail,
        setErrorDiag,
      );
    } finally {
      setLoading(false);
    }
  };

  // --- account deletion ----------------------------------------------------
  // Lives here rather than on the settings screen: it is the one action nothing
  // can undo, and it should take a deliberate walk to reach.
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

      await signOut();
    } catch (e) {
      // The cause is almost always a missing delete_user RPC, which is a
      // deployment problem — not something the person tapping the button can act
      // on. They get a plain apology; Sentry gets the reason, because in
      // production there is no console to read it from.
      Sentry.captureException(e);
      Alert.alert(t('delete_failed'), t('delete_failed_body'));
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const emailValid =
    EMAIL.test(newEmail.trim()) &&
    newEmail.trim().toLowerCase() !== (user?.email ?? '').toLowerCase() &&
    !emailSaving;

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
            paddingBottom: insets.bottom + spacing.stackXl,
            gap: spacing.stackLg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The account, once. The address used to appear here and again in a
              pre-filled field below it — the same fact twice, disagreeing the
              moment either one was edited. */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('account')}</Txt>
            <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={styles.infoRow}>
                <Icon name="email" size={20} color={c.flameDeep} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyMed" numberOfLines={1}>{user?.email}</Txt>
                  <View style={styles.badgeRow}>
                    <Icon
                      name={verified ? 'verified' : 'error-outline'}
                      size={13}
                      color={verified ? c.good : c.flame}
                    />
                    <Txt variant="sub" color={verified ? c.good : c.flame}>
                      {verified ? t('email_verified_badge') : t('email_unverified_badge')}
                    </Txt>
                  </View>
                </View>
                {!emailOpen && (
                  <Pressable onPress={() => setEmailOpen(true)} hitSlop={8}>
                    <Txt variant="subMed" color={c.flameDeep}>{t('change')}</Txt>
                  </Pressable>
                )}
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

            {/* A change in flight is a state, not a moment — it survives closing
                the app, and it is the only place the new address is visible. */}
            {pendingEmail && (
              <Animated.View
                entering={FadeIn.duration(250)}
                style={[styles.pendingCard, { backgroundColor: c.surfaceAlt, borderColor: c.line }]}
              >
                <Icon name="schedule" size={18} color={c.flame} />
                <View style={{ flex: 1 }}>
                  <Txt variant="sub" numberOfLines={1}>{t('email_pending', { email: pendingEmail })}</Txt>
                  {pendingSince && (
                    <Txt variant="sub" color={c.faint}>{t('email_pending_sent', { when: pendingSince })}</Txt>
                  )}
                </View>
                <Pressable
                  onPress={handleResend}
                  hitSlop={8}
                  disabled={resendLeft > 0 || resending}
                  style={(resendLeft > 0 || resending) && { opacity: 0.45 }}
                >
                  <Txt variant="subMed" color={c.flameDeep}>
                    {resendLeft > 0 ? t('email_resend_in', { seconds: resendLeft }) : t('email_resend')}
                  </Txt>
                </Pressable>
              </Animated.View>
            )}

            {emailOpen && (
              <Animated.View
                entering={FadeInDown.duration(260)}
                exiting={FadeOut.duration(150)}
                style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}
              >
                <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('new_email')}</Txt>
                <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <Icon name="email" size={20} color={c.faint} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder={t('new_email_placeholder')}
                    placeholderTextColor={c.faint}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    autoFocus
                    editable={!emailSaving}
                  />
                </View>

                <Txt variant="sub" color={c.faint} style={{ marginLeft: 4 }}>{t('email_confirm_new')}</Txt>

                <FormError message={emailError} detail={emailDetail} diagnostics={emailDiag} />

                <View style={styles.actionRow}>
                  <Button
                    label={emailSaving ? t('saving') : t('send_confirmation')}
                    icon="mark-email-read"
                    small
                    disabled={!emailValid}
                    onPress={handleEmailChange}
                  />
                  <Button
                    label={t('cancel')}
                    variant="ghost"
                    small
                    disabled={emailSaving}
                    onPress={closeEmail}
                  />
                </View>
              </Animated.View>
            )}

            {!emailOpen && emailError && (
              <View style={{ marginTop: spacing.stackSm }}>
                <FormError message={emailError} detail={emailDetail} diagnostics={emailDiag} />
              </View>
            )}
          </Animated.View>

          {/* Closed until asked for. Nothing about the password is on screen
              while the screen is only being looked at. */}
          <Animated.View entering={FadeInDown.duration(400).delay(50)} style={{ gap: spacing.stackSm }}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('password')}</Txt>

            {!passwordOpen ? (
              <Pressable
                onPress={() => setPasswordOpen(true)}
                style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.line }]}
                accessibilityRole="button"
                accessibilityLabel={t('change_password')}
              >
                <View style={styles.infoRow}>
                  <Icon name="lock" size={20} color={c.flameDeep} />
                  <Txt variant="bodyMed" color={c.muted} style={{ flex: 1 }}>{t('password_hidden')}</Txt>
                  <Txt variant="subMed" color={c.flameDeep}>{t('change')}</Txt>
                </View>
              </Pressable>
            ) : (
              <Animated.View entering={FadeInDown.duration(260)} style={{ gap: spacing.stackMd }}>
                <View>
                  <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('current_password')}</Txt>
                  <PasswordField
                    value={current}
                    onChange={setCurrent}
                    placeholder={t('enter_current_password')}
                    purpose="current"
                    autoFocus
                    editable={!loading}
                  />
                  <Pressable onPress={forgot} hitSlop={8} style={styles.forgotLink}>
                    <Txt variant="sub" color={c.flameDeep}>{t('forgot_password_q')}</Txt>
                  </Pressable>
                </View>

                <View>
                  <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('new_password')}</Txt>
                  <PasswordField
                    value={password}
                    onChange={setPassword}
                    placeholder={t('enter_new_password')}
                    purpose="new"
                    showStrength
                    editable={!loading}
                  />
                </View>

                <View>
                  <Txt variant="sub" color={c.muted} style={styles.subLabel}>{t('confirm_new_password_label')}</Txt>
                  <PasswordField
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder={t('confirm_new_password')}
                    purpose="confirm"
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                </View>

                {/* The rules, as they are broken, rather than only on submit. */}
                {!error && liveProblem && (
                  <Txt variant="sub" color={c.muted} style={{ marginLeft: 4 }}>{liveProblem}</Txt>
                )}

                <FormError message={error} detail={errorDetail} diagnostics={errorDiag} />

                <View style={styles.actionRow}>
                  <Button
                    label={loading ? t('saving') : t('update_password')}
                    icon="shield"
                    small
                    disabled={loading || lockoutLeft > 0 || !current || !password || !confirmPassword}
                    onPress={handleSave}
                  />
                  <Button
                    label={t('cancel')}
                    variant="ghost"
                    small
                    disabled={loading}
                    onPress={closePassword}
                  />
                </View>
              </Animated.View>
            )}
          </Animated.View>

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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  infoDivider: { height: 1 },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: spacing.stackSm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
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
});
