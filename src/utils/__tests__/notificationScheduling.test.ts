// The part that talks to the OS, which planNotifications deliberately does not
// cover. A missing `type` on a trigger is invisible to the planner and to
// TypeScript — expo silently falls through to the Android channel branch and
// delivers the notification immediately, which is how a new account received a
// year of reminders the moment it signed in.

import * as Notifications from 'expo-notifications';
import { DEFAULT_ENABLED_HOLIDAYS, HOLIDAYS } from '@/data/holidays';
import { planNotifications, syncNotifications } from '@/utils/notifications';
import type { Person } from '@/data/mock';
import { YEARLY } from '@/utils/recurrence';

const TODAY = new Date(2026, 6, 15); // Wed 15 July 2026
const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;

const defaults = HOLIDAYS.filter((h) => DEFAULT_ENABLED_HOLIDAYS.includes(h.id));

function person(): Person {
  return {
    id: 'p1',
    name: 'Eleanor',
    role: 'Grandmother',
    tags: ['Family'],
    eventTitle: '',
    eventTag: 'Family',
    daysAway: 0,
    eventDate: '',
    specialDays: [
      {
        id: 'sd1',
        title: 'Birthday',
        date: 'August 3rd, 2026',
        icon: 'cake',
        accent: 'primary' as const,
        originalDate: '1990-08-03',
        isBirthday: true,
        recurrence: YEARLY,
        nudges: ['1_week'],
      },
    ],
  } as unknown as Person;
}

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  scheduleMock.mockClear();
});

describe('what actually reaches expo', () => {
  it('gives every dated reminder an explicit date trigger', async () => {
    await syncNotifications([person()], [], defaults, true);

    const triggers = scheduleMock.mock.calls.map(([req]) => req.trigger);
    expect(triggers.length).toBeGreaterThan(0);

    // Anything without a recognised `type` is delivered on the spot.
    for (const trigger of triggers) {
      expect(trigger.type).toBeDefined();
      expect(trigger.type).not.toBe('channel');
    }
  });

  it('never books a dated reminder in the past', async () => {
    await syncNotifications([person()], [], defaults, true);

    const dates = scheduleMock.mock.calls
      .map(([req]) => req.trigger)
      .filter((t: any) => t.type === Notifications.SchedulableTriggerInputTypes.DATE)
      .map((t: any) => new Date(t.date).getTime());

    for (const at of dates) expect(at).toBeGreaterThan(TODAY.getTime());
  });

  it('schedules nothing at all when nudges are off', async () => {
    await syncNotifications([person()], [], defaults, false);
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('does not rebook an unchanged plan', async () => {
    const people = [person()];
    await syncNotifications(people, [], defaults, true);
    const first = scheduleMock.mock.calls.length;

    // Every provider settling on a cold start calls this again with the same
    // picture. Four rounds of cancel-and-reschedule is how twelve reminders
    // became forty-eight.
    scheduleMock.mockClear();
    await syncNotifications(people, [], defaults, true);
    await syncNotifications(people, [], defaults, true);

    expect(first).toBeGreaterThan(0);
    expect(scheduleMock).not.toHaveBeenCalled();
  });
});

describe('shared occasions', () => {
  it('books a fixed-date holiday as a yearly slot rather than dated copies', () => {
    const valentines = HOLIDAYS.filter((h) => h.id === 'valentines_day');
    const { dated, routines } = planNotifications([], [], valentines, 9);

    expect(dated).toHaveLength(0);
    // One for the week before, one for the day before — and they never expire.
    expect(routines).toHaveLength(2);
    expect(routines.every((r) => r.repeat.every === 'year')).toBe(true);
  });

  it('keeps a floating holiday dated, since its date moves every year', () => {
    const mothers = HOLIDAYS.filter((h) => h.id === 'mothers_day');
    const { dated, routines } = planNotifications([], [], mothers, 9);

    expect(routines).toHaveLength(0);
    expect(dated.length).toBeGreaterThan(0);
  });

  it('costs the whole catalog far less than the budget', () => {
    const { dated, routines, dropped } = planNotifications([], [], HOLIDAYS, 9);

    expect(dropped).toBe(0);
    expect(dated.length + routines.length).toBeLessThan(30);
  });
});
