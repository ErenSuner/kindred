// What actually went wrong, in a form that survives a screenshot.
//
// @/utils/authErrors turns a failure into one sentence for the person reading
// it. That sentence is deliberately short, and short is exactly wrong when the
// sentence itself is the thing under suspicion: a working address reported as
// "not a valid email address" leaves nothing to go on, because the two facts
// that would settle it — what the server actually said, and what the app
// actually sent — are only ever seen by Sentry.
//
// So this module produces the other half: a block that can be read off a phone,
// copied, and pasted into a bug report. It is not translated. It is not written
// for the user; it is written for whoever has to fix it.

import { Platform } from 'react-native';
import { isOffline } from '@/utils/outbox';
import { authErrorCode, codeFromMessage } from '@/utils/authErrors';

// A character in a typed address that a mail server will refuse, described
// precisely enough that the person can find it: which character, where, and its
// Unicode codepoint — because the whole problem with these is that they look
// right.
//
// `index` is 1-based, for showing to a human.
export type CharProblem = {
  key: 'email_invisible_char' | 'email_char_problem';
  char: string;
  codepoint: string;
  index: number;
};

// Codepoints that occupy no width, so an address containing one looks identical
// to the same address without it. They arrive by copy-paste, out of a web page
// or another mail client, and nothing on screen will ever show them.
//
// Kept as numbers rather than string literals: pasted literally they would be
// invisible in this file too, and the next person to edit it would delete one
// by accident.
const INVISIBLE = new Set([
  0x00a0, // no-break space — .trim() takes it off the ends, not the middle
  0x200b, // zero-width space
  0x200c, // zero-width non-joiner
  0x200d, // zero-width joiner
  0x200e, // left-to-right mark
  0x200f, // right-to-left mark
  0x2060, // word joiner
  0xfeff, // byte-order mark
]);

function codepointOf(point: number): string {
  return `U+${point.toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * The first character in an address that a mail server will not accept, or null
 * if there isn't one.
 *
 * Checked before the request is sent, because a rejection from GoTrue for this
 * reason arrives as a generic "email_address_invalid" and sends the person off
 * retyping an address that looks, to them, perfectly correct.
 *
 * The Turkish case is the one that prompted this: a Turkish keyboard produces
 * `ı` where `i` was meant, and lowercasing `İ` yields `i` followed by a
 * combining dot (U+0307) that renders as an ordinary `i`. Both pass the app's
 * own format check — `[^\s@]+` matches any non-space — and both are rejected by
 * the server.
 */
export function inspectEmail(raw: string): CharProblem | null {
  // Iterated by codepoint rather than by code unit, so an emoji or any other
  // astral character is reported once, at its real position.
  const chars = Array.from(raw);

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const point = char.codePointAt(0) ?? 0;

    // Printable ASCII is the whole of what an address may safely contain here.
    // Internationalised addresses exist, but Supabase does not accept them, so
    // saying so plainly beats letting the server say it vaguely.
    if (point >= 0x20 && point <= 0x7e) continue;

    return {
      key: INVISIBLE.has(point) ? 'email_invisible_char' : 'email_char_problem',
      char,
      codepoint: codepointOf(point),
      index: i + 1,
    };
  }

  return null;
}

/**
 * A string with every non-printable and non-ASCII character written out as
 * `\uXXXX`.
 *
 * The point of the diagnostics block is that it cannot lie, and a raw address
 * printed into it would show `erın@…` as `erin@…` to anyone glancing at it —
 * hiding the one thing worth seeing.
 */
export function escapeInvisible(s: string): string {
  let out = '';
  for (const char of s) {
    const point = char.codePointAt(0) ?? 0;
    if (point >= 0x20 && point <= 0x7e) {
      out += char;
    } else if (point > 0xffff) {
      out += `\\u{${point.toString(16).toUpperCase()}}`;
    } else {
      out += `\\u${point.toString(16).toUpperCase().padStart(4, '0')}`;
    }
  }
  return out;
}

/**
 * The error code, and where it came from.
 *
 * `describeAuthError` falls back to matching GoTrue's English message when the
 * response carries no code, and the sentence it picks is indistinguishable from
 * one chosen by a real code. 'message' here means the app guessed — which is
 * worth knowing, because the guess can be wrong.
 */
export function resolveAuthCode(err: unknown): {
  code: string | null;
  source: 'server' | 'message' | null;
} {
  const fromServer = authErrorCode(err);
  if (fromServer) return { code: fromServer, source: 'server' };

  const guessed = codeFromMessage((err as { message?: string })?.message);
  if (guessed) return { code: guessed, source: 'message' };

  return { code: null, source: null };
}

export type DiagContext = {
  // What the user was doing — 'email_change', 'password_update', 'sign_in'.
  action: string;
  // The address the request carried, if any.
  email?: string | null;
  // The exact emailRedirectTo / redirectTo that was sent.
  redirect?: string | null;
};

// The project's hostname, which identifies it without exposing anything. The
// anon key is public but still has no business in a block people paste around,
// and it is never read here.
function projectHost(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return '(not set)';
  const match = /^https?:\/\/([^/]+)/.exec(url);
  return match ? match[1] : '(unparseable)';
}

/**
 * A copyable report of one auth failure.
 *
 * Null when there is nothing a report could add: no connection means the
 * request never reached a server, so there is no server answer to describe and
 * the first line already says everything true.
 */
export function authDiagnostics(err: unknown, ctx: DiagContext): string | null {
  if (isOffline(err)) return null;

  const e = err as { message?: unknown; name?: unknown; status?: unknown } | null;
  const { code, source } = resolveAuthCode(err);

  const lines: string[] = [
    'Kindred auth diagnostics',
    `when:      ${new Date().toISOString()}`,
    `action:    ${ctx.action}`,
    `platform:  ${Platform.OS}`,
    `project:   ${projectHost()}`,
  ];

  if (ctx.redirect) lines.push(`redirect:  ${ctx.redirect}`);

  if (ctx.email) {
    // The length comes from the codepoint count, not `.length`, so a combining
    // mark shows up as the extra character it is.
    lines.push(`email:     ${escapeInvisible(ctx.email)}  (len ${Array.from(ctx.email).length})`);
  }

  if (typeof e?.status === 'number') lines.push(`status:    ${e.status}`);
  lines.push(`code:      ${code ?? '(none)'}${source ? `  (source: ${source})` : ''}`);
  if (typeof e?.name === 'string') lines.push(`name:      ${e.name}`);
  lines.push(`message:   ${String(e?.message ?? err)}`);

  return lines.join('\n');
}
