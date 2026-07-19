// Reminder ("gentle nudge") options and storage format.
//
// A nudge is always "some amount of time before the day". It is persisted as a
// plain string, in one of three forms:
//
//   'day_of', '1_week', …   a preset key
//   'lead:4:day'            a custom lead time, N days/weeks/months before
//   '2026-05-01'            an absolute date (legacy — no longer written)
//
// Screens keep a richer shape while editing so they can show a label, so
// anything reading nudges back out of the database goes through parseNudge.

export const DAY_OF = 'day_of';

// The day itself is not optional: an event arriving with no warning at all
// defeats the point of the app. It is scheduled whether or not it was chosen,
// and the editor shows it as fixed rather than letting it be switched off.
export const ALWAYS_ON_NUDGES = [DAY_OF];

export const PRESET_REMINDERS = [
  { label: 'Day of', value: DAY_OF },
  { label: '1 day before', value: '1_day' },
  { label: '3 days before', value: '3_days' },
  { label: '1 week before', value: '1_week' },
  { label: '2 weeks before', value: '2_weeks' },
  { label: '1 month before', value: '1_month' },
  { label: '2 months before', value: '2_months' },
] as const;

export const PRESET_OFFSET_DAYS: Record<string, number> = {
  day_of: 0,
  '1_day': 1,
  '3_days': 3,
  '1_week': 7,
  '2_weeks': 14,
  '1_month': 30,
  '2_months': 60,
};

export type LeadUnit = 'day' | 'week' | 'month';

export const LEAD_UNITS: { label: string; plural: string; value: LeadUnit; days: number }[] = [
  { label: 'day', plural: 'days', value: 'day', days: 1 },
  { label: 'week', plural: 'weeks', value: 'week', days: 7 },
  { label: 'month', plural: 'months', value: 'month', days: 30 },
];

// What the picker offers. Six is as far as it's worth going: beyond six months
// you'd pick a bigger unit, and a week is only ever seven days.
export const MAX_LEAD_PICK = 6;

// What a stored value is allowed to be. Kept wide so a reminder saved back when
// the picker went to 60 still reads back as itself instead of being silently
// clamped down to six.
export const MAX_LEAD_AMOUNT = 60;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LEAD = /^lead:(\d{1,3}):(day|week|month)$/;

export type Nudge = {
  // 'preset' — one of the fixed options; 'lead' — a custom amount of time
  // before; 'date' — a legacy absolute date.
  type: 'preset' | 'lead' | 'date';
  label: string;
  value: string;
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatCustomDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

export function leadValue(amount: number, unit: LeadUnit): string {
  return `lead:${clampLead(amount)}:${unit}`;
}

export function leadLabel(amount: number, unit: LeadUnit): string {
  const spec = LEAD_UNITS.find((u) => u.value === unit) ?? LEAD_UNITS[0];
  return `${amount} ${amount === 1 ? spec.label : spec.plural} before`;
}

export function clampLead(amount: number): number {
  if (!Number.isFinite(amount)) return 1;
  return Math.min(MAX_LEAD_AMOUNT, Math.max(1, Math.round(amount)));
}

export function parseLead(value: string): { amount: number; unit: LeadUnit } | null {
  const match = LEAD.exec(value);
  if (!match) return null;
  return { amount: clampLead(Number(match[1])), unit: match[2] as LeadUnit };
}

// How many days before the occurrence this nudge fires. Absolute dates have no
// offset — they are pinned to their own date.
export function offsetDaysFor(nudge: Nudge): number | null {
  if (nudge.type === 'preset') return PRESET_OFFSET_DAYS[nudge.value] ?? 0;
  if (nudge.type === 'lead') {
    const lead = parseLead(nudge.value);
    if (!lead) return null;
    const spec = LEAD_UNITS.find((u) => u.value === lead.unit) ?? LEAD_UNITS[0];
    return lead.amount * spec.days;
  }
  return null;
}

// Accepts either the stored string form or an already-shaped Nudge object, so
// rows written before the format settled still resolve.
export function parseNudge(raw: unknown): Nudge | null {
  if (typeof raw === 'string') {
    if (raw in PRESET_OFFSET_DAYS) {
      const preset = PRESET_REMINDERS.find((p) => p.value === raw);
      return { type: 'preset', label: preset?.label ?? raw, value: raw };
    }

    const lead = parseLead(raw);
    if (lead) {
      return { type: 'lead', label: leadLabel(lead.amount, lead.unit), value: raw };
    }

    if (ISO_DATE.test(raw)) {
      return { type: 'date', label: formatCustomDate(raw), value: raw };
    }
    return null;
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const value = typeof obj.value === 'string' ? obj.value : undefined;
    if (!value) return null;
    return parseNudge(value);
  }

  return null;
}

export function parseNudges(raw: unknown): Nudge[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseNudge).filter((n): n is Nudge => n !== null);
}

// Guarantees the day-of reminder is present, sorted furthest-out first so the
// list reads as a run-up to the day.
export function serializeNudges(nudges: Nudge[]): string[] {
  const values = new Set(nudges.map((n) => n.value));
  for (const always of ALWAYS_ON_NUDGES) values.add(always);

  return [...values].sort((a, b) => {
    const aOffset = offsetDaysFor(parseNudge(a) ?? { type: 'preset', label: '', value: a }) ?? 0;
    const bOffset = offsetDaysFor(parseNudge(b) ?? { type: 'preset', label: '', value: b }) ?? 0;
    return bOffset - aOffset;
  });
}
