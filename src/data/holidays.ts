// Shared occasions everyone has, as opposed to the dates tied to one person.
//
// Some land on a fixed date, others float — Mother's Day is the second Sunday of
// May, so it moves every year and can't be stored as a month/day pair.

export type HolidayRule =
  | { kind: 'fixed'; month: number; day: number } // month is 1-12
  | { kind: 'nth-weekday'; month: number; weekday: number; nth: number }; // weekday 0 = Sunday

export type Holiday = {
  id: string;
  name: string;
  blurb: string;
  icon: string; // MaterialIcons name
  rule: HolidayRule;
};

// Dates follow the most widely observed convention. Mother's Day in particular
// varies by country (the UK keeps Mothering Sunday in Lent); this uses the
// second-Sunday-of-May date used across the US, Turkey and most of Europe.
export const HOLIDAYS: Holiday[] = [
  {
    id: 'new_years_day',
    name: "New Year's Day",
    blurb: 'January 1st',
    icon: 'celebration',
    rule: { kind: 'fixed', month: 1, day: 1 },
  },
  {
    id: 'valentines_day',
    name: "Valentine's Day",
    blurb: 'February 14th',
    icon: 'favorite',
    rule: { kind: 'fixed', month: 2, day: 14 },
  },
  {
    id: 'womens_day',
    name: "International Women's Day",
    blurb: 'March 8th',
    icon: 'volunteer-activism',
    rule: { kind: 'fixed', month: 3, day: 8 },
  },
  {
    id: 'mothers_day',
    name: "Mother's Day",
    blurb: 'Second Sunday of May',
    icon: 'local-florist',
    rule: { kind: 'nth-weekday', month: 5, weekday: 0, nth: 2 },
  },
  {
    id: 'fathers_day',
    name: "Father's Day",
    blurb: 'Third Sunday of June',
    icon: 'sports-baseball',
    rule: { kind: 'nth-weekday', month: 6, weekday: 0, nth: 3 },
  },
  {
    id: 'friendship_day',
    name: 'International Friendship Day',
    blurb: 'July 30th',
    icon: 'diversity-3',
    rule: { kind: 'fixed', month: 7, day: 30 },
  },
  {
    id: 'grandparents_day',
    name: 'Grandparents’ Day',
    blurb: 'Second Sunday of September',
    icon: 'elderly',
    rule: { kind: 'nth-weekday', month: 9, weekday: 0, nth: 2 },
  },
  {
    id: 'teachers_day',
    name: "World Teachers' Day",
    blurb: 'October 5th',
    icon: 'school',
    rule: { kind: 'fixed', month: 10, day: 5 },
  },
  {
    id: 'christmas',
    name: 'Christmas Day',
    blurb: 'December 25th',
    icon: 'card-giftcard',
    rule: { kind: 'fixed', month: 12, day: 25 },
  },
  {
    id: 'new_years_eve',
    name: "New Year's Eve",
    blurb: 'December 31st',
    icon: 'auto-awesome',
    rule: { kind: 'fixed', month: 12, day: 31 },
  },
];

// Enabled out of the box: the ones this app is really about. Everything else is
// opt-in from Settings, so nobody gets reminders they didn't ask for.
export const DEFAULT_ENABLED_HOLIDAYS = ['mothers_day', 'fathers_day', 'valentines_day'];

export function getHoliday(id: string): Holiday | undefined {
  return HOLIDAYS.find((h) => h.id === id);
}
