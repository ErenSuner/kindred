// What makes a password acceptable, and how strong it looks.
//
// This lives here rather than in the screens because four screens ask the same
// question — sign up, change password, reset password, and (for the strength
// bar) anywhere a new password is typed — and they must agree. A rule that only
// exists in one screen is a rule the other three quietly break.
//
// Nothing here trims. Trimming a password is a silent data change: the app
// validates the length of what was typed and then stores something shorter, so
// "abcdefg " passes an eight-character check and becomes a seven-character
// password the user can never type again.

import i18n from '@/lib/i18n';

// Supabase's own minimum is a project setting; keep the two in step.
export const PASSWORD_MIN = 8;

// bcrypt hashes at most 72 bytes and discards the rest without complaint. A
// longer password is not stronger, it is a password with an invisible cut in it
// — and pasting a 100-character phrase from a manager would produce a login
// that only works while the same manager pastes the same prefix.
export const PASSWORD_MAX = 72;

export type PasswordProblem =
  | 'too_short'
  | 'too_long'
  | 'whitespace_edges'
  | 'same_as_current'
  | 'looks_like_email'
  | 'no_match';

export type PasswordCheckOptions = {
  // When given, the confirmation field must match exactly.
  confirm?: string;
  // When given, the new password must differ from it.
  current?: string;
  // When given, the password must not be built out of the address.
  email?: string;
};

// Counted in bytes, not characters: bcrypt's limit is a byte limit, and an
// emoji or a Turkish "ğ" costs more than one.
export function passwordByteLength(pw: string): number {
  // encodeURIComponent escapes every non-ASCII byte as %XX, so counting the
  // escapes counts the bytes — available everywhere, no TextEncoder needed.
  let bytes = 0;
  for (const ch of pw) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

// A blunt strength read: length carries most of it, character variety the rest.
// 0-4, mapped to weak / medium / strong by the caller.
export function strength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

// The part of an address before the @, lowercased. Short local parts are
// ignored: forbidding "me" or "eren" inside a password would reject far more
// good passwords than bad ones.
function emailStem(email: string | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf('@');
  const local = (at === -1 ? email : email.slice(0, at)).toLowerCase().trim();
  return local.length >= 4 ? local : null;
}

// Every problem with a candidate password, in the order worth showing them.
// An empty array means it may be sent to the server — which may still reject it
// (a leaked password, a project minimum longer than ours); see
// `@/utils/authErrors`.
export function checkPassword(pw: string, opts: PasswordCheckOptions = {}): PasswordProblem[] {
  const problems: PasswordProblem[] = [];

  if (pw !== pw.trim()) problems.push('whitespace_edges');
  if (pw.length < PASSWORD_MIN) problems.push('too_short');
  if (passwordByteLength(pw) > PASSWORD_MAX) problems.push('too_long');

  const stem = emailStem(opts.email);
  if (stem && pw.toLowerCase().includes(stem)) problems.push('looks_like_email');

  if (opts.current !== undefined && opts.current !== '' && pw === opts.current) {
    problems.push('same_as_current');
  }

  if (opts.confirm !== undefined && pw !== opts.confirm) problems.push('no_match');

  return problems;
}

export function describePasswordProblem(problem: PasswordProblem): string {
  if (problem === 'too_short') return i18n.t('pw_problem_too_short', { count: PASSWORD_MIN });
  if (problem === 'too_long') return i18n.t('pw_problem_too_long', { count: PASSWORD_MAX });
  return i18n.t(`pw_problem_${problem}`);
}

// One sentence for the form, or null when there is nothing to say. Screens show
// the first problem rather than a list: a wall of red is read as "this is
// hopeless", one line is read as an instruction.
export function firstPasswordProblem(
  pw: string,
  opts: PasswordCheckOptions = {},
): string | null {
  const [problem] = checkPassword(pw, opts);
  return problem ? describePasswordProblem(problem) : null;
}
