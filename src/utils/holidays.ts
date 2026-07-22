import { Holiday, HolidayRule } from '@/data/holidays';
import { formatOccurrenceDate } from '@/utils/dates';
import i18n from '@/lib/i18n';

// The catalog stores English names, which is what the ids were built from. The
// translated name lives in the locale files under the holiday's own id, and the
// stored name is the fallback — a holiday added to the catalog before its
// translation lands still reads sensibly.
export function holidayName(holiday: Holiday): string {
  return i18n.t(`holiday_${holiday.id}`, { defaultValue: holiday.name });
}

export function holidayBlurb(holiday: Holiday): string {
  return i18n.t(`holiday_blurb_${holiday.id}`, { defaultValue: holiday.blurb });
}

export type UpcomingHoliday = {
  holiday: Holiday;
  date: Date;
  daysAway: number;
  formattedDate: string;
};

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// Where the rule lands in a given year.
export function holidayDateInYear(rule: HolidayRule, year: number): Date {
  if (rule.kind === 'fixed') {
    return new Date(year, rule.month - 1, rule.day);
  }

  // Walk forward from the 1st to the first matching weekday, then take whole
  // weeks from there.
  const first = new Date(year, rule.month - 1, 1);
  const shift = (rule.weekday - first.getDay() + 7) % 7;
  return new Date(year, rule.month - 1, 1 + shift + 7 * (rule.nth - 1));
}

export function nextHolidayDate(rule: HolidayRule, from: Date = startOfToday()): Date {
  const thisYear = holidayDateInYear(rule, from.getFullYear());
  if (thisYear.getTime() >= from.getTime()) return thisYear;
  return holidayDateInYear(rule, from.getFullYear() + 1);
}

// A floating holiday shifts every year, so each occurrence has to be resolved
// against its own year rather than stepping a fixed anchor forward.
export function nextHolidayDates(rule: HolidayRule, count: number, from: Date = startOfToday()): Date[] {
  const out: Date[] = [];
  let year = from.getFullYear();
  while (out.length < count) {
    const date = holidayDateInYear(rule, year);
    if (date.getTime() >= from.getTime()) out.push(date);
    year++;
  }
  return out;
}

// Written the same way as every other date in the app, in the same language.
export function formatHolidayDate(date: Date): string {
  return formatOccurrenceDate(date);
}

export function resolveHoliday(holiday: Holiday, from: Date = startOfToday()): UpcomingHoliday {
  const date = nextHolidayDate(holiday.rule, from);
  const daysAway = Math.ceil((date.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return { holiday, date, daysAway, formattedDate: formatHolidayDate(date) };
}

export function resolveHolidays(holidays: Holiday[], from: Date = startOfToday()): UpcomingHoliday[] {
  return holidays
    .map((h) => resolveHoliday(h, from))
    .sort((a, b) => a.daysAway - b.daysAway);
}
