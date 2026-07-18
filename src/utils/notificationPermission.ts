import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

// Reminders are the whole point of the app, so a denied permission has to be
// visible somewhere — otherwise someone sets up a dozen nudges, none arrive, and
// nothing ever explains why.
export function useNotificationPermission() {
  const [status, setStatus] = useState<PermissionState>('unknown');

  const check = useCallback(async () => {
    if (Platform.OS === 'web') {
      setStatus('unsupported');
      return;
    }
    try {
      const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
      setStatus(granted ? 'granted' : canAskAgain ? 'denied' : 'denied');
    } catch (e) {
      console.warn('Could not read notification permission', e);
      setStatus('unknown');
    }
  }, []);

  useEffect(() => {
    check();

    // Permission is usually changed outside the app, in system settings, so the
    // status is re-read whenever the app comes back to the foreground.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  // Asks in-app if the OS still allows it; otherwise the only route is Settings.
  const request = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const { canAskAgain } = await Notifications.getPermissionsAsync();
      if (canAskAgain) {
        await Notifications.requestPermissionsAsync();
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      console.warn('Could not request notification permission', e);
    } finally {
      check();
    }
  }, [check]);

  return { status, request, refresh: check };
}
