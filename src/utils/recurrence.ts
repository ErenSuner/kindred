// How often a date comes back around.
//
// Kindred only has birthdays now, so in practice this is always YEARLY. The
// type survives because the occurrence arithmetic in `dates.ts` is written
// against it — and that arithmetic is worth more than the handful of lines
// saved by hardcoding a year into it. The other constants are exercised by
// dates.test.ts, which is what keeps the leap-year and month-clamping cases
// honest.

export type RepeatUnit = 'none' | 'day' | 'week' | 'month' | 'year';

export type Recurrence = {
  unit: RepeatUnit;
  interval: number; // ignored when unit is 'none'
};

export const ONE_TIME: Recurrence = { unit: 'none', interval: 1 };
export const YEARLY: Recurrence = { unit: 'year', interval: 1 };
export const MONTHLY: Recurrence = { unit: 'month', interval: 1 };
export const WEEKLY: Recurrence = { unit: 'week', interval: 1 };
export const DAILY: Recurrence = { unit: 'day', interval: 1 };
