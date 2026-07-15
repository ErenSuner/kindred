import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Literata_500Medium,
  Literata_600SemiBold,
} from '@expo-google-fonts/literata';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { colors } from '@/theme/tokens';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PeopleProvider } from '@/context/PeopleContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = (segments as any)[0] === '(auth)';
    const onIndex = (segments as any).length === 0 || (segments as any)[0] === 'index' || (segments as any)[0] === '';

    if (!user) {
      // Not logged in: send them to welcome screen if they attempt to view secure tabs
      if (!inAuthGroup && !onIndex) {
        router.replace('/');
      }
    } else {
      // Logged in: send them to home tab if they attempt to view welcome/auth
      if (inAuthGroup || onIndex) {
        router.replace('/home');
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="person/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="new-connection" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Literata_500Medium,
    Literata_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <PeopleProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </PeopleProvider>
    </AuthProvider>
  );
}
