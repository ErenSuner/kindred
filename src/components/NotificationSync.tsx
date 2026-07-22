import { useEffect, useMemo, useState } from 'react';
import i18n from '@/lib/i18n';
import { usePeople } from '@/context/PeopleContext';
import { useEvents } from '@/context/EventsContext';
import { useBirthdays } from '@/context/BirthdaysContext';
import { useHolidays } from '@/context/HolidaysContext';
import { HOLIDAYS } from '@/data/holidays';
import { birthdaysAsPeople, syncNotifications } from '@/utils/notifications';

// syncNotifications cancels everything before rescheduling, so it needs people,
// the user's own events and the shared occasions together. Mounting this once
// under all three providers keeps that the only place reminders get scheduled
// from data changes.
export function NotificationSync() {
  const { people } = usePeople();
  const { events, routines } = useEvents();
  const { birthdays } = useBirthdays();
  const { enabledIds, loading } = useHolidays();

  const enabledHolidays = useMemo(() => HOLIDAYS.filter((h) => enabledIds.includes(h.id)), [enabledIds]);
  // Routines are kept in their own list for display, but they schedule through
  // the same path as everything else.
  const ownEvents = useMemo(() => [...events, ...routines], [events, routines]);
  // Standalone birthdays ride the people path as minimal synthetic Persons.
  const allPeople = useMemo(() => [...people, ...birthdaysAsPeople(birthdays)], [people, birthdays]);

  // Reminder text is written when it is scheduled, so everything already booked
  // is still in the old language after a switch. Rescheduling is the only way to
  // translate it.
  const [lang, setLang] = useState(i18n.language);
  useEffect(() => {
    const onChange = (next: string) => setLang(next);
    i18n.on('languageChanged', onChange);
    return () => i18n.off('languageChanged', onChange);
  }, []);

  useEffect(() => {
    // Holding off until the stored selection has loaded avoids scheduling the
    // defaults and then immediately cancelling them.
    if (loading) return;
    syncNotifications(allPeople, ownEvents, enabledHolidays);
  }, [allPeople, ownEvents, enabledHolidays, loading, lang]);

  return null;
}
