import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { useAuth } from '@/context/AuthContext';

// Where Supabase sends people back to after they open a link from their email.
//
// The work — reading the tokens out of the URL and swapping them for a session —
// belongs to <AuthLinkHandler>, which is mounted at the root and catches the URL
// on a cold start before any route exists. Consuming it here too would call
// setSession twice with the same one-time tokens, and the second call fails.
//
// So this screen exists for one reason: without a route at /auth/confirm,
// expo-router answers the deep link with its "Unmatched Route" screen, and the
// person who just tapped a confirmation link in their inbox sees an error page
// while the confirmation quietly succeeds behind it.
export default function AuthConfirm() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // AuthLinkHandler redirects on its own once it has read the link. This is
    // the backstop for everything else: a link that carried nothing usable, a
    // second tap on an already-spent link, the OS restoring the app onto this
    // route. Nobody should be left watching a spinner.
    const id = setTimeout(() => {
      router.replace(user ? '/home' : '/login');
    }, 2500);

    return () => clearTimeout(id);
  }, [user, loading, router]);

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <ActivityIndicator size="large" color={c.flame} />
      <Txt variant="body" color={c.muted} style={{ marginTop: spacing.stackMd }}>
        {t('confirming_link')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
});
