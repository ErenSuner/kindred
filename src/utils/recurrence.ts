// How often an event comes back around.
//
// Stored as two columns rather than a boolean so "every 3 weeks" is expressible
// alongside the common yearly case. A unit of 'none' is a one-time event.

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

export const MAX_INTERVAL = 30;

const UNIT_NAMES: Record<Exclude<RepeatUnit, 'none'>, [string, string]> = {
  day: ['day', 'days'],
  week: ['week', 'weeks'],
  month: ['month', 'months'],
  year: ['year', 'years'],
};

export function isRepeating(r: Recurrence) {
  return r.unit !== 'none';
}

// "Every year", "Every 3 weeks", "One-time"
export function recurrenceLabel(r: Recurrence): string {
  if (r.unit === 'none') return 'One-time';
  const [singular, plural] = UNIT_NAMES[r.unit];
  return r.interval === 1 ? `Every ${singular}` : `Every ${r.interval} ${plural}`;
}

// Short form for chips and list rows: "Yearly", "Every 3 weeks"
export function recurrenceShortLabel(r: Recurrence): string {
  if (r.unit === 'none') return 'One-time';
  if (r.interval === 1) {
    return { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Annual' }[r.unit];
  }
  const [, plural] = UNIT_NAMES[r.unit];
  return `Every ${r.interval} ${plural}`;
}

export function recurrenceIcon(r: Recurrence): 'event' | 'event-repeat' {
  return r.unit === 'none' ? 'event' : 'event-repeat';
}

export function recurrenceDescription(r: Recurrence): string {
  switch (r.unit) {
    case 'none':
      return 'This event will happen only once.';
    case 'day':
      return r.interval === 1 ? 'This event repeats every day.' : `This event repeats every ${r.interval} days.`;
    case 'week':
      return r.interval === 1 ? 'This event repeats every week.' : `This event repeats every ${r.interval} weeks.`;
    case 'month':
      return r.interval === 1 ? 'This event repeats every month.' : `This event repeats every ${r.interval} months.`;
    case 'year':
      return r.interval === 1 ? 'This event repeats every year.' : `This event repeats every ${r.interval} years.`;
  }
}

function clampInterval(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 1;
  return Math.min(MAX_INTERVAL, Math.max(1, Math.round(num)));
}

// Reads whatever the database row happens to carry. Rows written before
// recurrence existed only have is_annual, so fall back to that.
export function parseRecurrence(row: { repeat_unit?: unknown; repeat_interval?: unknown; is_annual?: unknown }): Recurrence {
  const unit = row.repeat_unit;
  if (unit === 'none' || unit === 'day' || unit === 'week' || unit === 'month' || unit === 'year') {
    return { unit, interval: unit === 'none' ? 1 : clampInterval(row.repeat_interval) };
  }
  if (row.is_annual === false) return ONE_TIME;
  return YEARLY;
}

export function serializeRecurrence(r: Recurrence) {
  return {
    repeat_unit: r.unit,
    repeat_interval: r.unit === 'none' ? 1 : clampInterval(r.interval),
  };
}
