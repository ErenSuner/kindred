import {
  DAY_OF,
  MAX_LEAD_AMOUNT,
  MAX_LEAD_PICK,
  clampLead,
  leadLabel,
  leadValue,
  offsetDaysFor,
  parseLead,
  parseNudge,
  parseNudges,
  serializeNudges,
} from '@/utils/nudges';

describe('lead times', () => {
  it('builds and reads back its own value', () => {
    expect(parseLead(leadValue(3, 'week'))).toEqual({ amount: 3, unit: 'week' });
  });

  it('is null for anything that is not a lead', () => {
    expect(parseLead('1_week')).toBeNull();
    expect(parseLead('2026-05-01')).toBeNull();
  });

  it('reads a value written when the picker went to 60', () => {
    // The picker only offers 6 now, but old rows must not be clamped down.
    expect(MAX_LEAD_PICK).toBeLessThan(MAX_LEAD_AMOUNT);
    expect(parseLead('lead:30:day')).toEqual({ amount: 30, unit: 'day' });
  });

  it('singularises a lead of one', () => {
    expect(leadLabel(1, 'day')).toBe('1 day before');
    expect(leadLabel(2, 'day')).toBe('2 days before');
  });
});

describe('clampLead', () => {
  it('keeps a value inside the stored range', () => {
    expect(clampLead(0)).toBe(1);
    expect(clampLead(1000)).toBe(MAX_LEAD_AMOUNT);
    expect(clampLead(4)).toBe(4);
  });

  it('falls back to 1 for nonsense', () => {
    expect(clampLead(NaN)).toBe(1);
    expect(clampLead(Infinity)).toBe(1);
  });
});

describe('offsetDaysFor', () => {
  it('is zero on the day itself', () => {
    expect(offsetDaysFor({ type: 'preset', label: '', value: DAY_OF })).toBe(0);
  });

  it('converts a lead unit into days', () => {
    expect(offsetDaysFor({ type: 'lead', label: '', value: 'lead:2:week' })).toBe(14);
    expect(offsetDaysFor({ type: 'lead', label: '', value: 'lead:3:day' })).toBe(3);
  });

  it('has no offset for a pinned date', () => {
    expect(offsetDaysFor({ type: 'date', label: '', value: '2026-05-01' })).toBeNull();
  });
});

describe('parseNudge', () => {
  it('recognises a preset', () => {
    expect(parseNudge('1_week')).toEqual({ type: 'preset', label: '1 week before', value: '1_week' });
  });

  it('recognises a legacy absolute date', () => {
    expect(parseNudge('2026-05-01')?.type).toBe('date');
  });

  it('unwraps an object that was stored whole', () => {
    expect(parseNudge({ value: '1_day', label: 'whatever' })?.value).toBe('1_day');
  });

  it('rejects junk', () => {
    expect(parseNudge('sometime')).toBeNull();
    expect(parseNudge(null)).toBeNull();
  });
});

describe('parseNudges', () => {
  it('drops what it cannot read instead of failing', () => {
    expect(parseNudges(['1_day', 'nonsense', '3_days'])).toHaveLength(2);
  });

  it('is empty for a non-array', () => {
    expect(parseNudges(undefined)).toEqual([]);
  });
});

describe('serializeNudges', () => {
  it('adds the day-of reminder even when it was not chosen', () => {
    const out = serializeNudges([{ type: 'preset', label: '', value: '1_day' }]);
    expect(out).toContain(DAY_OF);
  });

  it('sorts furthest out first, with the day itself last', () => {
    const out = serializeNudges([
      { type: 'preset', label: '', value: '1_day' },
      { type: 'preset', label: '', value: '1_month' },
      { type: 'preset', label: '', value: '1_week' },
    ]);
    expect(out).toEqual(['1_month', '1_week', '1_day', DAY_OF]);
  });

  it('does not repeat the day-of reminder', () => {
    const out = serializeNudges([{ type: 'preset', label: '', value: DAY_OF }]);
    expect(out.filter((v) => v === DAY_OF)).toHaveLength(1);
  });
});
