// Turning a Supabase auth failure into something worth reading.
//
// `describeWriteError` (@/utils/loadError) only understands PostgREST — a schema
// mismatch or a dead connection. An `AuthApiError` carries neither of those, so
// every auth failure collapsed into "Could not save. Please try again.", and the
// one thing the user needed to know ("that address already belongs to an
// account") never reached them.
//
// The codes below come from the `ErrorCode` union in
// @supabase/auth-js/lib/error-codes — they are stable identifiers, unlike the
// English `message`, which is written for developers and changes between
// releases.

import i18n from '@/lib/i18n';
import { isOffline } from '@/utils/outbox';
import { describeWriteError } from '@/utils/loadError';

// Where the message will be shown, which decides how much it may admit.
//
// 'public'  — sign-in and sign-up, reachable by anyone. Must never confirm
//             whether an address has an account: "no such user" and "wrong
//             password" have to look identical, or the screen becomes a tool
//             for checking who is registered here.
// 'authed'  — settings screens, behind a session. The person already owns the
//             account, so plain answers cost nothing and save a lot of guessing.
export type AuthErrorTone = 'public' | 'authed';

type Coded = { code?: string; error_code?: string; status?: number; message?: string };

export function authErrorCode(err: unknown): string | null {
  const e = err as Coded | null;
  if (!e || typeof e !== 'object') return null;
  const code = e.code ?? e.error_code;
  return typeof code === 'string' && code.length > 0 ? code : null;
}

// Supabase attaches `reasons` to a weak-password rejection: 'pwned' when the
// password appears in a breach corpus, plus 'length' / 'characters' when the
// project's own rules were not met.
export function weakPasswordReasons(err: unknown): string[] {
  const reasons = (err as { reasons?: unknown })?.reasons;
  return Array.isArray(reasons) ? reasons.filter((r): r is string => typeof r === 'string') : [];
}

// Codes that mean the same thing to everyone, signed in or not.
const SHARED: Record<string, string> = {
  over_email_send_rate_limit: 'auth_err_rate_limit',
  over_request_rate_limit: 'auth_err_rate_limit',
  over_sms_send_rate_limit: 'auth_err_rate_limit',
  email_address_invalid: 'auth_err_email_invalid',
  // NOT the email one. `validation_failed` is GoTrue's generic "the request body
  // didn't validate" — it covers a rejected redirect URL, a malformed field, a
  // missing parameter. Mapping it to "that's not a valid email address" told
  // people their perfectly good Gmail address was broken.
  validation_failed: 'auth_err_request_rejected',
  email_address_not_authorized: 'auth_err_email_not_allowed',
  email_provider_disabled: 'auth_err_email_provider_disabled',
  signup_disabled: 'auth_err_signup_disabled',
  user_banned: 'auth_err_user_banned',
  session_expired: 'auth_err_session_expired',
  session_not_found: 'auth_err_session_expired',
  refresh_token_not_found: 'auth_err_session_expired',
  refresh_token_already_used: 'auth_err_session_expired',
  bad_jwt: 'auth_err_session_expired',
  no_authorization: 'auth_err_session_expired',
  otp_expired: 'auth_err_link_expired',
  flow_state_expired: 'auth_err_link_expired',
  flow_state_not_found: 'auth_err_link_expired',
  captcha_failed: 'auth_err_captcha',
  request_timeout: 'auth_err_timeout',
  unexpected_failure: 'auth_err_server',
};

// Codes whose honest answer would leak whether an account exists.
const AUTHED_ONLY: Record<string, string> = {
  email_exists: 'auth_err_email_taken',
  user_already_exists: 'auth_err_email_taken',
  identity_already_exists: 'auth_err_email_taken',
  same_password: 'auth_err_same_password',
  invalid_credentials: 'auth_err_current_password_wrong',
  user_not_found: 'auth_err_user_not_found',
  reauthentication_needed: 'auth_err_reauth_needed',
  reauthentication_not_valid: 'auth_err_reauth_invalid',
  email_not_confirmed: 'auth_err_email_not_confirmed',
};

const PUBLIC_ONLY: Record<string, string> = {
  // On a sign-in screen these two are deliberately the same sentence.
  invalid_credentials: 'auth_err_signin_failed',
  user_not_found: 'auth_err_signin_failed',
  // Not an enumeration leak: GoTrue checks the password before the confirmation
  // flag, so this only ever comes back to someone who already typed the right
  // password for that account.
  email_not_confirmed: 'auth_err_email_not_confirmed',
  // Sign-up is the one place a collision has to be said out loud, or the person
  // is stuck retyping an address that will never work. The screen pairs it with
  // a link to sign in instead.
  email_exists: 'auth_err_email_taken',
  user_already_exists: 'auth_err_email_taken',
  identity_already_exists: 'auth_err_email_taken',
};

// Whether the server rejected the redirect URL rather than anything the user
// typed. GoTrue reports this as a plain validation failure, so without this
// check it reads as "your email address is wrong" — which sends the user off
// retyping a good address while the actual fix is one line in the Supabase
// redirect allowlist.
export function isRedirectRejection(err: unknown): boolean {
  const message = String((err as Coded)?.message ?? '').toLowerCase();
  return message.includes('redirect');
}

// Older GoTrue releases answered some of these with a bare 4xx and no code.
// Matched on the English message only as a last resort, before the fallback.
function codeFromMessage(message: string | undefined): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'email_exists';
  if (m.includes('invalid login credentials')) return 'invalid_credentials';
  if (m.includes('email not confirmed')) return 'email_not_confirmed';
  if (m.includes('should be different from the old password')) return 'same_password';
  if (m.includes('password should be at least')) return 'weak_password';
  if (m.includes('for security purposes') || m.includes('rate limit')) return 'over_request_rate_limit';
  if (m.includes('unable to validate email address')) return 'email_address_invalid';
  return null;
}

/**
 * A sentence for the user, in their language, for any auth failure.
 *
 * `what` is the verb used by the generic fallback ("Could not save…") so an
 * unrecognised error still reads like it belongs to the button that was pressed.
 */
export function describeAuthError(err: unknown, tone: AuthErrorTone, what = 'save'): string {
  // No connection outranks everything: the request never reached Supabase, so
  // whatever code it might have returned is not the story.
  if (isOffline(err)) return describeWriteError(err, what);

  // Checked before the code table, because the code that carries it
  // (`validation_failed`) says nothing about what actually went wrong.
  if (isRedirectRejection(err)) return i18n.t('auth_err_bad_redirect');

  const code = authErrorCode(err) ?? codeFromMessage((err as Coded)?.message);

  if (code === 'weak_password') {
    const reasons = weakPasswordReasons(err);
    if (reasons.includes('pwned')) return i18n.t('auth_err_password_pwned');
    if (reasons.includes('length')) return i18n.t('auth_err_password_too_short');
    if (reasons.includes('characters')) return i18n.t('auth_err_password_variety');
    return i18n.t('auth_err_password_weak');
  }

  const table = tone === 'authed' ? AUTHED_ONLY : PUBLIC_ONLY;
  const key = (code && table[code]) ?? (code && SHARED[code]) ?? null;
  if (key) return i18n.t(key);

  // Nothing recognised. Fall back to the same wording every other failed write
  // in the app uses, rather than inventing a second vocabulary for auth.
  return describeWriteError(err, what);
}

/**
 * The identifier a server-side rejection came back with, phrased for showing
 * under the human sentence — "Code: validation_failed".
 *
 * Null when there is nothing worth showing: a dropped connection, or a problem
 * the app worked out for itself before sending anything. Those are already fully
 * explained by the first line.
 *
 * This exists because the first version of this file guessed wrong about what a
 * code meant, and there was no way to see that from the phone. A visible code
 * turns a second round of guessing into one screenshot.
 *
 * `redirectUrl` is passed in rather than imported so this module stays free of
 * the Supabase client; callers that send an emailRedirectTo should supply it,
 * because when the server rejects that URL the URL itself is the fix.
 */
export function authErrorDetail(err: unknown, redirectUrl?: string): string | null {
  if (isOffline(err)) return null;

  // The whole point of the redirect case is that the fix is a URL, so show the
  // one the app asked for rather than the code.
  if (isRedirectRejection(err) && redirectUrl) {
    return i18n.t('error_redirect_detail', { url: redirectUrl });
  }

  const code = authErrorCode(err) ?? codeFromMessage((err as Coded)?.message);
  if (code) return i18n.t('error_code', { code });

  const status = (err as Coded)?.status;
  return typeof status === 'number' ? i18n.t('error_code', { code: `HTTP ${status}` }) : null;
}
