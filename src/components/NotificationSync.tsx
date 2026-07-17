import { useEffect, useMemo } from 'react';
import { usePeople } from '@/context/PeopleContext';
import { useEvents } from '@/context/EventsContext';
import { useHolidays } from '@/context/HolidaysContext';
import { HOLIDAYS } from '@/data/holidays';
import { syncNotifications } from '@/utils/notifications';

// syncNotifications cancels everything before rescheduling, so it needs people,
// the user's own events and the shared occasions together. Mounting this once
// under all three providers keeps that the only place reminders get scheduled
// from data changes.
export function NotificationSync() {
  const { people } = usePeople();
  const { events } = useEvents();
  const { enabledIds, loading } = useHolidays();

  const enabledHolidays = useMemo(() => HOLIDAYS.filter((h) => enabledIds.includes(h.id)), [enabledIds]);

  useEffect(() => {
    // Holding off until the stored selection has loaded avoids scheduling the
    // defaults and then immediately cancelling them.
    if (loading) return;
    syncNotifications(people, events, enabledHolidays);
  }, [people, events, enabledHolidays, loading]);

  return null;
}
