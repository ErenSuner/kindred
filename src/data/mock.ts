// The shared domain type — the shape every Kindred screen and context speaks
// in. (Historically this held mock seed data, hence the filename.)

import type { Importance } from '@/utils/importance';

// A birthday: a name, a date, and how much warning it gets. The computed
// fields (date, daysAway, turningAge) are worked out from `originalDate` on
// read, so a list left open overnight still counts down correctly once it
// refreshes.
export type SimpleBirthday = {
  id: string;
  name: string;
  originalDate: string; // YYYY-MM-DD; year 1000 means the year was skipped
  importance: Importance;
  date: string; // display string for the next occurrence
  daysAway: number;
  // Absent when the year was skipped — there is no age to count.
  turningAge?: number;
};
