import { MAX_NOTIFICATIONS, planNotifications } from '@/utils/notifications';
import { MONTHLY, ONE_TIME, WEEKLY, YEARLY } from '@/utils/recurrence';
import type { MyEvent, Person, SpecialDay } from '@/data/mock';
import type { Weekday } from '@/utils/routines';

const TODAY = new Date(2026, 6, 15); // Wed 15 July 2026
const HOUR = 9;

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterAll(() => {
  jest.useRealTimers();
});

// --- Builders ----------------------------------------------------------------

let seq = 0;
const id = () => `id_${seq++}`;

function person(days: Partial<SpecialDay>[], name = 'Eleanor'): Person {
  return {
    id: id(),
    name,
    role: 'Grandmother',
    tags: ['Family'],
    eventTitle: '',
    eventTag: 'Family',
    daysAway: 0,
    eventDate: '',
    specialDays: days.map((d) => ({
      id: id(),
      title: 'Anniversary',
      date: 'March 2nd, 2027',
      icon: 'event',
      accent: 'primary' as const,
      recurrence: YEARLY,
      nudges: [],
      ...d,
    })),
  };
}

function myEvent(over: Partial<MyEvent> = {}): MyEvent {
  return {
    id: id(),
    title: 'Dentist',
    date: 'August 3rd, 2026',
    originalDate: '2026-08-03',
    icon: 'event',
    accent: 'primary',
    daysAway: 19,
    nudges: [],
    recurrence: ONE_TIME,
    ...over,
  };
}

function routine(weekdays: Weekday[], over: Partial<MyEvent> = {}): MyEvent {
  return myEvent({ title: 'Guitar lesson', weekdays, recurrence: WEEKLY, ...over });
}

const plan = (people: Person[] = [], events: MyEvent[] = []) =>
  planNotifications(people, events, [], HOUR);

// --- Tests -------------------------------------------------------------------

describe('the day itself is never optional', () => {
  it('schedules a day-of reminder even when nothing was chosen', () => {
    const { dated } = plan([], [myEvent({ nudges: [] })]);
    expect(dated).toHaveLength(1);
    expect(dated[0].body).toContain('is today');
  });

  it('does not schedule it twice when it was chosen', () => {
    const { dated } = plan([], [myEvent({ nudges: ['day_of'] })]);
    expect(dated).toHaveLength(1);
  });
});

describe('timed events', () => {
  it('adds a two-hour warning alongside the morning glance', () => {
    const { dated } = plan([], [myEvent({ timeOfDay: { hour: 18, minute: 0 } })]);

    expect(dated).toHaveLength(2);
    const [first, second] = dated;
    expect(first.date.getHours()).toBe(9);
    expect(second.date.getHours()).toBe(16);
    expect(second.body).toContain('in 2 hours');
  });

  it('mentions the time in the body', () => {
    const { dated } = plan([], [myEvent({ timeOfDay: { hour: 18, minute: 30 } })]);
    expect(dated[0].body).toContain('at 18:30');
  });

  it('gives an untimed event a single day-of reminder', () => {
    const { dated } = plan([], [myEvent({ timeOfDay: null })]);
    expect(dated).toHaveLength(1);
  });

  it('puts the warning on the previous day for an early event', () => {
    // 01:00 on 3 August, warned at 23:00 on the 2nd.
    const { dated } = plan([], [myEvent({ timeOfDay: { hour: 1, minute: 0 } })]);
    expect(dated).toHaveLength(1);
    expect(dated[0].date.getDate()).toBe(2);
    expect(dated[0].date.getHours()).toBe(23);
  });
});

describe('routines', () => {
  it('are weekly triggers, not dated notifications', () => {
    const { dated, routines } = plan([], [routine([2, 4])]);
    expect(dated).toHaveLength(0);
    expect(routines).toHaveLength(2);
  });

  it('cost one trigger per weekday per nudge', () => {
    const { routines } = plan([], [routine([1, 3, 5], { nudges: ['day_of', '1_day'] })]);
    expect(routines).toHaveLength(6);
  });

  it('fire on the weekday itself for a day-of reminder', () => {
    const { routines } = plan([], [routine([2])]);
    expect(routines[0].repeat).toEqual({ every: 'week', weekday: 2 });
    expect(routines[0].hour).toBe(HOUR);
  });

  it('shift to an earlier weekday for a lead time', () => {
    // Monday, reminded the day before, is Sunday.
    const { routines } = plan([], [routine([1], { nudges: ['1_day'] })]);
    const lead = routines.find((r) => r.body.includes('tomorrow'));
    expect(lead?.repeat).toEqual({ every: 'week', weekday: 0 });
  });

  it('wrap backwards past Sunday', () => {
    // Sunday minus three days is Thursday.
    const { routines } = plan([], [routine([0], { nudges: ['3_days'] })]);
    const lead = routines.find((r) => r.body.includes('3 days'));
    expect(lead?.repeat).toEqual({ every: 'week', weekday: 4 });
  });

  it('drop lead times of a week or more', () => {
    // "A week before" a weekly thing is the previous one — it would fire every
    // week and say nothing.
    const { routines } = plan([], [routine([2], { nudges: ['1_week', '1_month'] })]);
    expect(routines).toHaveLength(1);
    expect(routines[0].body).toContain('is today');
  });

  it('add a two-hour warning when the routine has a time', () => {
    const { routines } = plan([], [routine([2], { timeOfDay: { hour: 18, minute: 0 } })]);

    expect(routines).toHaveLength(2);
    const imminent = routines.find((r) => r.body.includes('in 2 hours'));
    expect(imminent).toMatchObject({ repeat: { every: 'week', weekday: 2 }, hour: 16, minute: 0 });
  });

  it('move the warning to the previous weekday when it crosses midnight', () => {
    // Tuesday 01:00 is warned about on Monday at 23:00.
    const { routines } = plan([], [routine([2], { timeOfDay: { hour: 1, minute: 0 } })]);
    const imminent = routines.find((r) => r.body.includes('in 2 hours'));
    expect(imminent).toMatchObject({ repeat: { every: 'week', weekday: 1 }, hour: 23 });
  });
});

describe('recurring events take a repeating slot', () => {
  it('books a yearly event once instead of six times', () => {
    const { dated, routines } = plan([], [myEvent({ recurrence: YEARLY, nudges: ['1_week'] })]);

    expect(dated).toHaveLength(0);
    expect(routines).toHaveLength(2); // the day itself, and a week before
  });

  it('fires on the month and day of the occurrence', () => {
    // 3 August, so the day-of trigger is 3 August every year.
    const { routines } = plan([], [myEvent({ recurrence: YEARLY, nudges: [] })]);
    expect(routines[0].repeat).toEqual({ every: 'year', month: 8, day: 3 });
  });

  it('shifts a lead time back across the month boundary', () => {
    // A week before 3 August is 27 July.
    const { routines } = plan([], [myEvent({ recurrence: YEARLY, nudges: ['1_week'] })]);
    const lead = routines.find((r) => r.repeat.every === 'year' && r.repeat.month === 7);
    expect(lead?.repeat).toEqual({ every: 'year', month: 7, day: 27 });
  });

  it('moves a 29 February reminder to the 28th', () => {
    // A yearly trigger on the 29th would only fire every fourth year.
    const { routines } = plan([], [myEvent({ originalDate: '2028-02-29', recurrence: YEARLY, nudges: [] })]);
    expect(routines[0].repeat).toEqual({ every: 'year', month: 2, day: 28 });
  });

  it('books a monthly event on its day of the month', () => {
    const { dated, routines } = plan([], [myEvent({ originalDate: '2026-08-10', recurrence: MONTHLY, nudges: [] })]);
    expect(dated).toHaveLength(0);
    expect(routines[0].repeat).toEqual({ every: 'month', day: 10 });
  });

  it('keeps a monthly event past the 28th dated, since not every month has one', () => {
    const { dated, routines } = plan([], [myEvent({ originalDate: '2026-08-31', recurrence: MONTHLY, nudges: [] })]);
    expect(routines).toHaveLength(0);
    expect(dated.length).toBeGreaterThan(0);
  });

  it('keeps an uneven interval dated, because it has no fixed slot', () => {
    const { dated, routines } = plan([], [myEvent({ recurrence: { unit: 'year', interval: 2 }, nudges: [] })]);
    expect(routines).toHaveLength(0);
    expect(dated.length).toBeGreaterThan(0);
  });

  it('keeps a one-off dated', () => {
    const { dated, routines } = plan([], [myEvent({ recurrence: ONE_TIME })]);
    expect(routines).toHaveLength(0);
    expect(dated).toHaveLength(1);
  });
});

describe('the notification budget', () => {
  it('leaves repeating slots out of the dated allowance', () => {
    const routines = Array.from({ length: 5 }, () => routine([1, 2, 3]));
    const events = Array.from({ length: 80 }, (_, i) =>
      myEvent({
        originalDate: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        recurrence: ONE_TIME,
      }),
    );

    const result = planNotifications([], [...routines, ...events], [], HOUR);

    expect(result.routines).toHaveLength(15);
    expect(result.dated).toHaveLength(MAX_NOTIFICATIONS - 15);
  });

  it('reports what did not fit', () => {
    // One-time events yield exactly one notification each, so the arithmetic is
    // visible: 80 in, 60 scheduled, 20 dropped.
    const events = Array.from({ length: 80 }, (_, i) =>
      myEvent({
        originalDate: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        recurrence: ONE_TIME,
      }),
    );
    const result = planNotifications([], events, [], HOUR);

    expect(result.dated).toHaveLength(MAX_NOTIFICATIONS);
    expect(result.dropped).toBe(80 - MAX_NOTIFICATIONS);
  });

  it('fits far more yearly events than the old six-occurrences-each ever did', () => {
    // This is the whole point of the change. Twenty birthdays with two extra
    // reminders each used to be 360 dated notifications fighting over 60 slots;
    // now it is 60 repeating ones that never expire.
    const events = Array.from({ length: 20 }, (_, i) =>
      myEvent({
        originalDate: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
        recurrence: YEARLY,
        nudges: ['1_week', '1_day'],
      }),
    );
    const result = planNotifications([], events, [], HOUR);

    expect(result.routines).toHaveLength(60);
    expect(result.dropped).toBe(0);
  });

  it('keeps the soonest reminders when it has to choose', () => {
    const events = Array.from({ length: 80 }, (_, i) =>
      myEvent({ originalDate: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`, recurrence: YEARLY }),
    );
    const { dated } = planNotifications([], events, [], HOUR);

    const times = dated.map((n) => n.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('gives dated reminders nothing when routines fill the budget', () => {
    // 61 routines, one weekday each, is one over the whole allowance.
    const routines = Array.from({ length: MAX_NOTIFICATIONS + 1 }, () => routine([3]));
    const result = planNotifications([], [...routines, myEvent()], [], HOUR);

    expect(result.routines).toHaveLength(MAX_NOTIFICATIONS);
    expect(result.dated).toHaveLength(0);
  });
});

describe('people', () => {
  it('name the person and the occasion', () => {
    const { routines } = plan([person([{ title: 'Anniversary', originalDate: '2020-08-03' }])]);
    expect(routines[0].body).toContain('Eleanor');
    expect(routines[0].body).toContain('Anniversary');
  });

  it('word a birthday differently', () => {
    const { routines } = plan([
      person([{ title: 'Birthday', originalDate: '1990-08-03', isBirthday: true, turningAge: 36 }]),
    ]);
    expect(routines[0].title).toContain('Birthday Reminder');
    expect(routines[0].body).toContain('birthday');
  });

  it('leave the age out of a repeating reminder, because it would go stale', () => {
    // A yearly trigger says the same thing forever. "Turning 36" is only true
    // for one of those years.
    const { routines } = plan([
      person([{ title: 'Birthday', originalDate: '1990-08-03', isBirthday: true, turningAge: 36 }]),
    ]);
    expect(routines.every((r) => !r.body.includes('36'))).toBe(true);
  });

  it('keep the age on a one-off, which is rewritten every time', () => {
    const { dated } = plan([
      person([
        { title: 'Party', originalDate: '2026-08-03', recurrence: ONE_TIME, isBirthday: true, turningAge: 36 },
      ]),
    ]);
    expect(dated[0].body).toContain('turning 36');
  });

  it('skip a day with no stored date', () => {
    const { dated, routines } = plan([person([{ originalDate: undefined }])]);
    expect(dated).toHaveLength(0);
    expect(routines).toHaveLength(0);
  });

  it('never schedule anything in the past', () => {
    const { dated, routines } = plan([person([{ originalDate: '2020-01-01', recurrence: ONE_TIME }])]);
    expect(dated).toHaveLength(0);
    expect(routines).toHaveLength(0);
  });
});
