import { useEffect, useState } from 'react';
import i18n from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { useBirthdays } from '@/context/BirthdaysContext';
import { syncBirthdayNotifications } from '@/utils/notifications';
import { useNotificationPermission } from '@/utils/notificationPermission';

// syncBirthdayNotifications cancels everything before rescheduling, so it needs
// the whole list in one call. Mounting this once under the provider keeps that
// the only place reminders are scheduled from data changes.
export function NotificationSync() {
  const { loading: authLoading } = useAuth();
  const { birthdays, loading } = useBirthdays();

  // Permission is asked for at startup, on its own timeline, and can be given
  // or taken away in system settings long after that. The list does not change
  // when it happens, so without watching the status the sync that would finally
  // book the reminders never runs. The hook re-reads on every foreground.
  const { status } = useNotificationPermission();

  // Reminder text is written when it is scheduled, so everything already booked
  // is still in the old language after a switch. Rescheduling is the only way
  // to translate it.
  const [lang, setLang] = useState(i18n.language);
  useEffect(() => {
    const onChange = (next: string) => setLang(next);
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, []);

  useEffect(() => {
    // The list is empty before it is loaded, and an empty list means "cancel
    // everything". Syncing on the way up would wipe the schedule on every cold
    // start and rebuild it a moment later — fine until the app is killed, or
    // the load fails, in the gap.
    if (authLoading || loading) return;

    syncBirthdayNotifications(birthdays);
  }, [birthdays, loading, authLoading, lang, status]);

  return null;
}
