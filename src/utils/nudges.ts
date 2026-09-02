// The storage format of the `nudges text[]` column.
//
// A nudge is "some amount of time before the day", persisted as a preset key:
// 'day_of', '3_days', '1_week'. Older versions of the app also wrote custom
// lead times ('lead:4:day') and absolute dates ('2026-05-01'); nothing writes
// those any more, but `importanceFromNudges` still reads them.
//
// Screens never touch this file. They speak in `Importance`, which is the
// user-facing shape of the same thing — see `@/utils/importance`.

export const DAY_OF = 'day_of';

// The day itself is not optional: a birthday arriving with no warning at all
// defeats the point of the app. It is scheduled whether or not it was chosen.
export const ALWAYS_ON_NUDGES = [DAY_OF];

// How many days before the day each preset fires.
export const PRESET_OFFSET_DAYS: Record<string, number> = {
  day_of: 0,
  '1_day': 1,
  '3_days': 3,
  '1_week': 7,
  '2_weeks': 14,
  '1_month': 30,
  '2_months': 60,
};
