import {
  DAILY,
  MONTHLY,
  ONE_TIME,
  WEEKLY,
  YEARLY,
  isRepeating,
  parseRecurrence,
  recurrenceLabel,
  recurrenceShortLabel,
  serializeRecurrence,
} from '@/utils/recurrence';

describe('labels', () => {
  it('names the plain cycles', () => {
    expect(recurrenceLabel(ONE_TIME)).toBe('One-time');
    expect(recurrenceLabel(DAILY)).toBe('Every day');
    expect(recurrenceLabel(YEARLY)).toBe('Every year');
  });

  it('pluralises an interval', () => {
    expect(recurrenceLabel({ unit: 'week', interval: 3 })).toBe('Every 3 weeks');
    expect(recurrenceLabel({ unit: 'day', interval: 2 })).toBe('Every 2 days');
  });

  it('has a short form for chips', () => {
    expect(recurrenceShortLabel(DAILY)).toBe('Daily');
    expect(recurrenceShortLabel(WEEKLY)).toBe('Weekly');
    expect(recurrenceShortLabel(MONTHLY)).toBe('Monthly');
    expect(recurrenceShortLabel(YEARLY)).toBe('Annual');
    expect(recurrenceShortLabel({ unit: 'month', interval: 2 })).toBe('Every 2 months');
  });
});

describe('isRepeating', () => {
  it('is false only for a one-time event', () => {
    expect(isRepeating(ONE_TIME)).toBe(false);
    expect(isRepeating(DAILY)).toBe(true);
  });
});

describe('parseRecurrence', () => {
  it('reads the stored columns', () => {
    expect(parseRecurrence({ repeat_unit: 'day', repeat_interval: 4 })).toEqual({ unit: 'day', interval: 4 });
  });

  it('forces a one-time event to interval 1', () => {
    expect(parseRecurrence({ repeat_unit: 'none', repeat_interval: 9 })).toEqual({ unit: 'none', interval: 1 });
  });

  it('clamps an interval outside the allowed range', () => {
    expect(parseRecurrence({ repeat_unit: 'week', repeat_interval: 0 }).interval).toBe(1);
    expect(parseRecurrence({ repeat_unit: 'week', repeat_interval: 999 }).interval).toBe(30);
  });

  it('falls back to the old is_annual boolean', () => {
    expect(parseRecurrence({ is_annual: true })).toEqual(YEARLY);
    expect(parseRecurrence({ is_annual: false })).toEqual(ONE_TIME);
  });

  it('treats an unrecognised unit as yearly', () => {
    expect(parseRecurrence({ repeat_unit: 'fortnight' })).toEqual(YEARLY);
    expect(parseRecurrence({})).toEqual(YEARLY);
  });
});

describe('serializeRecurrence', () => {
  it('round-trips through parse', () => {
    const original = { unit: 'day' as const, interval: 5 };
    expect(parseRecurrence(serializeRecurrence(original))).toEqual(original);
  });

  it('writes interval 1 for a one-time event whatever it was given', () => {
    expect(serializeRecurrence({ unit: 'none', interval: 7 })).toEqual({
      repeat_unit: 'none',
      repeat_interval: 1,
    });
  });
});
