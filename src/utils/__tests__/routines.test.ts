import {
  Weekday,
  isRoutine,
  nextRoutineDate,
  parseWeekdays,
  sortWeekdays,
  upcomingRoutineDates,
  weekdaysLabel,
} from '@/utils/routines';
import { toISODate } from '@/utils/dates';

const TODAY = new Date(2026, 6, 15); // Wed 15 July 2026

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('sortWeekdays', () => {
  it('puts Monday first and Sunday last', () => {
    expect(sortWeekdays([0, 3, 1])).toEqual([1, 3, 0]);
  });

  it('drops duplicates', () => {
    expect(sortWeekdays([2, 2, 4])).toEqual([2, 4]);
  });
});

describe('parseWeekdays', () => {
  it('returns nothing for a non-array', () => {
    expect(parseWeekdays(null)).toEqual([]);
    expect(parseWeekdays('mon')).toEqual([]);
  });

  it('keeps only whole numbers in range', () => {
    expect(parseWeekdays([1, 7, -1, 2.5, 4])).toEqual([1, 4]);
  });

  it('accepts numeric strings from the database', () => {
    expect(parseWeekdays(['2', '4'])).toEqual([2, 4]);
  });
});

describe('isRoutine', () => {
  it('is false for undefined or empty', () => {
    expect(isRoutine(undefined)).toBe(false);
    expect(isRoutine([])).toBe(false);
  });

  it('is true once a day is picked', () => {
    expect(isRoutine([3])).toBe(true);
  });
});

describe('weekdaysLabel', () => {
  it.each<[Weekday[], string]>([
    [[], 'No days picked'],
    [[2], 'Every Tue'],
    [[2, 4], 'Tue & Thu'],
    [[1, 3, 5], 'Mon, Wed & Fri'],
    [[0, 1, 2, 3, 4, 5, 6], 'Every day'],
  ])('%j reads as %s', (days, expected) => {
    expect(weekdaysLabel(days)).toBe(expected);
  });

  it('reorders before reading out', () => {
    expect(weekdaysLabel([0, 1])).toBe('Mon & Sun');
  });
});

describe('upcomingRoutineDates', () => {
  it('returns nothing when no day is picked', () => {
    expect(upcomingRoutineDates([], 3)).toEqual([]);
  });

  it('counts today when today is one of the days', () => {
    // The 15th is a Wednesday, weekday 3.
    expect(upcomingRoutineDates([3], 2).map(toISODate)).toEqual(['2026-07-15', '2026-07-22']);
  });

  it('interleaves two days in date order', () => {
    // Tue and Thu, starting from a Wednesday: Thu 16, Tue 21, Thu 23, Tue 28.
    expect(upcomingRoutineDates([2, 4], 4).map(toISODate)).toEqual([
      '2026-07-16', '2026-07-21', '2026-07-23', '2026-07-28',
    ]);
  });

  it('waits nearly a week when the day has just gone', () => {
    // Tuesday was yesterday, so the next is the 21st.
    expect(upcomingRoutineDates([2], 1).map(toISODate)).toEqual(['2026-07-21']);
  });

  it('gives one date per day when every day is picked', () => {
    expect(upcomingRoutineDates([0, 1, 2, 3, 4, 5, 6], 3).map(toISODate)).toEqual([
      '2026-07-15', '2026-07-16', '2026-07-17',
    ]);
  });

  it('always produces the number asked for', () => {
    expect(upcomingRoutineDates([0], 10)).toHaveLength(10);
  });
});

describe('nextRoutineDate', () => {
  it('is null with no days', () => {
    expect(nextRoutineDate([])).toBeNull();
  });

  it('is the first upcoming date', () => {
    expect(toISODate(nextRoutineDate([5]) as Date)).toBe('2026-07-17');
  });
});
