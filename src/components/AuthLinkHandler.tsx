import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { handleAuthLink } from '@/utils/authLinks';
import { showHeld } from '@/components/HeldNotice';

// Catches the link Supabase sends people back on after they confirm an email
// change or a password reset, and hands it to the logic layer, which swaps the
// returned tokens in for the current session.
//
// Mounted once near the root, beside NotificationSync. Without it, tapping the
// link opens the app and nothing else happens: the address changes on the
// server but the session in hand still carries the old one until the next
// refresh.
export function AuthLinkHandler() {
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    const consume = async (url: string | null) => {
      if (!url || cancelled) return;
      const result = await handleAuthLink(url);
      if (cancelled) return;

      // Supabase words these for developers, not for the person holding the
      // phone, so only the fact of the failure is passed on.
      if (result.kind === 'error') {
        console.warn('Auth link rejected', result.message);
        showHeld(t('auth_link_failed'), t('auth_link_failed_detail'));
        return;
      }

      if (result.kind === 'session') {
        showHeld(result.type === 'recovery' ? t('signed_in') : t('email_updated'));
      }
    };

    // A cold start opens through getInitialURL; a warm one arrives as an event.
    Linking.getInitialURL().then(consume);
    const sub = Linking.addEventListener('url', ({ url }) => consume(url));

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [t]);

  return null;
}
