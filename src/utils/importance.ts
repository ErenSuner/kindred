import { DAY_OF, PRESET_OFFSET_DAYS } from '@/utils/nudges';

// How much warning a birthday gets.
//
// The app used to let you pick any combination of up to four lead times, which
// meant every birthday needed a small editing session and most of them got the
// default anyway. It is one slider now: how much this one matters.
//
// There is no importance column. The level is stored in the `nudges text[]`
// column that was already there, as the preset the level means — so the
// notification scheduler needs to know nothing about importance at all, and
// rows written by the old app read back as whichever level is nearest.

export type Importance = 'low' | 'medium' | 'high';

// Low first: the slider reads left-to-right as "how much warning".
export const IMPORTANCE_ORDER: Importance[] = ['low', 'medium', 'high'];

export const DEFAULT_IMPORTANCE: Importance = 'medium';

// The day itself is always in the list — see ALWAYS_ON_NUDGES. What separates
// the levels is the single earlier warning that comes with it.
const LEAD_PRESET: Record<Importance, string | null> = {
  low: null,
  medium: '3_days',
  high: '1_week',
};

export function nudgesForImportance(importance: Importance): string[] {
  const lead = LEAD_PRESET[importance];
  return lead ? [lead, DAY_OF] : [DAY_OF];
}

// How many days before the birthday the early warning lands. Zero for `low`,
// which only gets the morning of.
export function leadDaysFor(importance: Importance): number {
  const lead = LEAD_PRESET[importance];
  return lead ? (PRESET_OFFSET_DAYS[lead] ?? 0) : 0;
}

// Reads a stored row back. Anything unrecognised — an old custom lead time, a
// legacy absolute date, a null column — resolves by how far ahead its earliest
// reminder was, so nobody's saved birthday silently loses its warning.
export function importanceFromNudges(raw: unknown): Importance {
  if (!Array.isArray(raw)) return 'low';

  let furthest = 0;
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const offset = PRESET_OFFSET_DAYS[value];
    if (typeof offset === 'number' && offset > furthest) furthest = offset;
    // A custom lead time, from the version that allowed them.
    const lead = /^lead:(\d{1,3}):(day|week|month)$/.exec(value);
    if (lead) {
      const days = Number(lead[1]) * { day: 1, week: 7, month: 30 }[lead[2] as 'day' | 'week' | 'month'];
      if (days > furthest) furthest = days;
    }
  }

  if (furthest >= PRESET_OFFSET_DAYS['1_week']) return 'high';
  if (furthest > 0) return 'medium';
  return 'low';
}

