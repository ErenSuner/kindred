// Turns the rows Supabase returns into the Person shape the screens read.
//
// Kept out of the context on purpose: it is a pure function of one row, so it
// can be reasoned about — and tested — without a provider, a session or a
// network call anywhere in sight.

import type { Note, Person, Relationship } from '@/data/mock';
import { getNextOccurrence } from '@/utils/dates';
import { distributeNotes, mapDbNote } from '@/utils/notes';
import { YEARLY, parseRecurrence } from '@/utils/recurrence';
import { NO_UPCOMING_DAYS, deriveUpcoming } from '@/utils/upcoming';

export function mapDbPersonToPerson(dbPerson: any): Person {
  // Birthdays live in special_days alongside everything else, flagged by
  // is_birthday. A birthday is yearly by definition, so its stored recurrence is
  // ignored in favour of YEARLY — nothing in the UI lets you change it.
  const specialDays: any[] = (dbPerson.special_days || []).map((sd: any) => {
    const isBirthday = sd.is_birthday === true;
    const recurrence = isBirthday ? YEARLY : parseRecurrence(sd);
    const { formattedDate, daysAway, turningAge } = getNextOccurrence(sd.date, recurrence, isBirthday);
    return {
      id: sd.id,
      title: isBirthday ? 'Birthday' : sd.title,
      date: formattedDate,
      icon: isBirthday ? 'cake' : sd.icon || 'event',
      accent: isBirthday ? 'tertiary' : sd.accent || 'primary',
      originalDate: sd.date,
      createdAt: sd.created_at,
      daysAway,
      turningAge,
      nudges: sd.nudges || [],
      recurrence,
      isBirthday,
      // A birthday never expires; only a one-off date can.
      isExpired: !isBirthday && recurrence.unit === 'none' && daysAway < 0,
    };
  });

  // Screens still reach for `person.birthday`, so keep it as a view onto the
  // birthday row rather than a separate record.
  const birthdayDay = specialDays.find((d) => d.isBirthday);
  const birthday = birthdayDay
    ? { id: birthdayDay.id, date: birthdayDay.originalDate, nudges: birthdayDay.nudges }
    : undefined;

  const notes: Note[] = (dbPerson.notes || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((n: any) => mapDbNote(n));

  // Hand each note to the occasion it belongs to; the rest are general notes
  // about the person.
  const { byDay, general: generalNotes } = distributeNotes(notes, specialDays);
  for (const day of specialDays) {
    const mine = byDay.get(day.id) ?? [];
    // A memory of last year shouldn't appear as a plan for next year — and the
    // day's editor must not be able to overwrite it.
    day.notes = mine.filter((n) => !n.occurredOn);
    day.memories = mine.filter((n) => n.occurredOn);
  }

  const returnedSpecialDays = specialDays.length > 0 ? [...specialDays].sort((a: any, b: any) => {
    return (a.daysAway ?? NO_UPCOMING_DAYS) - (b.daysAway ?? NO_UPCOMING_DAYS);
  }) : specialDays;

  return {
    id: dbPerson.id,
    name: dbPerson.name,
    role: dbPerson.role,
    avatar: dbPerson.avatar_url || undefined,
    initials: dbPerson.name.charAt(0).toUpperCase(),
    tags: [dbPerson.role],
    ...deriveUpcoming(dbPerson.name, dbPerson.role as Relationship, returnedSpecialDays),
    specialDays: returnedSpecialDays,
    birthday,
    notes: generalNotes,
    isPinned: dbPerson.is_pinned || false,
    contactId: dbPerson.contact_id || undefined,
  };
}
