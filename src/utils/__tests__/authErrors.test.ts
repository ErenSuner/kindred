import i18n from '@/lib/i18n';
import {
  authErrorCode,
  authErrorDetail,
  describeAuthError,
  isRedirectRejection,
  weakPasswordReasons,
} from '@/utils/authErrors';

// Shaped like the AuthApiError @supabase/auth-js throws: a stable `code`, a
// status, and an English message written for developers.
function authError(code: string, message = 'developer wording', status = 400) {
  return Object.assign(new Error(message), { code, status, name: 'AuthApiError' });
}

describe('authErrorCode', () => {
  it('reads the modern code field', () => {
    expect(authErrorCode(authError('email_exists'))).toBe('email_exists');
  });

  it('reads the older error_code field', () => {
    expect(authErrorCode({ error_code: 'same_password' })).toBe('same_password');
  });

  it('is null for anything without one', () => {
    expect(authErrorCode(new Error('boom'))).toBeNull();
    expect(authErrorCode(null)).toBeNull();
    expect(authErrorCode('nope')).toBeNull();
  });
});

describe('weakPasswordReasons', () => {
  it('returns the reasons Supabase attached', () => {
    const err = Object.assign(authError('weak_password'), { reasons: ['pwned', 'length'] });
    expect(weakPasswordReasons(err)).toEqual(['pwned', 'length']);
  });

  it('is empty when there are none', () => {
    expect(weakPasswordReasons(authError('weak_password'))).toEqual([]);
  });
});

describe('describeAuthError — signed in', () => {
  it('says plainly that the address is taken', () => {
    expect(describeAuthError(authError('email_exists'), 'authed')).toBe(
      i18n.t('auth_err_email_taken'),
    );
  });

  it('names a reused password', () => {
    expect(describeAuthError(authError('same_password'), 'authed')).toBe(
      i18n.t('auth_err_same_password'),
    );
  });

  it('reads a rejected re-auth as a wrong current password', () => {
    expect(describeAuthError(authError('invalid_credentials'), 'authed')).toBe(
      i18n.t('auth_err_current_password_wrong'),
    );
  });

  it('separates a rate limit from a wrong password', () => {
    expect(describeAuthError(authError('over_email_send_rate_limit'), 'authed')).toBe(
      i18n.t('auth_err_rate_limit'),
    );
    expect(describeAuthError(authError('over_email_send_rate_limit'), 'authed')).not.toBe(
      describeAuthError(authError('invalid_credentials'), 'authed'),
    );
  });

  it('sends an expired session back to sign in', () => {
    expect(describeAuthError(authError('session_expired'), 'authed')).toBe(
      i18n.t('auth_err_session_expired'),
    );
  });
});

describe('describeAuthError — public screens', () => {
  it('gives the same answer whether the account exists or the password is wrong', () => {
    const noSuchUser = describeAuthError(authError('user_not_found'), 'public');
    const wrongPassword = describeAuthError(authError('invalid_credentials'), 'public');
    expect(noSuchUser).toBe(wrongPassword);
    expect(noSuchUser).toBe(i18n.t('auth_err_signin_failed'));
  });

  it('never leaks the signed-in wording for a wrong password', () => {
    expect(describeAuthError(authError('invalid_credentials'), 'public')).not.toBe(
      i18n.t('auth_err_current_password_wrong'),
    );
  });

  it('still tells a new sign-up that the address is taken', () => {
    // Sign-up is the one screen where hiding the collision leaves the person
    // retyping an address that will never work.
    expect(describeAuthError(authError('user_already_exists'), 'public')).toBe(
      i18n.t('auth_err_email_taken'),
    );
  });
});

describe('describeAuthError — weak passwords', () => {
  it('calls out a breached password', () => {
    const err = Object.assign(authError('weak_password'), { reasons: ['pwned'] });
    expect(describeAuthError(err, 'authed')).toBe(i18n.t('auth_err_password_pwned'));
  });

  it('falls back to a general weakness when no reason is given', () => {
    expect(describeAuthError(authError('weak_password'), 'authed')).toBe(
      i18n.t('auth_err_password_weak'),
    );
  });
});

describe('describeAuthError — no code', () => {
  it('reads older releases that only sent an English message', () => {
    const legacy = Object.assign(new Error('User already registered'), { status: 422 });
    expect(describeAuthError(legacy, 'authed')).toBe(i18n.t('auth_err_email_taken'));
  });

  it('falls back to the app-wide write wording for anything unrecognised', () => {
    expect(describeAuthError(new Error('something new'), 'authed')).toBe(
      'Could not save. Please try again.',
    );
  });

  it('uses the verb it was given in the fallback', () => {
    expect(describeAuthError(new Error('something new'), 'public', 'sign you in')).toBe(
      'Could not sign you in. Please try again.',
    );
  });
});

describe('describeAuthError — offline', () => {
  it('outranks any code, because the request never reached the server', () => {
    const offline = Object.assign(new TypeError('Network request failed'), {
      code: 'email_exists',
    });
    expect(describeAuthError(offline, 'authed')).toContain('offline');
  });
});

describe('describeAuthError — validation_failed is not an email verdict', () => {
  it('never claims the address is invalid', () => {
    // This mapping is what told someone their working Gmail address was
    // malformed. validation_failed is GoTrue's generic body-rejection code.
    const err = authError('validation_failed', 'some field failed', 422);
    expect(describeAuthError(err, 'authed')).not.toBe(i18n.t('auth_err_email_invalid'));
    expect(describeAuthError(err, 'authed')).toBe(i18n.t('auth_err_request_rejected'));
  });

  it('still calls a genuinely invalid address invalid', () => {
    expect(describeAuthError(authError('email_address_invalid'), 'authed')).toBe(
      i18n.t('auth_err_email_invalid'),
    );
  });
});

describe('redirect rejections', () => {
  const rejected = authError('validation_failed', 'Invalid Redirect: kindred:///auth/confirm', 400);

  it('is recognised from the message', () => {
    expect(isRedirectRejection(rejected)).toBe(true);
    expect(isRedirectRejection(authError('validation_failed', 'something else'))).toBe(false);
  });

  it('blames the configuration, not the address', () => {
    expect(describeAuthError(rejected, 'authed')).toBe(i18n.t('auth_err_bad_redirect'));
  });

  it('shows the URL to allowlist, when the caller supplies it', () => {
    expect(authErrorDetail(rejected, 'kindred:///auth/confirm')).toContain('kindred:///auth/confirm');
  });

  it('falls back to the code when no URL was supplied', () => {
    expect(authErrorDetail(rejected)).toBe(i18n.t('error_code', { code: 'validation_failed' }));
  });
});

describe('authErrorDetail', () => {
  it('carries the server code', () => {
    expect(authErrorDetail(authError('email_exists'))).toBe(
      i18n.t('error_code', { code: 'email_exists' }),
    );
  });

  it('falls back to the HTTP status when there is no code', () => {
    expect(authErrorDetail({ status: 422, message: 'nothing familiar' })).toBe(
      i18n.t('error_code', { code: 'HTTP 422' }),
    );
  });

  it('says nothing when the request never left the phone', () => {
    expect(authErrorDetail(new TypeError('Network request failed'))).toBeNull();
  });

  it('says nothing for an error carrying neither code nor status', () => {
    expect(authErrorDetail(new Error('plain'))).toBeNull();
  });
});
