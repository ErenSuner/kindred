// Weekly routines: the things that happen on the same weekdays every week —
// a course on Tuesdays and Thursdays, a standing call on Mondays.
//
// A routine is not a date, so it doesn't go through the recurrence machinery in
// dates.ts. It is a set of weekdays, and "when is it next" is simply the next
// one of those days on or after today.

// 0 = Sunday, matching Date.getDay().
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS: { value: Weekday; short: string; label: string }[] = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 0, short: 'Sun', label: 'Sunday' },
];

// Weeks start on Monday here, so a routine reads left to right the way a
// timetable does rather than putting Sunday first.
const ORDER = WEEKDAYS.map((d) => d.value);

export function sortWeekdays(days: Weekday[]): Weekday[] {
  return [...new Set(days)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

export function parseWeekdays(raw: unknown): Weekday[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw
    .map((n) => Number(n))
    .filter((n): n is Weekday => Number.isInteger(n) && n >= 0 && n <= 6);
  return sortWeekdays(valid as Weekday[]);
}

export function isRoutine(weekdays: Weekday[] | undefined): boolean {
  return !!weekdays && weekdays.length > 0;
}

// "Tue & Thu", "Mon, Wed & Fri", "Every day"
export function weekdaysLabel(days: Weekday[]): string {
  const sorted = sortWeekdays(days);
  if (sorted.length === 0) return 'No days picked';
  if (sorted.length === 7) return 'Every day';

  const names = sorted.map((d) => WEEKDAYS.find((w) => w.value === d)?.short ?? '');
  if (names.length === 1) return `Every ${names[0]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// The next `count` days the routine falls on, starting today if today is one of
// them.
export function upcomingRoutineDates(
  days: Weekday[],
  count: number,
  from: Date = startOfToday(),
): Date[] {
  const sorted = sortWeekdays(days);
  if (sorted.length === 0) return [];

  const out: Date[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  // At most a full week of misses before the first hit, then one hit per step.
  for (let step = 0; out.length < count && step < 7 + count * 7; step++) {
    if (sorted.includes(cursor.getDay() as Weekday)) {
      out.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

export function nextRoutineDate(days: Weekday[], from: Date = startOfToday()): Date | null {
  return upcomingRoutineDates(days, 1, from)[0] ?? null;
}
