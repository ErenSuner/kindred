import { HolidayEntry, buildTimeline } from '@/utils/timeline';
import { ONE_TIME, WEEKLY, YEARLY } from '@/utils/recurrence';
import type { MyEvent, Person, SpecialDay } from '@/data/mock';

let seq = 0;
const id = () => `id_${seq++}`;

function person(name: string, days: Partial<SpecialDay>[], over: Partial<Person> = {}): Person {
  return {
    id: id(),
    name,
    role: 'Friend',
    initials: name.charAt(0),
    tags: ['Friend'],
    eventTitle: '',
    eventTag: 'Friend',
    daysAway: days[0]?.daysAway ?? 0,
    eventDate: '',
    specialDays: days.map((d) => ({
      id: id(),
      title: 'Anniversary',
      date: 'August 3rd, 2026',
      icon: 'event',
      accent: 'primary' as const,
      daysAway: 5,
      recurrence: YEARLY,
      ...d,
    })),
    ...over,
  };
}

function myEvent(title: string, daysAway: number, over: Partial<MyEvent> = {}): MyEvent {
  return {
    id: id(),
    title,
    date: 'August 3rd, 2026',
    originalDate: '2026-08-03',
    icon: 'event',
    accent: 'primary',
    daysAway,
    nudges: [],
    recurrence: ONE_TIME,
    ...over,
  };
}

const holiday = (name: string, daysAway: number): HolidayEntry => ({
  id: id(),
  name,
  icon: 'celebration',
  formattedDate: 'August 3rd, 2026',
  daysAway,
});

const flat = (groups: ReturnType<typeof buildTimeline>) => groups.flatMap((g) => g.entries);

describe('what goes in', () => {
  it('is empty when there is nothing', () => {
    expect(buildTimeline([], [], [], [])).toEqual([]);
  });

  it('lists every one of a person’s days, not just the nearest', () => {
    // This is the thing the old person-shaped feed could not do.
    const groups = buildTimeline(
      [person('Eleanor', [{ daysAway: 2, title: 'Birthday' }, { daysAway: 9, title: 'Anniversary' }])],
      [], [], [],
    );
    expect(flat(groups)).toHaveLength(2);
  });

  it('merges people, events, routines and holidays into one run', () => {
    const groups = buildTimeline(
      [person('Eleanor', [{ daysAway: 3 }])],
      [myEvent('Dentist', 1)],
      [myEvent('Guitar', 0, { weekdays: [2], recurrence: WEEKLY })],
      [holiday("Mother's Day", 2)],
    );

    expect(flat(groups).map((e) => e.source)).toEqual(['routine', 'event', 'holiday', 'person']);
  });

  it('leaves out a day that has already gone', () => {
    const groups = buildTimeline([person('Eleanor', [{ daysAway: -3 }])], [], [], []);
    expect(flat(groups)).toHaveLength(0);
  });

  it('leaves out a day with no countdown at all', () => {
    const groups = buildTimeline([person('Eleanor', [{ daysAway: undefined }])], [], [], []);
    expect(flat(groups)).toHaveLength(0);
  });
});

describe('order', () => {
  it('is soonest first', () => {
    const groups = buildTimeline([], [myEvent('Later', 20), myEvent('Sooner', 2)], [], []);
    expect(flat(groups).map((e) => e.title)).toEqual(['Sooner', 'Later']);
  });

  it('does not let a pin jump the queue', () => {
    // Pinning someone shouldn't put them above something happening tomorrow.
    const pinned = person('Pinned', [{ daysAway: 20 }], { isPinned: true });
    const groups = buildTimeline([pinned], [myEvent('Tomorrow', 1)], [], []);
    expect(flat(groups)[0].title).toBe('Tomorrow');
  });

  it('does let a pin break a tie', () => {
    const pinned = person('Pinned', [{ daysAway: 5, title: 'Anniversary' }], { isPinned: true });
    const other = person('Other', [{ daysAway: 5, title: 'Anniversary' }]);
    const groups = buildTimeline([other, pinned], [], [], []);
    expect(flat(groups)[0].title).toContain('Pinned');
  });
});

describe('grouping', () => {
  it('splits into time buckets, in time order', () => {
    const groups = buildTimeline(
      [],
      [myEvent('Now', 0), myEvent('Tmw', 1), myEvent('Week', 4), myEvent('Month', 20), myEvent('Far', 200)],
      [], [],
    );
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Tomorrow', 'This week', 'This month', 'Later']);
  });

  it('creates no group for a bucket with nothing in it', () => {
    const groups = buildTimeline([], [myEvent('Now', 0), myEvent('Far', 200)], [], []);
    expect(groups.map((g) => g.key)).toEqual(['today', 'later']);
  });

  it('puts the boundary days in the bucket they belong to', () => {
    const groups = buildTimeline([], [myEvent('Seven', 7), myEvent('Eight', 8)], [], []);
    expect(groups.find((g) => g.key === 'week')?.entries.map((e) => e.title)).toEqual(['Seven']);
    expect(groups.find((g) => g.key === 'month')?.entries.map((e) => e.title)).toEqual(['Eight']);
  });
});

describe('what an entry says', () => {
  it('names a birthday with its age', () => {
    const groups = buildTimeline(
      [person('Eleanor', [{ daysAway: 1, title: 'Birthday', isBirthday: true, turningAge: 36 }])],
      [], [], [],
    );
    expect(flat(groups)[0].title).toBe("Eleanor's Birthday (36)");
  });

  it('names a birthday without one when the year is unknown', () => {
    const groups = buildTimeline(
      [person('Eleanor', [{ daysAway: 1, title: 'Birthday', isBirthday: true }])],
      [], [], [],
    );
    expect(flat(groups)[0].title).toBe("Eleanor's Birthday");
  });

  it('puts the person in front of their other days', () => {
    const groups = buildTimeline([person('Eleanor', [{ daysAway: 1, title: 'Graduation' }])], [], [], []);
    expect(flat(groups)[0].title).toBe('Eleanor — Graduation');
  });

  it('says which days a routine runs on', () => {
    const groups = buildTimeline([], [], [myEvent('Guitar', 1, { weekdays: [2, 4] })], []);
    expect(flat(groups)[0].subtitle).toBe('Tue & Thu');
  });

  it('carries what tapping it needs', () => {
    const p = person('Eleanor', [{ daysAway: 1 }]);
    const [entry] = flat(buildTimeline([p], [], [], []));
    expect(entry.personId).toBe(p.id);
    expect(entry.initials).toBe('E');
  });
});
