// Every problem character in this file is written as a `\uXXXX` escape, never
// pasted literally. Pasted, they would be invisible here too, and the next
// person to edit the file would delete one without noticing — which is the same
// failure the module itself exists to catch.

import {
  authDiagnostics,
  escapeInvisible,
  inspectEmail,
  resolveAuthCode,
} from '@/utils/authDiagnostics';

describe('inspectEmail', () => {
  it('lets an ordinary address through', () => {
    expect(inspectEmail('eren@gmail.com')).toBeNull();
    expect(inspectEmail('eren.suner+kindred@example.co.uk')).toBeNull();
    expect(inspectEmail('')).toBeNull();
  });

  it('catches the dotless i a Turkish keyboard produces', () => {
    // 'erın@gmail.com' — indistinguishable from 'erin@…' at a glance, and
    // rejected by the server as a malformed address.
    const problem = inspectEmail('erın@gmail.com');

    expect(problem).toEqual({
      key: 'email_char_problem',
      char: 'ı',
      codepoint: 'U+0131',
      index: 3,
    });
  });

  it('catches the combining dot left behind by lowercasing İ', () => {
    // 'i' + U+0307 renders as a plain 'i'. Nothing on screen shows the second
    // character; only the length gives it away.
    const problem = inspectEmail('eri̇n@gmail.com');

    expect(problem?.key).toBe('email_char_problem');
    expect(problem?.codepoint).toBe('U+0307');
    expect(problem?.index).toBe(4);
  });

  it('names an invisible character as invisible rather than as a typo', () => {
    // Retyping by hand fixes this one; retyping the same paste does not, which
    // is why the two cases get different sentences.
    expect(inspectEmail('eren​@gmail.com')?.key).toBe('email_invisible_char');
    expect(inspectEmail('eren﻿@gmail.com')?.key).toBe('email_invisible_char');
  });

  it('catches a no-break space inside the address', () => {
    // .trim() takes one off either end but cannot touch this, and it is exactly
    // what a copied address from a web page tends to carry.
    const problem = inspectEmail('eren suner@gmail.com');

    expect(problem).toEqual({
      key: 'email_invisible_char',
      char: ' ',
      codepoint: 'U+00A0',
      index: 5,
    });
  });

  it('counts in characters, not code units', () => {
    // An emoji is one character but two code units, and reading it as two would
    // report half a surrogate pair — a codepoint that means nothing — and put
    // every position after it out by one.
    expect(inspectEmail('a\u{1F600}b@x.com')).toEqual({
      key: 'email_char_problem',
      char: '\u{1F600}',
      codepoint: 'U+1F600',
      index: 2,
    });
  });
});

describe('escapeInvisible', () => {
  it('leaves printable ASCII exactly as it was', () => {
    expect(escapeInvisible('eren@gmail.com')).toBe('eren@gmail.com');
  });

  it('spells out what a screenshot would otherwise hide', () => {
    expect(escapeInvisible('erın@gmail.com')).toBe('er\\u0131n@gmail.com');
    expect(escapeInvisible('eren​@x.com')).toBe('eren\\u200B@x.com');
  });

  it('handles characters outside the basic plane', () => {
    expect(escapeInvisible('\u{1F600}')).toBe('\\u{1F600}');
  });
});

describe('resolveAuthCode', () => {
  it('marks a code the server actually sent', () => {
    expect(resolveAuthCode({ code: 'email_exists' })).toEqual({
      code: 'email_exists',
      source: 'server',
    });
  });

  it('marks a code the app guessed from the English message', () => {
    // This is the distinction the whole module exists for: on screen these two
    // are the same string, and only one of them is evidence.
    expect(resolveAuthCode({ message: 'Unable to validate email address: invalid format' })).toEqual(
      { code: 'email_address_invalid', source: 'message' },
    );
  });

  it('admits when it knows nothing', () => {
    expect(resolveAuthCode({ message: 'something nobody has seen before' })).toEqual({
      code: null,
      source: null,
    });
  });
});

describe('authDiagnostics', () => {
  const err = {
    name: 'AuthApiError',
    status: 422,
    message: 'Unable to validate email address: invalid format',
  };

  it('reports what was sent alongside what came back', () => {
    const report = authDiagnostics(err, {
      action: 'email_change',
      email: 'erın@gmail.com',
      redirect: 'http://localhost:8081/auth/confirm',
    });

    expect(report).toContain('action:    email_change');
    expect(report).toContain('redirect:  http://localhost:8081/auth/confirm');
    // Escaped, so the report cannot show a clean address for a dirty one.
    expect(report).toContain('er\\u0131n@gmail.com');
    expect(report).toContain('status:    422');
    expect(report).toContain('Unable to validate email address');
  });

  it('says where the code came from', () => {
    const guessed = authDiagnostics(err, { action: 'email_change' });
    expect(guessed).toContain('(source: message)');

    const sent = authDiagnostics({ ...err, code: 'email_address_invalid' }, { action: 'x' });
    expect(sent).toContain('(source: server)');
  });

  it('stays quiet when the request never reached a server', () => {
    // Nothing to report: no code, no status, and the offline sentence already
    // says everything true.
    expect(authDiagnostics(new TypeError('Network request failed'), { action: 'x' })).toBeNull();
  });

  it('never carries the anon key', () => {
    const report = authDiagnostics(err, { action: 'email_change' }) ?? '';

    expect(report).not.toContain(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'no-key-set');
  });
});
