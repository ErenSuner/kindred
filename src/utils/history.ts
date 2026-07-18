import type { Note, Person, SpecialDay } from '@/data/mock';
import { YEARLY } from '@/utils/recurrence';
import { formatOccurrenceDate, getPastOccurrences, toISODate } from '@/utils/dates';

// How far back to compute before filtering. Generous, because the filters below
// throw most of it away.
const LOOKBACK_DEPTH = 24;

// A weekly or monthly reminder tracked for a while still racks up rows fast, so
// cap how many bare ones show. Anything you wrote about is kept regardless.
const FAST_CADENCE_LIMIT = 2;
const SLOW_CADENCE_LIMIT = 6;

export type PastOccurrence = {
  key: string;
  dayId: string;
  title: string;
  icon: string;
  isBirthday: boolean;
  date: Date;
  isoDate: string;
  formattedDate: string;
  relativeLabel: string;
  memories: Note[];
};

// How old they turned on that occurrence, when that's a thing worth saying.
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

  const age = ageOn(date, day);
  return age === null ? base : `${base} · turned ${age}`;
}

// The day this occasion started being tracked. Occurrences before it are
// arithmetic, not history — the app was not there for them.
function trackedFrom(day: SpecialDay): Date | null {
  if (!day.createdAt) return null;
  const created = new Date(day.createdAt);
  if (isNaN(created.getTime())) return null;
  created.setHours(0, 0, 0, 0);
  return created;
}

// Builds the "Looking back" timeline: occurrences that actually went by while
// the day existed in Kindred, newest first.
//
// Occurrences are derived from the recurrence rule rather than stored, so the
// rule alone would happily produce dates from before the app was installed.
// Everything earlier than the day's own created_at is dropped for that reason.
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
    const since = trackedFrom(day);

    const entries = getPastOccurrences(anchor, recurrence, LOOKBACK_DEPTH, today)
      // The core rule: it only counts if it happened after you added the day.
      .filter((date) => !since || date.getTime() >= since.getTime())
      .map((date) => {
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

    if (recurrence.unit === 'none') {
      // A one-off that has passed is the whole story; there is only ever one.
      out.push(...entries);
      continue;
    }

    const fast = recurrence.unit === 'week' || recurrence.unit === 'month';
    const limit = fast ? FAST_CADENCE_LIMIT : SLOW_CADENCE_LIMIT;

    // Newest few, plus anything recorded however far back — a written memory is
    // the whole point of the section and must never be trimmed away.
    const seen = new Set<string>();
    for (const entry of [...entries.slice(0, limit), ...entries.filter((e) => e.memories.length > 0)]) {
      if (seen.has(entry.key)) continue;
      seen.add(entry.key);
      out.push(entry);
    }
  }

  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}
