// Date helpers shared by people's special days and the user's own events.

import { Recurrence, YEARLY } from '@/utils/recurrence';

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// A stored year of 1000 means the user skipped the year field.
export const SKIPPED_YEAR = 1000;

export function getOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export type Occurrence = {
  date: Date;
  daysAway: number;
  formattedDate: string;
  turningAge?: number;
};

type Anchor = { year: number; month: number; day: number }; // month is 1-12

function parseAnchor(dateStr: string): Anchor {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

// Adding months to the 31st has to land somewhere real: Jan 31 + 1 month is
// Feb 28/29, not Mar 3.
function addMonthsClamped(anchor: Anchor, monthsToAdd: number): Date {
  const total = anchor.month - 1 + monthsToAdd;
  const year = anchor.year + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(anchor.day, daysInMonth));
}

// The k-th occurrence, counting the anchor itself as k = 0.
function occurrenceAt(anchor: Anchor, recurrence: Recurrence, k: number): Date {
  switch (recurrence.unit) {
    case 'none':
      return new Date(anchor.year, anchor.month - 1, anchor.day);
    case 'week': {
      const d = new Date(anchor.year, anchor.month - 1, anchor.day);
      d.setDate(d.getDate() + 7 * recurrence.interval * k);
      return d;
    }
    case 'month':
      return addMonthsClamped(anchor, recurrence.interval * k);
    case 'year':
      return addMonthsClamped(anchor, 12 * recurrence.interval * k);
  }
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// Jump straight to roughly the right repetition instead of stepping from an
// anchor that may be decades old, then nudge to the exact first one due.
function firstIndexOnOrAfter(anchor: Anchor, recurrence: Recurrence, from: Date): number {
  if (recurrence.unit === 'none') return 0;

  const anchorDate = new Date(anchor.year, anchor.month - 1, anchor.day);
  let k = 0;

  if (recurrence.unit === 'week') {
    const stepMs = 7 * recurrence.interval * 24 * 60 * 60 * 1000;
    k = Math.floor((from.getTime() - anchorDate.getTime()) / stepMs);
  } else {
    const monthsPerStep = recurrence.unit === 'year' ? 12 * recurrence.interval : recurrence.interval;
    const monthsApart = (from.getFullYear() - anchor.year) * 12 + (from.getMonth() - (anchor.month - 1));
    k = Math.floor(monthsApart / monthsPerStep);
  }

  if (k < 0) k = 0;

  // The estimate can be off by one either way (clamped days, week alignment).
  let guard = 0;
  while (occurrenceAt(anchor, recurrence, k).getTime() < from.getTime() && guard++ < 64) k++;
  while (k > 0 && occurrenceAt(anchor, recurrence, k - 1).getTime() >= from.getTime() && guard++ < 64) k--;

  return k;
}

function resolveAnchor(dateStr: string, recurrence: Recurrence): Anchor {
  const anchor = parseAnchor(dateStr);
  // A repeating event with no year recorded is anchored to this year; a
  // one-time event keeps whatever year it was given.
  if (recurrence.unit !== 'none' && anchor.year <= SKIPPED_YEAR) {
    return { ...anchor, year: new Date().getFullYear() };
  }
  return anchor;
}

function describe(date: Date, anchorYear: number, recurrence: Recurrence): Occurrence {
  const today = startOfToday();
  const daysAway = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = `${MONTHS_FULL[date.getMonth()]} ${getOrdinal(date.getDate())}, ${date.getFullYear()}`;

  // Only a yearly cycle has an age to count.
  let turningAge: number | undefined = undefined;
  if (recurrence.unit === 'year' && anchorYear > SKIPPED_YEAR && !isNaN(anchorYear)) {
    turningAge = date.getFullYear() - anchorYear;
  }

  return { date, daysAway, formattedDate, turningAge };
}

// dateStr is 'YYYY-MM-DD'.
export function getNextOccurrence(dateStr: string, recurrence: Recurrence = YEARLY): Occurrence {
  const originalYear = parseAnchor(dateStr).year;
  const anchor = resolveAnchor(dateStr, recurrence);
  const today = startOfToday();
  const k = firstIndexOnOrAfter(anchor, recurrence, today);
  return describe(occurrenceAt(anchor, recurrence, k), originalYear, recurrence);
}

// The next `count` occurrences on or after `from`. A one-time event yields at
// most one. Used to schedule several notifications ahead for fast cycles, which
// would otherwise only ever have their very next occurrence booked.
export function getUpcomingOccurrences(dateStr: string, recurrence: Recurrence, count: number, from: Date = startOfToday()): Date[] {
  const anchor = resolveAnchor(dateStr, recurrence);
  const first = firstIndexOnOrAfter(anchor, recurrence, from);

  if (recurrence.unit === 'none') {
    const only = occurrenceAt(anchor, recurrence, 0);
    return only.getTime() >= from.getTime() ? [only] : [];
  }

  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(occurrenceAt(anchor, recurrence, first + i));
  }
  return out;
}
