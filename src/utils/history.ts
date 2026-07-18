import type { Note, Person, SpecialDay } from '@/data/mock';
import { YEARLY } from '@/utils/recurrence';
import { formatOccurrenceDate, getPastOccurrences, toISODate } from '@/utils/dates';

// How many past occurrences of a single day to surface. A weekly reminder would
// otherwise bury everything else under hundreds of entries.
const PER_DAY_LIMIT = 4;

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

function relativeLabel(date: Date, day: SpecialDay, from: Date): string {
  const months =
    (from.getFullYear() - date.getFullYear()) * 12 + (from.getMonth() - date.getMonth());

  if (months < 1) return 'This month';
  if (months < 12) return months === 1 ? 'Last month' : `${months} months ago`;

  const years = Math.floor(months / 12);
  const base = years === 1 ? 'Last year' : `${years} years ago`;

  // A birthday can say how old they turned, which is more use than the gap.
  if (day.isBirthday || day.recurrence?.unit === 'year') {
    const anchorYear = Number((day.originalDate ?? '').slice(0, 4));
    if (anchorYear > 1000 && !isNaN(anchorYear)) {
      const age = date.getFullYear() - anchorYear;
      if (age > 0) return `${base} · turned ${age}`;
    }
  }

  return base;
}

// Builds the "Looking back" timeline: every past occurrence of every day this
// person has, newest first, each carrying whatever was written about it.
//
// Occurrences are computed from the recurrence rule rather than stored, so the
// timeline is complete even for days that were added years after the fact.
export function buildHistory(person: Person, from: Date = new Date()): PastOccurrence[] {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);

  const days: SpecialDay[] = [...(person.specialDays ?? []), ...(person.pastDays ?? [])];
  const out: PastOccurrence[] = [];

  for (const day of days) {
    const anchor = day.originalDate;
    if (!anchor) continue;

    const recurrence = day.recurrence ?? YEARLY;
    const past = getPastOccurrences(anchor, recurrence, PER_DAY_LIMIT, today);
    const memories = day.memories ?? [];

    for (const date of past) {
      const isoDate = toISODate(date);
      out.push({
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
      });
    }
  }

  // An occurrence someone bothered to write about is worth more than a bare
  // date, but chronology wins — the timeline has to read as a timeline.
  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Anything worth showing at all? A person added today with one future birthday
// has no history, and the section should stay out of the way.
export function hasHistory(person: Person): boolean {
  return buildHistory(person).length > 0;
}
