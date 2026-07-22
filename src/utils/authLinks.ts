// Links that come back from Supabase — an email-change confirmation, a password
// reset — and what to do with them.
//
// The Supabase client is created with `detectSessionInUrl: false` (see
// src/lib/supabase.ts), which is right on a phone: there is no browser URL to
// watch. The cost is that the tokens Supabase appends when it redirects back
// have to be picked up by hand, which is what this does.
//
// The link Supabase sends points at its own /auth/v1/verify. That endpoint does
// the verifying and then redirects to whatever `emailRedirectTo` asked for,
// carrying the new session in the URL fragment:
//
//   kindred://auth/confirm#access_token=…&refresh_token=…&type=email_change
//
// or, when something went wrong:
//
//   kindred://auth/confirm#error=access_denied&error_description=Email+link…

import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// Where Supabase should send people back to. On a phone this is the app's own
// scheme; on web it is the origin the app is served from, so one call covers
// both without either being hardcoded.
//
// The collapse of `:///` to `://` is not cosmetic. A custom scheme has no host,
// so createURL builds `kindred:///auth/confirm` — three slashes, empty host.
// Supabase's redirect allowlist refuses to accept that form at all ("Please
// provide a valid URL"), which left the app sending a URL that could never be
// allowlisted and every confirmation email failing. `kindred://auth/confirm`
// parses as host `auth`, path `/confirm`; expo-router strips the scheme before
// matching either way, so both land on the same route.
//
// Only the scheme's own slashes are touched. `exp://10.0.0.2:8081/--/auth/confirm`
// and `https://host/auth/confirm` already have a host and pass through unchanged.
export function authRedirectUrl(): string {
  return Linking.createURL('/auth/confirm').replace(':///', '://');
}

export type AuthLinkResult =
  | { kind: 'session'; type: string | null }
  | { kind: 'error'; message: string }
  | { kind: 'ignored' };

// Both halves of the URL are worth reading: Supabase has used the fragment for
// tokens and the query string for errors at different times, and a link that
// has been through a mail client can arrive either way.
function paramsOf(url: string): URLSearchParams {
  const merged = new URLSearchParams();

  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';

  for (const part of [query, hash]) {
    if (!part) continue;
    for (const [key, value] of new URLSearchParams(part)) merged.set(key, value);
  }

  return merged;
}

// Whether a link is one of ours at all. Deep links also arrive from
// notifications and from the OS restoring the app, and those must fall straight
// through rather than being reported as a failed confirmation.
export function isAuthLink(url: string): boolean {
  if (!url) return false;
  const params = paramsOf(url);
  return (
    params.has('access_token') ||
    params.has('refresh_token') ||
    params.has('code') ||
    params.has('error') ||
    params.has('error_description') ||
    url.includes('/auth/confirm')
  );
}

export async function handleAuthLink(url: string): Promise<AuthLinkResult> {
  if (!url) return { kind: 'ignored' };

  const params = paramsOf(url);

  const errorDescription = params.get('error_description') ?? params.get('error');
  if (errorDescription) {
    return { kind: 'error', message: errorDescription.replace(/\+/g, ' ') };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { kind: 'error', message: error.message };

    return { kind: 'session', type: params.get('type') };
  }

  // The PKCE flow sends a one-time code in the query string instead of tokens
  // in the fragment. Supabase switches projects over to it, and a link that
  // arrives this way would otherwise be silently ignored — the app would open
  // on a spinner and never sign anyone in.
  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { kind: 'error', message: error.message };

    return { kind: 'session', type: params.get('type') };
  }

  return { kind: 'ignored' };
}
