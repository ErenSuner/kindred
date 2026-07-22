import { authRedirectUrl, handleAuthLink, isAuthLink } from '@/utils/authLinks';

// `mock`-prefixed so Jest allows the hoisted jest.mock() factories below to
// close over them. The factories only build wrappers, so these are initialised
// long before anything calls through.
const mockSetSession = jest.fn(async () => ({ error: null }));
const mockExchangeCode = jest.fn(async () => ({ error: null }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: (...args: unknown[]) => mockSetSession(...(args as [])),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCode(...(args as [])),
    },
  },
}));

jest.mock('expo-linking', () => ({
  // What the real createURL produces for a custom scheme: no host, so three
  // slashes. authRedirectUrl is expected to collapse them.
  createURL: (path: string) => `kindred://${path}`,
}));

const setSession = mockSetSession;
const exchangeCodeForSession = mockExchangeCode;

beforeEach(() => {
  setSession.mockClear();
  exchangeCodeForSession.mockClear();
});

describe('authRedirectUrl', () => {
  it('points at the route that actually exists', () => {
    // Nothing catches the link if this and src/app/auth/confirm.tsx disagree.
    expect(authRedirectUrl()).toContain('auth/confirm');
  });

  it('emits a form Supabase will accept into its allowlist', () => {
    // Supabase rejects the empty-host `kindred:///…` shape outright, so a URL
    // in that form can never be allowlisted and every confirmation email fails.
    expect(authRedirectUrl()).toBe('kindred://auth/confirm');
    expect(authRedirectUrl()).not.toContain(':///');
  });
});

describe('isAuthLink', () => {
  it('recognises a confirmation link', () => {
    expect(isAuthLink('kindred://auth/confirm#access_token=a&refresh_token=b')).toBe(true);
    expect(isAuthLink('kindred://auth/confirm?code=xyz')).toBe(true);
    expect(isAuthLink('kindred://auth/confirm#error=access_denied')).toBe(true);
  });

  it('lets an unrelated deep link through', () => {
    expect(isAuthLink('kindred://person/123')).toBe(false);
    expect(isAuthLink('')).toBe(false);
  });
});

describe('handleAuthLink — implicit flow', () => {
  it('swaps the tokens in the fragment for a session', async () => {
    const result = await handleAuthLink(
      'kindred://auth/confirm#access_token=aaa&refresh_token=bbb&type=email_change',
    );

    expect(setSession).toHaveBeenCalledWith({ access_token: 'aaa', refresh_token: 'bbb' });
    expect(result).toEqual({ kind: 'session', type: 'email_change' });
  });

  it('reads tokens from the query string too', async () => {
    // A link that has been through a mail client can arrive either way.
    const result = await handleAuthLink(
      'kindred://auth/confirm?access_token=aaa&refresh_token=bbb&type=recovery',
    );

    expect(result).toEqual({ kind: 'session', type: 'recovery' });
  });

  it('reports a rejected session rather than pretending it worked', async () => {
    setSession.mockResolvedValueOnce({ error: { message: 'Token expired' } } as never);

    const result = await handleAuthLink('kindred://auth/confirm#access_token=a&refresh_token=b');

    expect(result).toEqual({ kind: 'error', message: 'Token expired' });
  });
});

describe('handleAuthLink — PKCE flow', () => {
  it('exchanges a code for a session', async () => {
    const result = await handleAuthLink('kindred://auth/confirm?code=one-time&type=recovery');

    expect(exchangeCodeForSession).toHaveBeenCalledWith('one-time');
    expect(result).toEqual({ kind: 'session', type: 'recovery' });
  });

  it('reports a rejected exchange', async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'bad code' } } as never);

    const result = await handleAuthLink('kindred://auth/confirm?code=stale');

    expect(result).toEqual({ kind: 'error', message: 'bad code' });
  });
});

describe('handleAuthLink — everything else', () => {
  it('surfaces the error Supabase redirected back with', async () => {
    const result = await handleAuthLink(
      'kindred://auth/confirm#error=access_denied&error_description=Email+link+is+invalid',
    );

    expect(result).toEqual({ kind: 'error', message: 'Email link is invalid' });
    expect(setSession).not.toHaveBeenCalled();
  });

  it('ignores a link carrying nothing of ours', async () => {
    expect(await handleAuthLink('kindred://person/123')).toEqual({ kind: 'ignored' });
    expect(await handleAuthLink('')).toEqual({ kind: 'ignored' });
    expect(setSession).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('does not treat half a token pair as a session', async () => {
    expect(await handleAuthLink('kindred://auth/confirm#access_token=aaa')).toEqual({
      kind: 'ignored',
    });
    expect(setSession).not.toHaveBeenCalled();
  });
});
