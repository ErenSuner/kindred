import i18n from '@/lib/i18n';
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

export function isRepeating(r: Recurrence) {
  return r.unit !== 'none';
}

// "Every year" / "Her yıl", "Every 3 weeks" / "3 haftada bir", "One-time"
export function recurrenceLabel(r: Recurrence): string {
  if (r.unit === 'none') return i18n.t('rec_one_time');
  if (r.interval === 1) return i18n.t('rec_every_one', { unit: i18n.t(`unit_${r.unit}`) });
  return i18n.t('rec_every_n', { n: r.interval, unit: i18n.t(`unit_${r.unit}s`) });
}

// Short form for chips and list rows: "Yearly" / "Yıllık", "Every 3 weeks"
export function recurrenceShortLabel(r: Recurrence): string {
  if (r.unit === 'none') return i18n.t('rec_one_time');
  if (r.interval === 1) {
    const key = { day: 'rec_daily', week: 'rec_weekly', month: 'rec_monthly', year: 'rec_annual' }[r.unit];
    return i18n.t(key);
  }
  return i18n.t('rec_every_n', { n: r.interval, unit: i18n.t(`unit_${r.unit}s`) });
}

export function recurrenceIcon(r: Recurrence): 'event' | 'event-repeat' {
  return r.unit === 'none' ? 'event' : 'event-repeat';
}

export function recurrenceDescription(r: Recurrence): string {
  if (r.unit === 'none') return i18n.t('rec_desc_once');
  const one = r.interval === 1;
  const key = `rec_desc_${r.unit}${one ? '' : 's'}`;
  return one ? i18n.t(key) : i18n.t(key, { n: r.interval });
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
