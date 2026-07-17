// Reminder ("gentle nudge") options and storage format.
//
// Nudges are persisted as a plain string array — either a preset key such as
// '1_week', or an absolute 'YYYY-MM-DD' date. Screens keep a richer shape while
// editing (so they can show a label), so anything reading nudges back out of the
// database has to go through parseNudge.

export const PRESET_REMINDERS = [
  { label: 'Day Of', value: 'day_of' },
  { label: '1 Day Before', value: '1_day' },
  { label: '3 Days Before', value: '3_days' },
  { label: '1 Week Before', value: '1_week' },
  { label: '2 Weeks Before', value: '2_weeks' },
  { label: '1 Month Before', value: '1_month' },
  { label: '2 Months Before', value: '2_months' },
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Nudge = {
  type: 'preset' | 'custom';
  label: string;
  value: string; // preset key, or YYYY-MM-DD for custom
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatCustomDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

// Accepts either the stored string form or an already-shaped Nudge object, so
// rows written before the format settled still resolve.
export function parseNudge(raw: unknown): Nudge | null {
  if (typeof raw === 'string') {
    if (raw in PRESET_OFFSET_DAYS) {
      const preset = PRESET_REMINDERS.find((p) => p.value === raw);
      return { type: 'preset', label: preset?.label ?? raw, value: raw };
    }
    if (ISO_DATE.test(raw)) {
      return { type: 'custom', label: formatCustomDate(raw), value: raw };
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

export function serializeNudges(nudges: Nudge[]): string[] {
  return nudges.map((n) => n.value);
}
