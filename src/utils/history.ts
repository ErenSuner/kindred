import type { Note, Person, SpecialDay } from '@/data/mock';
import { YEARLY } from '@/utils/recurrence';
import { formatOccurrenceDate, getPastOccurrences, toISODate } from '@/utils/dates';

// How far back to look, per day, before filtering.
const LOOKBACK_DEPTH = 8;

// A yearly date is a life event — "she turned 34 last May" is worth seeing even
// if you only started tracking her yesterday.
const YEARLY_LIMIT = 4;

// A weekly or monthly reminder is a chore, not a memory. Listing every past one
// would bury everything else under an endless run of identical rows, so only the
// most recent gets shown — enough to give somewhere to write — plus any older
// ones you actually recorded something about.
const FAST_CADENCE_LIMIT = 1;

export type PastOccurrence = {
  key: string;
  dayId: string;
  title: string;
  icon: string;
  isBirthday: boolean;
  date: Date;
  isoDate: string;
  formattedDate: string;
  // "Last year", "3 years ago", "Turned 34" — whichever reads best.
  relativeLabel: string;
  // What was written down about this particular occurrence.
  memories: Note[];
};

// How old they turned on that occurrence, when that's a thing worth saying.
// Only a yearly cycle with a real anchor year has an age to count.
function ageOn(date: Date, day: SpecialDay): number | null {
  if (!day.isBirthday && day.recurrence?.unit !== 'year') return null;

  const anchorYear = Number((day.originalDate ?? '').slice(0, 4));
  if (!(anchorYear > 1000) || isNaN(anchorYear)) return null;

  const age = date.getFullYear() - anchorYear;
  return age > 0 ? age : null;
}

function relativeLabel(date: Date, day: SpecialDay, from: Date): string {
  const months =
    (from.getFullYear() - date.getFullYear()) * 12 + (from.getMonth() - date.getMonth());

  let base: string;
  if (months < 1) base = 'This month';
  else if (months === 1) base = 'Last month';
  else if (months < 12) base = `${months} months ago`;
  else {
    const years = Math.floor(months / 12);
    base = years === 1 ? 'Last year' : `${years} years ago`;
  }

  // The age applies however recently it happened — a birthday two months back
  // is exactly when you still want to know they turned 36.
  const age = ageOn(date, day);
  return age === null ? base : `${base} · turned ${age}`;
}

// Builds the "Looking back" timeline: past occurrences worth showing, newest
// first, each carrying whatever was written about it.
//
// Occurrences are computed from the recurrence rule rather than stored, so a
// birthday added today still shows the years that already went by. The trade is
// that a fast cadence can invent a long run of dates nobody experienced with the
// app, which is why how much shows depends on the cadence.
export function buildHistory(person: Person, from: Date = new Date()): PastOccurrence[] {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);

  const days: SpecialDay[] = [...(person.specialDays ?? []), ...(person.pastDays ?? [])];
  const out: PastOccurrence[] = [];

  for (const day of days) {
    const anchor = day.originalDate;
    if (!anchor) continue;

    const recurrence = day.recurrence ?? YEARLY;
    const memories = day.memories ?? [];

    const entries = getPastOccurrences(anchor, recurrence, LOOKBACK_DEPTH, today).map((date) => {
      const isoDate = toISODate(date);
      return {
        key: `${day.id}:${isoDate}`,
        dayId: day.id,
        title: day.title,
        icon: day.icon,
        isBirthday: day.isBirthday === true,
        date,
        isoDate,
        formattedDate: formatOccurrenceDate(date),
        relativeLabel: relativeLabel(date, day, today),
        memories: memories.filter((m) => m.occurredOn === isoDate),
      };
    });

    // getPastOccurrences already returns newest first.
    if (recurrence.unit === 'none') {
      // A one-off that has passed is the whole story; there is only ever one.
      out.push(...entries);
    } else if (recurrence.unit === 'year' && recurrence.interval === 1) {
      out.push(...entries.slice(0, YEARLY_LIMIT));
    } else {
      const recorded = entries.filter((e) => e.memories.length > 0);
      const mostRecent = entries.slice(0, FAST_CADENCE_LIMIT);
      // Union, keeping chronological order and no duplicates.
      const seen = new Set<string>();
      for (const entry of [...mostRecent, ...recorded]) {
        if (seen.has(entry.key)) continue;
        seen.add(entry.key);
        out.push(entry);
      }
    }
  }

  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}
