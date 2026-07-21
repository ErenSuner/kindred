// The little "Today / Tomorrow / in 3 days" strings, in one place so every
// screen phrases and localizes them the same way.

import i18n from '@/lib/i18n';

// Chip form: "Today", "Tomorrow", "3 days".
export function daysChipLabel(daysAway: number): string {
  if (daysAway === 0) return i18n.t('today');
  if (daysAway === 1) return i18n.t('tomorrow');
  return i18n.t('days_n', { n: daysAway });
}

// Sentence form: "Today", "Tomorrow", "in 3 days".
export function daysLongLabel(daysAway: number): string {
  if (daysAway === 0) return i18n.t('today');
  if (daysAway === 1) return i18n.t('tomorrow');
  return i18n.t('in_days', { n: daysAway });
}

// Past form: "3 days ago".
export function daysAgoLabel(daysAway: number): string {
  return i18n.t('days_ago', { n: Math.abs(daysAway) });
}
