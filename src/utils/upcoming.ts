import type { Person, Relationship, SpecialDay } from '@/data/mock';
import type { Recurrence } from '@/utils/recurrence';

export type Upcoming = Pick<Person, 'eventTitle' | 'eventTag' | 'daysAway' | 'eventDate' | 'countdown'>;

// Sorts a person to the bottom of any "soonest first" list when they have
// nothing coming up.
export const NO_UPCOMING_DAYS = 9999;

// How long one turn of the cycle is, in days. The progress bar fills over this
// — measuring a weekly event against a year left the bar permanently full.
function cycleLengthDays(recurrence: Recurrence | undefined): number {
  if (!recurrence || recurrence.unit === 'none') return 365;
  const perUnit = { day: 1, week: 7, month: 30, year: 365 }[recurrence.unit];
  return Math.max(1, perUnit * Math.max(1, recurrence.interval));
}

// The headline "next big day" fields, derived rather than stored.
//
// Two things depend on this being a function of the current day list rather than
// a snapshot taken at fetch time: a day whose date has passed must stop being
// counted down to, and deleting a day has to move the countdown on immediately
// instead of waiting for the next refresh.
export function deriveUpcoming(name: string, role: Relationship, days: SpecialDay[]): Upcoming {
  // A date that has already gone by is not something to count down to. Without
  // this, a day added with a past date sorts first and shows a negative number.
  const next = days
    .filter((d) => !d.isExpired && (d.daysAway ?? 0) >= 0)
    .sort((a, b) => (a.daysAway ?? NO_UPCOMING_DAYS) - (b.daysAway ?? NO_UPCOMING_DAYS))[0];

  if (!next) {
    return {
      eventTitle: 'No upcoming events',
      eventTag: role,
      daysAway: NO_UPCOMING_DAYS,
      eventDate: 'No date set',
      countdown: undefined,
    };
  }

  const daysAway = next.daysAway ?? 0;
  const ageStr = next.turningAge ? ` (Turning ${next.turningAge})` : '';
  const title = `${name}'s ${next.title}${ageStr}`;
  const cycle = cycleLengthDays(next.recurrence);

  return {
    eventTitle: title,
    eventTag: role,
    daysAway,
    eventDate: next.date,
    countdown: {
      tag: next.title,
      days: daysAway,
      title,
      date: next.date,
      progress: Math.max(0, Math.min(1, 1 - daysAway / cycle)),
      isBirthday: next.isBirthday,
      turningAge: next.turningAge,
    },
  };
}
