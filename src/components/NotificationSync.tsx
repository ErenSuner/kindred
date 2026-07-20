import { useEffect, useMemo } from 'react';
import { usePeople } from '@/context/PeopleContext';
import { useEvents } from '@/context/EventsContext';
import { useBirthdays } from '@/context/BirthdaysContext';
import { useHolidays } from '@/context/HolidaysContext';
import { HOLIDAYS } from '@/data/holidays';
import { syncNotifications } from '@/utils/notifications';
import type { Person, SimpleBirthday } from '@/data/mock';
import { YEARLY } from '@/utils/recurrence';

// A standalone birthday carries no Person, but the birthday-reminder maths lives
// in the people collector. Dressing each one as a minimal Person with a single
// birthday special day lets it schedule through exactly the same path — birthday
// wording, turning age, yearly repeat — with nothing duplicated.
function asPerson(b: SimpleBirthday): Person {
  return {
    specialDays: [
      {
        id: b.id,
        title: 'Birthday',
        date: b.date,
        icon: 'cake',
        accent: 'tertiary',
        originalDate: b.originalDate,
        isBirthday: true,
        recurrence: YEARLY,
        nudges: b.nudges,
        turningAge: b.turningAge,
      },
    ],
    name: b.name,
  } as unknown as Person;
}

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
  const allPeople = useMemo(() => [...people, ...birthdays.map(asPerson)], [people, birthdays]);

  useEffect(() => {
    // Holding off until the stored selection has loaded avoids scheduling the
    // defaults and then immediately cancelling them.
    if (loading) return;
    syncNotifications(allPeople, ownEvents, enabledHolidays);
  }, [allPeople, ownEvents, enabledHolidays, loading]);

  return null;
}
