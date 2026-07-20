// One list of what is coming up, whoever or whatever it belongs to.
//
// Home used to show a card per *person* and a card per *event*, which is what
// the other two tabs are for — so the same thing appeared twice under two
// different headings, and a person with three special days only ever showed the
// nearest one. This flattens everything to the unit that actually matters on a
// home screen: an occasion on a date.

import type { MyEvent, Note, Person } from '@/data/mock';
import type { TimeOfDay } from '@/utils/eventTime';
import { NO_UPCOMING_DAYS } from '@/utils/upcoming';
import { weekdaysLabel } from '@/utils/routines';
import i18n from '@/lib/i18n';

export type TimelineSource = 'person' | 'event' | 'routine' | 'holiday';

export type TimelineEntry = {
  id: string;
  source: TimelineSource;
  daysAway: number;
  // Display date, already formatted by whoever produced it.
  date: string;
  title: string;
  // The line under the title: who it belongs to, or what days a routine runs.
  subtitle?: string;
  icon: string;
  timeOfDay?: TimeOfDay | null;
  notes?: Note[];
  // Where tapping it should go.
  personId?: string;
  eventId?: string;
  // For the avatar, when there is a person behind it.
  avatar?: string;
  initials?: string;
  isPinned?: boolean;
};

export type TimelineGroup = { key: string; label: string; entries: TimelineEntry[] };

// Anything further out than this is "later" — a precise day count stops being
// useful once it's months away.
const BUCKETS: { key: string; labelKey: string; upTo: number }[] = [
  { key: 'today', labelKey: 'grp_today', upTo: 0 },
  { key: 'tomorrow', labelKey: 'grp_tomorrow', upTo: 1 },
  { key: 'week', labelKey: 'grp_week', upTo: 7 },
  { key: 'month', labelKey: 'grp_month', upTo: 31 },
  { key: 'later', labelKey: 'grp_later', upTo: Infinity },
];

function bucketFor(daysAway: number) {
  return BUCKETS.find((b) => daysAway <= b.upTo) ?? BUCKETS[BUCKETS.length - 1];
}

export type HolidayEntry = { id: string; name: string; icon: string; formattedDate: string; daysAway: number };

export function buildTimeline(
  people: Person[],
  events: MyEvent[],
  routines: MyEvent[],
  holidays: HolidayEntry[],
): TimelineGroup[] {
  const entries: TimelineEntry[] = [];

  for (const person of people) {
    // Every one of their days, not just the nearest — the whole point of a
    // timeline is that two things a week apart show up a week apart.
    for (const day of person.specialDays ?? []) {
      if (day.daysAway === undefined || day.daysAway < 0) continue;

      entries.push({
        id: `sd_${day.id}`,
        source: 'person',
        daysAway: day.daysAway,
        date: day.date,
        title: day.isBirthday
          ? i18n.t('timeline_birthday', {
              name: person.name,
              age: day.turningAge ? i18n.t('age_paren', { age: day.turningAge }) : '',
            })
          : i18n.t('timeline_person_day', { name: person.name, title: day.title }),
        subtitle: i18n.t(`rel_${person.role}`, { defaultValue: person.role }),
        icon: day.icon,
        notes: day.notes,
        personId: person.id,
        avatar: person.avatar,
        initials: person.initials,
        isPinned: person.isPinned,
      });
    }
  }

  for (const event of events) {
    entries.push({
      id: `me_${event.id}`,
      source: 'event',
      daysAway: event.daysAway,
      date: event.date,
      title: event.title,
      subtitle: i18n.t('for_you'),
      icon: event.icon,
      timeOfDay: event.timeOfDay,
      eventId: event.id,
    });
  }

  for (const routine of routines) {
    entries.push({
      id: `rt_${routine.id}`,
      source: 'routine',
      daysAway: routine.daysAway,
      date: routine.date,
      title: routine.title,
      subtitle: weekdaysLabel(routine.weekdays ?? []),
      icon: 'repeat',
      timeOfDay: routine.timeOfDay,
      eventId: routine.id,
    });
  }

  for (const holiday of holidays) {
    entries.push({
      id: `hd_${holiday.id}`,
      source: 'holiday',
      daysAway: holiday.daysAway,
      date: holiday.formattedDate,
      title: holiday.name,
      subtitle: i18n.t('shared_occasion'),
      icon: holiday.icon,
    });
  }

  // Soonest first. A pin only breaks a tie — it shouldn't drag someone three
  // weeks out above something happening tomorrow, which is what pinning did to
  // the old person-shaped feed.
  entries.sort((a, b) => {
    const byDay = (a.daysAway ?? NO_UPCOMING_DAYS) - (b.daysAway ?? NO_UPCOMING_DAYS);
    if (byDay !== 0) return byDay;
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  const groups = new Map<string, TimelineGroup>();
  for (const entry of entries) {
    const bucket = bucketFor(entry.daysAway);
    const existing = groups.get(bucket.key);
    if (existing) existing.entries.push(entry);
    else groups.set(bucket.key, { key: bucket.key, label: i18n.t(bucket.labelKey), entries: [entry] });
  }

  // Map preserves insertion order, and entries were already sorted, so the
  // groups come out in time order too.
  return [...groups.values()];
}
