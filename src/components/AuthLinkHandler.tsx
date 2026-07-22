import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRootNavigationState, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { handleAuthLink, isAuthLink } from '@/utils/authLinks';
import { showHeld } from '@/components/HeldNotice';

// Catches the link Supabase sends people back on after they confirm an email
// change, verify a new account, or reset a password. Hands it to the logic
// layer, which swaps the returned tokens in for the current session, then puts
// the person where the link was meant to take them.
//
// Mounted once near the root, beside NotificationSync. Without it, tapping the
// link opens the app and nothing else happens: the address changes on the server
// but the session in hand still carries the old one until the next refresh, and
// a password-reset link changes no password at all.
export function AuthLinkHandler() {
  const { t } = useTranslation();
  const router = useRouter();
  // Undefined until the root navigator has mounted. On a cold start the app is
  // still showing its loading spinner — no navigator, no Stack — while the link
  // is being read, and a replace() issued then is dropped on the floor.
  const rootState = useRootNavigationState();
  const navigatorReady = !!rootState?.key;

  const [destination, setDestination] = useState<Href | null>(null);

  useEffect(() => {
    let cancelled = false;

    const consume = async (url: string | null) => {
      // Deep links also arrive from notifications and from the OS restoring the
      // app. Those must fall straight through rather than be reported as a
      // failed confirmation.
      if (!url || cancelled || !isAuthLink(url)) return;

      const result = await handleAuthLink(url);
      if (cancelled) return;

      // Supabase words these for developers, not for the person holding the
      // phone, so only the fact of the failure is passed on.
      if (result.kind === 'error') {
        console.warn('Auth link rejected', result.message);
        showHeld(t('auth_link_failed'), t('auth_link_failed_detail'));
        setDestination('/home');
        return;
      }

      if (result.kind !== 'session') return;

      // A recovery link is only half the job: it proves who you are, and then
      // something has to actually ask for the new password. Without this the
      // route guard drops the person on the home screen and the reset they
      // asked for never happens.
      if (result.type === 'recovery') {
        setDestination('/settings/new-password');
        return;
      }

      if (result.type === 'email_change') {
        showHeld(t('email_updated'));
        setDestination('/settings/security');
        return;
      }

      showHeld(result.type === 'signup' ? t('email_verified') : t('signed_in'));
      setDestination('/home');
    };

    // A cold start opens through getInitialURL; a warm one arrives as an event.
    Linking.getInitialURL().then(consume);
    const sub = Linking.addEventListener('url', ({ url }) => consume(url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [t]);

  useEffect(() => {
    if (!destination || !navigatorReady) return;
    router.replace(destination);
    setDestination(null);
  }, [destination, navigatorReady, router]);

  return null;
}
