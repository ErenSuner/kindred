// Importance is stored as reminder presets rather than a column of its own, so
// the round trip has to survive rows this version never wrote — the custom lead
// times and legacy formats the app used to allow.

import {
  DEFAULT_IMPORTANCE,
  IMPORTANCE_ORDER,
  importanceFromNudges,
  leadDaysFor,
  nudgesForImportance,
  type Importance,
} from '@/utils/importance';
import { DAY_OF } from '@/utils/nudges';

describe('what each level means', () => {
  it('gives low the day itself and nothing else', () => {
    expect(nudgesForImportance('low')).toEqual([DAY_OF]);
    expect(leadDaysFor('low')).toBe(0);
  });

  it('gives medium three days of warning', () => {
    expect(nudgesForImportance('medium')).toContain('3_days');
    expect(leadDaysFor('medium')).toBe(3);
  });

  it('gives high a week', () => {
    expect(nudgesForImportance('high')).toContain('1_week');
    expect(leadDaysFor('high')).toBe(7);
  });

  it('always includes the day itself', () => {
    for (const level of IMPORTANCE_ORDER) {
      expect(nudgesForImportance(level)).toContain(DAY_OF);
    }
  });

  it('offers the levels in increasing order of warning', () => {
    const leads = IMPORTANCE_ORDER.map(leadDaysFor);
    expect(leads).toEqual([...leads].sort((a, b) => a - b));
  });

  it('has a default that is one of the levels', () => {
    expect(IMPORTANCE_ORDER).toContain(DEFAULT_IMPORTANCE);
  });
});

describe('reading a row back', () => {
  it('round-trips every level', () => {
    for (const level of IMPORTANCE_ORDER) {
      expect(importanceFromNudges(nudgesForImportance(level))).toBe(level);
    }
  });

  it('reads an empty column as low rather than throwing', () => {
    expect(importanceFromNudges([])).toBe('low');
    expect(importanceFromNudges(null)).toBe('low');
    expect(importanceFromNudges(undefined)).toBe('low');
  });

  it('resolves an old custom lead time by how far ahead it was', () => {
    // 'lead:2:week' is fourteen days — further out than a week, so high.
    expect(importanceFromNudges(['day_of', 'lead:2:week'])).toBe('high');
    // Two days is warning, but less than a week: medium.
    expect(importanceFromNudges(['day_of', 'lead:2:day'])).toBe('medium');
  });

  it('resolves an old preset the slider no longer offers', () => {
    expect(importanceFromNudges(['day_of', '1_day'])).toBe('medium');
    expect(importanceFromNudges(['day_of', '1_month'])).toBe('high');
  });

  it('takes the furthest-out reminder when a row has several', () => {
    // The old editor allowed up to four. The user who set a month of warning
    // should not be demoted because a day-of reminder is also in the list.
    expect(importanceFromNudges(['day_of', '1_day', '3_days', '1_month'])).toBe('high');
  });

  it('ignores values it cannot make sense of', () => {
    expect(importanceFromNudges(['day_of', 'nonsense', 42, null])).toBe('low');
  });

  it('reads a legacy absolute date as no warning rather than crashing', () => {
    // These were pinned to their own date and never had a lead time.
    expect(importanceFromNudges(['2026-05-01'])).toBe('low');
  });
});

describe('the type', () => {
  it('lists exactly the three levels', () => {
    const expected: Importance[] = ['low', 'medium', 'high'];
    expect(IMPORTANCE_ORDER).toEqual(expected);
  });
});
