import { useEffect } from 'react';
import { usePeople } from '@/context/PeopleContext';
import { useEvents } from '@/context/EventsContext';
import { syncNotifications } from '@/utils/notifications';

// syncNotifications cancels everything before rescheduling, so it needs people
// and the user's own events together. Mounting this once under both providers
// keeps that the only place reminders get scheduled from data changes.
export function NotificationSync() {
  const { people } = usePeople();
  const { events } = useEvents();

  useEffect(() => {
    syncNotifications(people, events);
  }, [people, events]);

  return null;
}
