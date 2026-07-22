// Date helpers shared by people's special days and the user's own events.

import { Recurrence, YEARLY } from '@/utils/recurrence';
import type { TimeOfDay } from '@/utils/eventTime';
import * as Localization from 'expo-localization';
import i18n from '@/lib/i18n';

// A stored year of 1000 means the user skipped the year field.
export const SKIPPED_YEAR = 1000;

export function getOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// A long date, written the way the current language does it: English keeps the
// ordinal ("August 3rd, 2026"); Turkish has no ordinals and leads with the day
// ("3 Ağustos 2026").
function formatLongDate(date: Date): string {
  const month = i18n.t(`month_${date.getMonth()}`);
  const day = date.getDate();
  const year = date.getFullYear();
  if (i18n.language === 'tr') return `${day} ${month} ${year}`;
  return `${month} ${getOrdinal(day)}, ${year}`;
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
    case 'day':
    case 'week': {
      const daysPerStep = recurrence.unit === 'week' ? 7 : 1;
      const d = new Date(anchor.year, anchor.month - 1, anchor.day);
      d.setDate(d.getDate() + daysPerStep * recurrence.interval * k);
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

  if (recurrence.unit === 'week' || recurrence.unit === 'day') {
    const daysPerStep = recurrence.unit === 'week' ? 7 : 1;
    const stepMs = daysPerStep * recurrence.interval * 24 * 60 * 60 * 1000;
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

function describe(date: Date, anchorYear: number, recurrence: Recurrence, countsAge: boolean): Occurrence {
  const today = startOfToday();
  const daysAway = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = formatLongDate(date);

  // Only a birthday has an age to count. Every other yearly day used to get one
  // too, which is where "Anniversary (Turning 1)" came from.
  let turningAge: number | undefined = undefined;
  if (countsAge && recurrence.unit === 'year' && anchorYear > SKIPPED_YEAR && !isNaN(anchorYear)) {
    turningAge = date.getFullYear() - anchorYear;
  }

  return { date, daysAway, formattedDate, turningAge };
}

// dateStr is 'YYYY-MM-DD'. `countsAge` is for birthdays — nothing else counts
// years since the anchor.
export function getNextOccurrence(dateStr: string, recurrence: Recurrence = YEARLY, countsAge = false): Occurrence {
  const originalYear = parseAnchor(dateStr).year;
  const anchor = resolveAnchor(dateStr, recurrence);
  const today = startOfToday();
  const k = firstIndexOnOrAfter(anchor, recurrence, today);
  return describe(occurrenceAt(anchor, recurrence, k), originalYear, recurrence, countsAge);
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

// The most recent `count` occurrences strictly before `from`, newest first.
// Never reaches back past the anchor itself: a birthday recorded with the year
// 1990 has no occurrences in 1989.
export function getPastOccurrences(dateStr: string, recurrence: Recurrence, count: number, from: Date = startOfToday()): Date[] {
  const anchor = resolveAnchor(dateStr, recurrence);

  if (recurrence.unit === 'none') {
    const only = occurrenceAt(anchor, recurrence, 0);
    return only.getTime() < from.getTime() ? [only] : [];
  }

  // firstIndexOnOrAfter lands on the next one due, so everything below it is past.
  const next = firstIndexOnOrAfter(anchor, recurrence, from);

  const out: Date[] = [];
  for (let k = next - 1; k >= 0 && out.length < count; k--) {
    out.push(occurrenceAt(anchor, recurrence, k));
  }
  return out;
}

// Formats a date the way the rest of the app writes them.
export function formatOccurrenceDate(date: Date): string {
  return formatLongDate(date);
}

// Which clock this phone writes: 18:00 or 6:00 PM. It is the device's own
// setting, not the app's language — someone reading Kindred in English in
// Ankara still has a 24-hour phone, and a Turkish speaker in Chicago does not.
// Language is only the fallback for platforms that don't report it (the web
// build, on browsers without Intl's hourCycle).
//
// Read once: changing the region on iOS or Android restarts the app anyway.
let clockPref: boolean | null | undefined;

function uses24HourClock(): boolean {
  if (clockPref === undefined) {
    try {
      clockPref = Localization.getCalendars()[0]?.uses24hourClock ?? null;
    } catch {
      clockPref = null;
    }
  }
  return clockPref ?? i18n.language === 'tr';
}

// A wall-clock time, written the way this phone writes one.
//
// `formatTimeOfDay` in @/utils/eventTime stays 24-hour on purpose — that is the
// shape the database and the notification payloads speak. This one is for
// anything a person reads.
export function formatClock(time: TimeOfDay | null | undefined): string {
  if (!time) return '';
  const minute = String(time.minute).padStart(2, '0');
  if (uses24HourClock()) return `${String(time.hour).padStart(2, '0')}:${minute}`;
  return `${to12(time.hour)}:${minute} ${meridiem(time.hour)}`;
}

// A whole hour, for the pickers that only choose one: "09:00" / "9:00 AM".
export function formatClockHour(hour: number): string {
  return formatClock({ hour, minute: 0 });
}

// The hour on its own, for a stepper sitting next to a separate minute field:
// "06" / "6 PM". Written without the minutes, which the field beside it owns.
export function formatHourLabel(hour: number): string {
  if (uses24HourClock()) return String(hour).padStart(2, '0');
  return `${to12(hour)} ${meridiem(hour)}`;
}

function to12(hour: number): number {
  return hour % 12 === 0 ? 12 : hour % 12;
}

function meridiem(hour: number): string {
  return hour < 12 ? 'AM' : 'PM';
}

// 'YYYY-MM-DD' for a Date, in local time — matching how dates are stored.
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
