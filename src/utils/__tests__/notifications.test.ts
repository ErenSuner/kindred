// What gets scheduled, and what actually reaches expo.
//
// The two are tested together because the interesting bugs live on both sides:
// planBirthdayNotifications decides the slots, and syncBirthdayNotifications is
// where a malformed trigger turns a year of reminders into a burst of
// notifications the moment someone signs in.

import * as Notifications from 'expo-notifications';
import {
  MAX_NOTIFICATIONS,
  REMINDER_HOUR,
  __resetNotificationSyncState,
  planBirthdayNotifications,
  syncBirthdayNotifications,
} from '@/utils/notifications';
import type { SimpleBirthday } from '@/data/mock';
import type { Importance } from '@/utils/importance';
import { getNextOccurrence } from '@/utils/dates';
import { YEARLY } from '@/utils/recurrence';

const TODAY = new Date(2026, 6, 15); // Wed 15 July 2026
const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelMock = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const permissionMock = Notifications.getPermissionsAsync as jest.Mock;

// Built the way the context builds one, so daysAway and turningAge are the
// values the planner would really see.
function birthday(
  id: string,
  name: string,
  originalDate: string,
  importance: Importance = 'low',
): SimpleBirthday {
  const { formattedDate, daysAway, turningAge } = getNextOccurrence(originalDate, YEARLY, true);
  return { id, name, originalDate, importance, date: formattedDate, daysAway, turningAge };
}

function many(count: number, importance: Importance): SimpleBirthday[] {
  // Spread across the year so daysAway is distinct and the ordering is real.
  return Array.from({ length: count }, (_, i) =>
    birthday(
      `b${i}`,
      `Person ${i}`,
      `1990-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      importance,
    ),
  );
}

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.setSystemTime(TODAY);
  scheduleMock.mockReset();
  cancelMock.mockReset();
  // Reset rather than cleared, because the tests below hand it one-off answers
  // and a leftover "denied" would quietly disarm every test after it.
  permissionMock.mockReset();
  permissionMock.mockResolvedValue({ status: 'granted', granted: true });
  __resetNotificationSyncState();
});

describe('what the plan contains', () => {
  it('always books the day itself, whatever the importance', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'low')]);

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].leadDays).toBe(0);
    expect(scheduled[0].slot).toEqual({ month: 8, day: 3 });
  });

  it('adds one early warning for medium, three days out', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'medium')]);

    expect(scheduled.map((r) => r.leadDays).sort()).toEqual([0, 3]);
    expect(scheduled.find((r) => r.leadDays === 3)!.slot).toEqual({ month: 7, day: 31 });
  });

  it('adds one early warning for high, a week out', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'high')]);

    expect(scheduled.map((r) => r.leadDays).sort()).toEqual([0, 7]);
    expect(scheduled.find((r) => r.leadDays === 7)!.slot).toEqual({ month: 7, day: 27 });
  });

  it('lets an early warning cross back into the previous month', () => {
    // 2 August, a week earlier, is 26 July.
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Rowan', '1988-08-02', 'high')]);

    expect(scheduled.find((r) => r.leadDays === 7)!.slot).toEqual({ month: 7, day: 26 });
  });

  it('moves a 29 February reminder to the 28th', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Wren', '2000-02-29', 'low')]);

    expect(scheduled[0].slot).toEqual({ month: 2, day: 28 });
  });

  it('schedules every reminder at the reminder hour', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'high')]);

    expect(scheduled.every((r) => r.hour === REMINDER_HOUR)).toBe(true);
  });

  it('works from a birthday with no year at all', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Sam', '1000-03-09', 'medium')]);

    expect(scheduled.map((r) => r.slot)).toEqual(
      expect.arrayContaining([{ month: 3, day: 9 }, { month: 3, day: 6 }]),
    );
  });
});

describe('what the reminders say', () => {
  it('names the person on the day', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'low')]);

    expect(scheduled[0].title).toContain('Eleanor');
    expect(scheduled[0].body).toContain('Eleanor');
  });

  it('never speaks an age, because a yearly slot repeats its text forever', () => {
    // Eleanor turns 36 in 2026. Saying so in a repeating trigger would still be
    // saying it in 2027.
    const b = birthday('b1', 'Eleanor', '1990-08-03', 'high');
    expect(b.turningAge).toBe(36);

    const { scheduled } = planBirthdayNotifications([b]);
    expect(scheduled.every((r) => !r.body.includes('36'))).toBe(true);
  });

  it('gives the day and the early warning different words', () => {
    const { scheduled } = planBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'medium')]);

    const onTheDay = scheduled.find((r) => r.leadDays === 0)!;
    const early = scheduled.find((r) => r.leadDays === 3)!;

    expect(early.body).not.toBe(onTheDay.body);
    expect(early.body).toContain('3');
  });
});

describe('the budget', () => {
  it('never books more than the budget allows', () => {
    const { scheduled } = planBirthdayNotifications(many(50, 'high'));

    expect(scheduled.length).toBeLessThanOrEqual(MAX_NOTIFICATIONS);
  });

  it('takes the early warnings from everyone before the day itself from anyone', () => {
    const plan = planBirthdayNotifications(many(50, 'high'));
    const dayOf = plan.scheduled.filter((r) => r.leadDays === 0);

    expect(dayOf).toHaveLength(50);
    expect(plan.dropped).toBe(50 * 2 - MAX_NOTIFICATIONS);
  });

  it('reports nothing dropped when everything fits', () => {
    expect(planBirthdayNotifications(many(5, 'high')).dropped).toBe(0);
  });

  it('keeps the soonest birthdays when the day-of reminders alone overflow', () => {
    const list = many(80, 'low');
    const plan = planBirthdayNotifications(list);
    const soonest = [...list].sort((a, b) => a.daysAway - b.daysAway)[0];

    expect(plan.scheduled).toHaveLength(MAX_NOTIFICATIONS);
    expect(plan.scheduled.some((r) => r.id === `bd_${soonest.id}_0`)).toBe(true);
  });
});

describe('what actually reaches expo', () => {
  it('gives every trigger an explicit yearly type', async () => {
    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'high')], true);

    expect(scheduleMock).toHaveBeenCalledTimes(2);
    for (const [{ trigger }] of scheduleMock.mock.calls) {
      // A trigger with no `type` is the bug this whole file exists for: expo
      // walks past every schedulable branch and delivers it on the spot.
      expect(trigger.type).toBe(Notifications.SchedulableTriggerInputTypes.YEARLY);
      expect(trigger.hour).toBe(REMINDER_HOUR);
    }
  });

  it('counts months from zero, the way expo does', async () => {
    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'low')], true);

    const { trigger } = scheduleMock.mock.calls[0][0];
    expect(trigger.month).toBe(7); // August
    expect(trigger.day).toBe(3);
  });

  it('cancels everything before rescheduling', async () => {
    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'low')], true);

    expect(cancelMock).toHaveBeenCalled();
  });

  it('schedules nothing at all when reminders are switched off', async () => {
    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'high')], false);

    expect(scheduleMock).not.toHaveBeenCalled();
    expect(cancelMock).toHaveBeenCalled();
  });

  it('does no work when the plan has not changed', async () => {
    const list = [birthday('b1', 'Eleanor', '1990-08-03', 'low')];

    await syncBirthdayNotifications(list, true);
    scheduleMock.mockClear();

    await syncBirthdayNotifications(list, true);
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('reschedules when a birthday actually changes', async () => {
    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'low')], true);
    scheduleMock.mockClear();

    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'high')], true);
    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });

  it('tries again after a reminder fails to book', async () => {
    // The whole point of the signature is to skip repeat work. A run that
    // failed has not done the work, so it must not be skippable — otherwise one
    // transient error costs the user their reminders until something unrelated
    // changes the plan.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const list = [birthday('b1', 'Eleanor', '1990-08-03', 'high')];

    scheduleMock.mockRejectedValueOnce(new Error('no room at the inn'));
    await syncBirthdayNotifications(list, true);
    scheduleMock.mockClear();

    await syncBirthdayNotifications(list, true);
    expect(scheduleMock).toHaveBeenCalledTimes(2);

    warn.mockRestore();
  });

  it('still records a clean run, so an identical one is skipped', async () => {
    const list = [birthday('b1', 'Eleanor', '1990-08-03', 'high')];

    await syncBirthdayNotifications(list, true);
    scheduleMock.mockClear();

    await syncBirthdayNotifications(list, true);
    expect(scheduleMock).not.toHaveBeenCalled();
  });
});

describe('permission', () => {
  it('books nothing without it', async () => {
    permissionMock.mockResolvedValue({ status: 'denied', granted: false });

    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'high')], true);

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('leaves the existing schedule alone rather than cancelling it', async () => {
    // Permission is asked for on a different timeline than the first data load,
    // so this runs while the prompt is still on screen. Cancelling there would
    // throw away a schedule booked in an earlier session for nothing.
    permissionMock.mockResolvedValue({ status: 'undetermined', granted: false });

    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'high')], true);

    expect(cancelMock).not.toHaveBeenCalled();
  });

  it('books everything on the sync that follows the grant', async () => {
    const list = [birthday('b1', 'Eleanor', '1990-08-03', 'high')];

    permissionMock.mockResolvedValue({ status: 'denied', granted: false });
    await syncBirthdayNotifications(list, true);

    // Same list, so nothing about the plan has changed — only the answer from
    // the OS. The refused run must not have counted as applied.
    permissionMock.mockResolvedValue({ status: 'granted', granted: true });
    await syncBirthdayNotifications(list, true);

    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });

  it('goes ahead when the permission cannot be read at all', async () => {
    // Unreadable is not refused. Trying and failing is recoverable; assuming
    // refusal silently books nothing forever.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    permissionMock.mockRejectedValue(new Error('module not ready'));

    await syncBirthdayNotifications([birthday('b1', 'Eleanor', '1990-08-03', 'low')], true);

    expect(scheduleMock).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('the slot a yearly trigger is pinned to', () => {
  // A yearly trigger is one fixed month and day. Working the lead time out from
  // whichever year happens to be next means a leap year gives a different
  // answer, and which answer got written depends on when the app was last
  // opened. These pin it down.

  const slotFor = (importance: Importance, date: string, leadDays: number) =>
    planBirthdayNotifications([birthday('b1', 'Ada', date, importance)]).scheduled.find(
      (r) => r.leadDays === leadDays,
    )!.slot;

  it('puts a week before 5 March on 26 February, whatever year it is read in', () => {
    // Next occurrence lands in 2027, a common year.
    expect(slotFor('high', '1990-03-05', 7)).toEqual({ month: 2, day: 26 });

    // Next occurrence lands in 2028, a leap year — and the answer must not move.
    jest.setSystemTime(new Date(2027, 6, 15));
    expect(slotFor('high', '1990-03-05', 7)).toEqual({ month: 2, day: 26 });
  });

  it('lets an early warning fall back into the previous year', () => {
    expect(slotFor('high', '1990-01-02', 7)).toEqual({ month: 12, day: 26 });
  });

  it('gives a 29 February birthday a stable pair of slots', () => {
    expect(slotFor('medium', '2000-02-29', 0)).toEqual({ month: 2, day: 28 });
    expect(slotFor('medium', '2000-02-29', 3)).toEqual({ month: 2, day: 25 });

    jest.setSystemTime(new Date(2027, 6, 15));
    expect(slotFor('medium', '2000-02-29', 0)).toEqual({ month: 2, day: 28 });
    expect(slotFor('medium', '2000-02-29', 3)).toEqual({ month: 2, day: 25 });
  });

  it('never lands on 29 February, which most years do not have', () => {
    // 3 March less three days is 29 February in a leap year.
    expect(slotFor('medium', '1990-03-03', 3)).toEqual({ month: 2, day: 28 });
  });
});
