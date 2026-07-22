import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import i18n from '../lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PeopleProvider } from '@/context/PeopleContext';
import { EventsProvider } from '@/context/EventsContext';
import { BirthdaysProvider } from '@/context/BirthdaysContext';
import { HolidaysProvider } from '@/context/HolidaysContext';
import { NotificationSync } from '@/components/NotificationSync';
import { AuthLinkHandler } from '@/components/AuthLinkHandler';
import { UndoProvider } from '@/context/UndoContext';
import { UndoSnackbar } from '@/components/UndoSnackbar';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { PendingWrites } from '@/components/PendingWrites';
import { HeldNotice } from '@/components/HeldNotice';
import { Sentry } from '@/lib/sentry';

import { Platform, LogBox } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications: Push notifications',
]);

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
  });
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const seg0 = (segments as any)[0];
    const inAuthGroup = seg0 === '(auth)';
    const onIndex = (segments as any).length === 0 || seg0 === 'index' || seg0 === '';

    // Where a link from an email lands. Nobody following one is signed in yet at
    // the moment it opens — the link is what creates the session — so this guard
    // has to stay out of the way in both directions: it used to throw the
    // signed-out arrival back to the welcome screen, and then, a beat later,
    // pull the now-signed-in one to home before <AuthLinkHandler> could send
    // them to the new-password screen they came for. The route redirects itself
    // once the link has been read.
    const onAuthLanding = seg0 === 'auth';
    // Reached only through a recovery link, which brings its own session.
    const onPasswordReset = seg0 === 'settings' && (segments as any)[1] === 'new-password';

    if (!user) {
      // Not logged in: send them to welcome screen if they attempt to view secure tabs
      if (!inAuthGroup && !onIndex && !onAuthLanding && !onPasswordReset) {
        router.replace('/');
      }
    } else {
      // Logged in: send them to home tab if they attempt to view welcome/auth
      if ((inAuthGroup || onIndex) && !onAuthLanding) {
        router.replace('/home');
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.flame} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/confirm" />
      <Stack.Screen name="settings/new-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/feedback" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="person/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="new-connection" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="import-contacts" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="my-event/add" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="my-event/edit/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="birthday/add" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="birthday/edit/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="birthday/person/[personId]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

function ThemedApp() {
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  // Some strings come from util funcs that read i18n.t at compute time and
  // aren't subscribed to language changes, so they stay stale until a remount.
  // Remount the screen subtree on language change (data providers stay intact).
  const [lang, setLang] = useState(i18n.language);
  useEffect(() => {
    const onChange = (lng: string) => setLang(lng);
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NotificationSync />
      <AuthLinkHandler />
      <RootLayoutNav key={lang} />
      <PendingWrites />
      <HeldNotice />
      <UndoSnackbar />

      {/* Android draws edge to edge from SDK 54 on, so the system navigation
          bar is transparent and the screen's own content scrolls underneath it.
          The platform APIs for colouring it are no-ops under edge-to-edge, so
          the strip is painted here — last, over everything, and untouchable.
          The tab bar clears it through its own bottom inset. */}
      {Platform.OS === 'android' && insets.bottom > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: insets.bottom,
            backgroundColor: '#000000',
          }}
        />
      )}
    </GestureHandlerRootView>
  );
}

function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    async function reqPerm() {
      if (Platform.OS === 'web') return;
      try {
        // Android 8+ ignores importance/sound unless a channel exists; without
        // one, scheduled reminders land on a silent default channel. Create it
        // before requesting permission so the very first notification uses it.
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('reminders', {
            name: 'Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            lightColor: '#EDA33D',
          });
        }
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        console.warn('Could not request notification permissions', e);
      }
    }
    reqPerm();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('app_language').then((lang) => {
      if (lang) {
        i18n.changeLanguage(lang);
      }
    });
  }, []);

  if (!loaded) return null;

  return (
    // Outside the providers, so a crash in any of them is caught too.
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <UndoProvider>
            <PeopleProvider>
              <EventsProvider>
                <BirthdaysProvider>
                  <HolidaysProvider>
                    <ThemedApp />
                  </HolidaysProvider>
                </BirthdaysProvider>
              </EventsProvider>
            </PeopleProvider>
          </UndoProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
