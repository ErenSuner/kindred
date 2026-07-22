import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  checkPassword,
  passwordByteLength,
  strength,
} from '@/utils/password';

describe('password length', () => {
  it('counts ASCII as one byte each', () => {
    expect(passwordByteLength('abcdefgh')).toBe(8);
  });

  it('counts a Turkish letter as more than one byte', () => {
    // "ğ" is two bytes in UTF-8 — the reason a 72-character password can still
    // be over bcrypt's 72-byte limit.
    expect(passwordByteLength('ğ')).toBe(2);
  });

  it('counts an emoji as four bytes', () => {
    expect(passwordByteLength('🔥')).toBe(4);
  });
});

describe('checkPassword', () => {
  it('accepts an ordinary strong password', () => {
    expect(checkPassword('Correct-Horse-9')).toEqual([]);
  });

  it('rejects anything under the minimum', () => {
    expect(checkPassword('a'.repeat(PASSWORD_MIN - 1))).toContain('too_short');
    expect(checkPassword('a'.repeat(PASSWORD_MIN))).not.toContain('too_short');
  });

  it('rejects anything over bcrypt s byte limit', () => {
    expect(checkPassword('a'.repeat(PASSWORD_MAX))).not.toContain('too_long');
    expect(checkPassword('a'.repeat(PASSWORD_MAX + 1))).toContain('too_long');
  });

  it('counts bytes, not characters, against the limit', () => {
    // 40 two-byte letters is 80 bytes but only 40 characters.
    expect(checkPassword('ğ'.repeat(40))).toContain('too_long');
  });

  it('flags edge whitespace instead of silently trimming it', () => {
    // The old code trimmed before saving but validated before trimming, so
    // this passed an eight-character check and stored seven.
    expect(checkPassword('abcdefg ')).toContain('whitespace_edges');
    expect(checkPassword(' abcdefgh')).toContain('whitespace_edges');
    expect(checkPassword('abc defgh')).not.toContain('whitespace_edges');
  });

  it('refuses a new password identical to the current one', () => {
    expect(checkPassword('Same-Pass-1', { current: 'Same-Pass-1' })).toContain('same_as_current');
    expect(checkPassword('Other-Pass-1', { current: 'Same-Pass-1' })).not.toContain('same_as_current');
  });

  it('ignores an empty current password', () => {
    expect(checkPassword('Any-Pass-12', { current: '' })).toEqual([]);
  });

  it('refuses a password built out of the address', () => {
    expect(checkPassword('erensuner2026', { email: 'erensuner@gmail.com' })).toContain('looks_like_email');
    expect(checkPassword('ERENSUNER2026', { email: 'erensuner@gmail.com' })).toContain('looks_like_email');
  });

  it('does not police short local parts', () => {
    // Forbidding "me" inside a password would reject far more good passwords
    // than bad ones.
    expect(checkPassword('somewhere-12', { email: 'me@gmail.com' })).toEqual([]);
  });

  it('reports a mismatched confirmation', () => {
    expect(checkPassword('Good-Pass-12', { confirm: 'Good-Pass-13' })).toEqual(['no_match']);
    expect(checkPassword('Good-Pass-12', { confirm: 'Good-Pass-12' })).toEqual([]);
  });

  it('reports every problem at once', () => {
    expect(checkPassword('short ', { confirm: 'other', current: 'short ' })).toEqual(
      expect.arrayContaining(['whitespace_edges', 'too_short', 'same_as_current', 'no_match']),
    );
  });
});

describe('strength', () => {
  it('is zero for nothing typed', () => {
    expect(strength('')).toBe(0);
  });

  it('climbs with length and variety', () => {
    expect(strength('abcdefgh')).toBe(1);
    expect(strength('abcdefghijkl')).toBe(2);
    expect(strength('Abcdefghijkl')).toBe(3);
    expect(strength('Abcdefghijk1')).toBe(4);
  });

  it('never exceeds four', () => {
    expect(strength('Abcdefghijkl1!@#$%^')).toBe(4);
  });
});
