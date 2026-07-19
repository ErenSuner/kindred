// Mock data standing in for a backend. Shapes match the Kindred screens.

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

// Seed data — only Eleanor ships as an example.
export const initialPeople: Person[] = [
  {
    id: 'eleanor',
    name: 'Eleanor',
    role: 'Grandmother',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    tags: ['Family', 'Local'],
    eventTitle: "Mom's Birthday",
    eventTag: 'Family',
    daysAway: 5,
    eventDate: 'Thursday, October 12th',
    countdown: {
      tag: 'Birthday',
      days: 14,
      title: "Eleanor's 85th Birthday",
      date: 'October 24th, 2024',
      progress: 0.8,
    },
    specialDays: [
      { id: 'd1', title: 'Birthday', date: 'October 24', icon: 'cake', accent: 'primary' },
      { id: 'd2', title: 'Grandparents Day', date: 'September 8', icon: 'volunteer-activism', accent: 'tertiary' },
    ],
    notes: [
      {
        id: 'n1',
        kind: 'Gift Idea',
        when: '2 days ago',
        body: 'Loves that specific brand of Earl Grey tea from the little shop downtown. Also mentioned wanting a new gardening trowel.',
      },
      {
        id: 'n2',
        kind: 'Memory',
        when: 'Last Month',
        body: 'Had a wonderful afternoon looking through old photo albums. Remember to scan the pictures from her 1970 trip to Italy.',
      },
    ],
  },
];

export const currentUser = {
  name: 'Sarah',
  email: 'sarah@example.com',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
};
