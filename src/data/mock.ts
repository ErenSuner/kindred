// The shared domain types — the shapes every Kindred screen and context speaks
// in. (Historically this also held mock seed data, hence the filename.)

import type { Recurrence } from '@/utils/recurrence';
import type { Weekday } from '@/utils/routines';
import type { TimeOfDay } from '@/utils/eventTime';

export type Relationship = 'Family' | 'Friend' | 'Partner' | 'Colleague' | 'Acquaintance';

export type SpecialDay = {
  id: string;
  title: string;
  date: string; // display string
  icon: string; // MaterialIcons name
  accent: 'primary' | 'tertiary' | 'secondary';
  originalDate?: string; // e.g. YYYY-MM-DD
  // When this day was added to Kindred. Anything before it was never actually
  // tracked, so history must not claim it happened.
  createdAt?: string;
  daysAway?: number;
  turningAge?: number;
  nudges?: any[];
  // Standing notes — plans and ideas for the next time this comes round.
  notes?: Note[];
  // Notes tied to a past occurrence: what actually happened that year.
  memories?: Note[];
  isBirthday?: boolean;
  recurrence?: Recurrence;
  isExpired?: boolean;
};

export type Note = {
  id: string;
  kind: string; // e.g. "Gift Idea", "Memory"
  when: string;
  body: string;
  // Set when the note belongs to one occasion rather than to the person as a
  // whole. Birthdays are special days, so they use this too.
  specialDayId?: string;
  // Set when the note records what happened on one particular occurrence
  // rather than being a standing note. Stored as YYYY-MM-DD.
  occurredOn?: string;
  // Set when the note is a photo. A memory is a picture with an optional
  // caption in `body`.
  photoUrl?: string;
  // Set when a gift idea has been bought. Kept rather than deleted so last
  // year's presents are still answerable.
  doneAt?: string;
};

// An event the user keeps for themselves — no person attached.
export type MyEvent = {
  id: string;
  title: string;
  date: string; // display string
  originalDate: string; // YYYY-MM-DD
  icon: string; // MaterialIcons name
  accent: 'primary' | 'tertiary' | 'secondary';
  daysAway: number;
  turningAge?: number;
  nudges: string[];
  recurrence: Recurrence;
  isExpired?: boolean;
  // A routine happens on the same weekdays every week rather than on a date.
  // When this is non-empty the event is a routine and `recurrence` is ignored.
  weekdays?: Weekday[];
  // The time the event itself happens, as opposed to when its reminders arrive.
  // Absent for anything that is a day rather than a moment.
  timeOfDay?: TimeOfDay | null;
};

// A birthday saved with no person attached — just a name and a date. The light
// alternative to adopting someone as a full Person. Computed fields (date,
// daysAway, turningAge) are worked out from `originalDate` on read.
export type SimpleBirthday = {
  id: string;
  name: string;
  originalDate: string; // YYYY-MM-DD; year 1000 means the year was skipped
  emoji: string;
  nudges: string[];
  date: string; // display string for the next occurrence
  daysAway: number;
  turningAge?: number;
};

export type Person = {
  id: string;
  name: string;
  role: string; // e.g. "Grandmother"
  avatar?: string;
  initials?: string;
  tags: string[];
  eventTitle: string; // headline upcoming event
  eventTag: Relationship;
  daysAway: number;
  eventDate: string; // display
  countdown?: {
    tag: string;
    days: number;
    title: string;
    date: string;
    progress: number; // 0..1
    isBirthday?: boolean;
    turningAge?: number;
  };
  specialDays?: SpecialDay[];
  // One-off dates that have already passed. Kept rather than deleted so there
  // is something to look back on.
  pastDays?: SpecialDay[];
  birthday?: { id: string; date: string; nudges: any[] };
  notes?: Note[];
  isPinned?: boolean;
  // The address-book entry this person was imported from, when there was one.
  // Only ever handed back to the OS to open its own Contacts app.
  contactId?: string;
};
