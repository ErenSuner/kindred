import {
  SKIPPED_YEAR,
  getNextOccurrence,
  getPastOccurrences,
  getUpcomingOccurrences,
  getOrdinal,
  toISODate,
} from '@/utils/dates';
import { DAILY, MONTHLY, ONE_TIME, WEEKLY, YEARLY } from '@/utils/recurrence';

// Every one of these depends on "today", so today is pinned. Picked a Wednesday
// mid-month so month-end clamping and weekday maths both have room either side.
const TODAY = new Date(2026, 6, 15); // Wed 15 July 2026

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterAll(() => {
  jest.useRealTimers();
});

const iso = (d: Date) => toISODate(d);

describe('getOrdinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'],
    [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'], [31, '31st'],
  ])('%i is %s', (n, expected) => {
    expect(getOrdinal(n)).toBe(expected);
  });
});

describe('getNextOccurrence', () => {
  it('returns today when the date is today', () => {
    expect(getNextOccurrence('2026-07-15', YEARLY).daysAway).toBe(0);
  });

  it('rolls a yearly date that has passed into next year', () => {
    const next = getNextOccurrence('1990-03-02', YEARLY);
    expect(iso(next.date)).toBe('2027-03-02');
  });

  it('keeps a yearly date still to come in this year', () => {
    const next = getNextOccurrence('1990-12-02', YEARLY);
    expect(iso(next.date)).toBe('2026-12-02');
  });

  it('leaves a passed one-time date in the past', () => {
    const next = getNextOccurrence('2026-01-05', ONE_TIME);
    expect(iso(next.date)).toBe('2026-01-05');
    expect(next.daysAway).toBeLessThan(0);
  });

  it('steps a daily cycle to tomorrow once today is used up', () => {
    // Anchored yesterday, so the next one due is today.
    expect(getNextOccurrence('2026-07-14', DAILY).daysAway).toBe(0);
    // Every 3 days from the 14th: 14, 17, 20 — the 17th is next.
    expect(iso(getNextOccurrence('2026-07-14', { unit: 'day', interval: 3 }).date)).toBe('2026-07-17');
  });

  it('lands a weekly cycle on the same weekday', () => {
    const next = getNextOccurrence('2026-06-03', WEEKLY); // a Wednesday
    expect(next.date.getDay()).toBe(3);
    expect(iso(next.date)).toBe('2026-07-15');
  });

  it('clamps a month-end anchor into shorter months', () => {
    // 31 Jan + 1 month has to be 28 Feb, not 3 March.
    const dates = getUpcomingOccurrences('2026-01-31', MONTHLY, 3, new Date(2026, 0, 31));
    expect(dates.map(iso)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('anchors a repeating date with no year to this year', () => {
    const next = getNextOccurrence(`${SKIPPED_YEAR}-12-25`, YEARLY);
    expect(next.date.getFullYear()).toBe(2026);
    expect(next.turningAge).toBeUndefined();
  });
});

describe('turningAge', () => {
  it('is withheld unless the caller asks for it', () => {
    // This is what put "(Turning 1)" on anniversaries.
    expect(getNextOccurrence('2026-02-03', YEARLY).turningAge).toBeUndefined();
  });

  it('counts years since the anchor for a birthday', () => {
    expect(getNextOccurrence('1990-12-02', YEARLY, true).turningAge).toBe(36);
  });

  it('stays undefined when the year was skipped', () => {
    expect(getNextOccurrence(`${SKIPPED_YEAR}-12-02`, YEARLY, true).turningAge).toBeUndefined();
  });

  it('stays undefined for a cycle that is not yearly', () => {
    expect(getNextOccurrence('2020-12-02', MONTHLY, true).turningAge).toBeUndefined();
  });
});

describe('getUpcomingOccurrences', () => {
  it('yields nothing for a one-time date already gone', () => {
    expect(getUpcomingOccurrences('2026-01-05', ONE_TIME, 5)).toEqual([]);
  });

  it('yields exactly one for a one-time date still ahead', () => {
    expect(getUpcomingOccurrences('2026-09-05', ONE_TIME, 5).map(iso)).toEqual(['2026-09-05']);
  });

  it('walks a weekly cycle forward', () => {
    expect(getUpcomingOccurrences('2026-07-15', WEEKLY, 3).map(iso)).toEqual([
      '2026-07-15', '2026-07-22', '2026-07-29',
    ]);
  });
});

describe('getPastOccurrences', () => {
  it('never reaches back past the anchor', () => {
    // Anchored 2025, so there is exactly one past occurrence, not two.
    const past = getPastOccurrences('2025-03-02', YEARLY, 5);
    expect(past.map(iso)).toEqual(['2026-03-02', '2025-03-02']);
  });

  it('returns newest first', () => {
    const past = getPastOccurrences('2020-01-10', YEARLY, 3);
    expect(past.map(iso)).toEqual(['2026-01-10', '2025-01-10', '2024-01-10']);
  });

  it('is empty for a one-time date still ahead', () => {
    expect(getPastOccurrences('2026-09-05', ONE_TIME, 3)).toEqual([]);
  });
});
