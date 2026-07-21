import * as Notifications from 'expo-notifications';
import { MyEvent, Person } from '@/data/mock';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAY_OF, Nudge, offsetDaysFor, parseNudge, parseNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { getUpcomingOccurrences } from '@/utils/dates';
import { Weekday, isRoutine } from '@/utils/routines';
import { HEADS_UP_HOURS, dayOfFirings, formatTimeOfDay } from '@/utils/eventTime';
import { Holiday } from '@/data/holidays';
import { formatHolidayDate, nextHolidayDates } from '@/utils/holidays';

// How many notifications to schedule in advance. iOS has a limit of 64.
export const MAX_NOTIFICATIONS = 60;

// A weekly event would burn the whole budget on one reminder, so cap how far
// ahead any single nudge books itself. Everything reschedules on next launch.
const MAX_OCCURRENCES_PER_NUDGE = 6;

// Shared occasions aren't tuneable per-event; everyone gets the same two.
const HOLIDAY_OFFSET_DAYS = [7, 1];
const HOLIDAY_YEARS_AHEAD = 2;

// What time of day nudges arrive. One setting for all of them — per-reminder
// times would be a lot of picker for very little gain.
export const REMINDER_HOUR_KEY = '@settings_reminder_hour';
export const DEFAULT_REMINDER_HOUR = 9;

export async function getReminderHour(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
    if (raw === null) return DEFAULT_REMINDER_HOUR;
    const hour = Number(raw);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_REMINDER_HOUR;
  } catch {
    return DEFAULT_REMINDER_HOUR;
  }
}

export type PendingNotification = { title: string; body: string; date: Date; id: string };

// Nudges fire relative to an occurrence — a preset or a custom lead time is N
// days before it. A legacy absolute date is pinned to itself and ignores the
// cycle entirely.
function notificationDatesFor(
  anchorDate: string,
  recurrence: Recurrence,
  nudge: Nudge,
  hour: number,
  // A two-hour warning for an early-morning event lands the night before, which
  // is a day earlier than the nudge itself says.
  opts: { extraDaysEarlier?: number; minute?: number } = {},
): Date[] {
  const now = new Date();
  const minute = opts.minute ?? 0;

  if (nudge.type === 'date') {
    const [y, m, d] = nudge.value.split('-').map(Number);
    const at = new Date(y, m - 1, d, hour, minute, 0, 0);
    return at.getTime() > now.getTime() ? [at] : [];
  }

  const offsetDays = (offsetDaysFor(nudge) ?? 0) + (opts.extraDaysEarlier ?? 0);

  return getUpcomingOccurrences(anchorDate, recurrence, MAX_OCCURRENCES_PER_NUDGE)
    .map((occurrence) => {
      const at = new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate(), hour, minute, 0, 0);
      at.setDate(at.getDate() - offsetDays);
      return at;
    })
    .filter((at) => at.getTime() > now.getTime());
}

// The day itself always fires, whatever is stored. Older rows were saved before
// that was guaranteed, so it is added on read rather than trusted from the data.
function nudgesFor(stored: unknown): Nudge[] {
  const parsed = parseNudges(stored);
  if (parsed.some((n) => n.value === DAY_OF)) return parsed;

  const dayOf = parseNudge(DAY_OF);
  return dayOf ? [...parsed, dayOf] : parsed;
}

type Collected = { dated: PendingNotification[]; repeating: RepeatingNotification[] };

function collectPeopleNotifications(people: Person[], hour: number): Collected {
  const dated: PendingNotification[] = [];
  const repeating: RepeatingNotification[] = [];

  for (const person of people) {
    // Birthdays are special days now, so one loop covers everything. Only the
    // wording differs — a birthday gets its own notification title.
    for (const sd of person.specialDays ?? []) {
      const dateStr = sd.originalDate;
      if (!dateStr) continue;

      const isBirthday = sd.isBirthday === true;
      const recurrence = sd.recurrence ?? YEARLY;
      const title = isBirthday ? `Birthday Reminder: ${person.name}` : `Special Day: ${person.name}`;
      const what = isBirthday ? 'birthday' : sd.title;

      for (const nudge of nudgesFor(sd.nudges)) {
        const offsetDays = offsetDaysFor(nudge) ?? 0;
        const first = getUpcomingOccurrences(dateStr, recurrence, 1)[0];
        const spec = first ? repeatSpecFor(recurrence, first, offsetDays) : null;

        if (spec) {
          // A repeating trigger says the same thing every year, so the age has
          // to go — "turning 36" would be wrong by next year. It's on the
          // person's own screen either way.
          repeating.push({
            id: `sd_${sd.id}_${nudge.value}`,
            title,
            body:
              nudge.value === DAY_OF
                ? `It's ${person.name}'s ${what} today!`
                : `${person.name}'s ${what} is ${nudge.label.replace(' before', '')} away.`,
            repeat: spec,
            hour,
            minute: 0,
          });
          continue;
        }

        // Only a fixed run of dates gets the age, because it is rewritten every
        // time the app schedules.
        const turningStr = isBirthday && sd.turningAge ? ` (turning ${sd.turningAge})` : '';

        notificationDatesFor(dateStr, recurrence, nudge, hour).forEach((date, i) => {
          dated.push({
            id: `sd_${sd.id}_${nudge.value}_${i}`,
            title,
            body:
              nudge.value === DAY_OF
                ? `It's ${person.name}'s ${what} today!${turningStr}`
                : `${person.name}'s ${what}${turningStr} is on ${sd.date}.`,
            date,
          });
        });
      }
    }
  }

  return { dated, repeating };
}

function collectMyEventNotifications(myEvents: MyEvent[], hour: number): Collected {
  const dated: PendingNotification[] = [];
  const repeating: RepeatingNotification[] = [];

  for (const event of myEvents) {
    // Routines are booked as repeating weekly triggers instead — see
    // collectRoutineTriggers.
    if (isRoutine(event.weekdays)) continue;

    const at = event.timeOfDay ? ` at ${formatTimeOfDay(event.timeOfDay)}` : '';

    for (const nudge of nudgesFor(event.nudges)) {
      // The day itself is where a time of day changes things: instead of one
      // reminder at the global hour, a timed event gets the morning glance and
      // a warning two hours out. Earlier nudges stay on the global hour — a
      // week ahead, the exact minute is not the point.
      const firings =
        nudge.value === DAY_OF
          ? dayOfFirings(event.timeOfDay, hour)
          : [{ dayOffset: 0, hour, minute: 0, kind: 'heads-up' as const }];

      for (const firing of firings) {
        const offsetDays = (offsetDaysFor(nudge) ?? 0) + firing.dayOffset;
        const first = getUpcomingOccurrences(event.originalDate, event.recurrence, 1)[0];
        const spec = first ? repeatSpecFor(event.recurrence, first, offsetDays) : null;

        const body =
          firing.kind === 'imminent'
            ? `${event.title} is in ${HEADS_UP_HOURS} hours${at}.`
            : nudge.value === DAY_OF
            ? `${event.title} is today${at}!`
            : `${event.title} is ${nudge.label.replace(' before', '')} away${at}.`;

        if (spec) {
          repeating.push({
            id: `me_${event.id}_${nudge.value}_${firing.kind}`,
            title: 'Your Reminder',
            body,
            repeat: spec,
            hour: firing.hour,
            minute: firing.minute,
          });
          continue;
        }

        notificationDatesFor(event.originalDate, event.recurrence, nudge, firing.hour, {
          extraDaysEarlier: firing.dayOffset,
          minute: firing.minute,
        }).forEach((date, i) => {
          dated.push({
            id: `me_${event.id}_${nudge.value}_${firing.kind}_${i}`,
            title: 'Your Reminder',
            // A one-off can name its actual date; a repeating one can't.
            body:
              firing.kind === 'heads-up' && nudge.value !== DAY_OF
                ? `${event.title} is on ${event.date}${at}.`
                : body,
            date,
          });
        });
      }
    }
  }

  return { dated, repeating };
}

// A repeating trigger. Unlike a dated notification this never runs out, so it
// costs one slot forever instead of re-booking six occurrences at a time and
// going quiet once they're used up.
//
// `month` is 1-12 and `day` is 1-31, matching how dates are written everywhere
// else here. The conversion to whatever the notification API wants happens at
// the point of scheduling.
export type RepeatSpec =
  | { every: 'week'; weekday: Weekday }
  | { every: 'month'; day: number }
  | { every: 'year'; month: number; day: number };

export type RepeatingNotification = {
  id: string;
  title: string;
  body: string;
  repeat: RepeatSpec;
  hour: number;
  minute: number;
};

// Kept for the routine screens, which only ever produce weekly ones.
export type RoutineTrigger = RepeatingNotification;

// A cycle only becomes a repeating trigger when it lands on the same slot every
// time. "Every 3 weeks" has no such slot, so it stays a dated notification.
function repeatSpecFor(
  recurrence: Recurrence,
  occurrence: Date,
  offsetDays: number,
): RepeatSpec | null {
  if (recurrence.interval !== 1) return null;

  // The reminder fires N days before the occurrence, so the slot is worked out
  // from that earlier date, not from the occurrence itself.
  const fireOn = new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate());
  fireOn.setDate(fireOn.getDate() - offsetDays);

  switch (recurrence.unit) {
    case 'week':
      // A lead time of a week or more lands on the previous occurrence, which
      // would fire every week and say nothing.
      if (offsetDays >= 7) return null;
      return { every: 'week', weekday: fireOn.getDay() as Weekday };

    case 'month': {
      // Days 29-31 don't exist in every month. A monthly reminder on the 31st
      // would silently skip February, so those stay dated.
      const day = fireOn.getDate();
      if (offsetDays >= 28 || day > 28) return null;
      return { every: 'month', day };
    }

    case 'year': {
      const month = fireOn.getMonth() + 1;
      const day = fireOn.getDate();
      // 29 February only comes round every fourth year. Firing on the 28th is
      // the same compromise the occurrence maths already makes.
      if (month === 2 && day === 29) return { every: 'year', month: 2, day: 28 };
      return { every: 'year', month, day };
    }

    default:
      // 'none' and 'day'. A one-off has nothing to repeat, and a daily cycle
      // wants a daily trigger this doesn't model yet.
      return null;
  }
}

// Lead times of a week or more are dropped for routines. "A week before" a
// weekly routine is the previous occurrence — it would fire every single week
// and say nothing useful.
const MAX_ROUTINE_LEAD_DAYS = 6;

function collectRoutineTriggers(myEvents: MyEvent[], hour: number): RoutineTrigger[] {
  const triggers: RoutineTrigger[] = [];

  for (const event of myEvents) {
    if (!isRoutine(event.weekdays)) continue;

    const at = event.timeOfDay ? ` at ${formatTimeOfDay(event.timeOfDay)}` : '';

    for (const nudge of nudgesFor(event.nudges)) {
      const offsetDays = offsetDaysFor(nudge) ?? 0;
      if (offsetDays > MAX_ROUTINE_LEAD_DAYS) continue;

      // The day itself is where the time matters: an 18:00 class is worth
      // hearing about in the morning and again at 16:00. Earlier nudges keep
      // the global hour.
      const firings =
        nudge.value === DAY_OF
          ? dayOfFirings(event.timeOfDay, hour)
          : [{ dayOffset: 0, hour, minute: 0, kind: 'heads-up' as const }];

      for (const firing of firings) {
        for (const weekday of event.weekdays ?? []) {
          // Firing N days earlier is the same as firing on an earlier weekday.
          const daysEarlier = offsetDays + firing.dayOffset;
          const fireOn = (((weekday - daysEarlier) % 7) + 7) % 7;

          triggers.push({
            id: `rt_${event.id}_${nudge.value}_${firing.kind}_${weekday}`,
            title: 'Your Routine',
            body:
              firing.kind === 'imminent'
                ? `${event.title} is in ${HEADS_UP_HOURS} hours${at}.`
                : offsetDays === 0
                ? `${event.title} is today${at}.`
                : offsetDays === 1
                ? `${event.title} is tomorrow${at}.`
                : `${event.title} is in ${offsetDays} days${at}.`,
            repeat: { every: 'week', weekday: fireOn as Weekday },
            hour: firing.hour,
            minute: firing.minute,
          });
        }
      }
    }
  }

  return triggers;
}

function collectHolidayNotifications(holidays: Holiday[], hour: number): PendingNotification[] {
  const pending: PendingNotification[] = [];
  const now = new Date();

  for (const holiday of holidays) {
    for (const date of nextHolidayDates(holiday.rule, HOLIDAY_YEARS_AHEAD)) {
      for (const offset of HOLIDAY_OFFSET_DAYS) {
        const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
        at.setDate(at.getDate() - offset);
        if (at.getTime() <= now.getTime()) continue;

        pending.push({
          id: `hd_${holiday.id}_${date.getFullYear()}_${offset}`,
          title: holiday.name,
          body:
            offset === 1
              ? `${holiday.name} is tomorrow — a good moment to reach out.`
              : `${holiday.name} is a week away, on ${formatHolidayDate(date)}.`,
          date: at,
        });
      }
    }
  }

  return pending;
}

// What should be scheduled, worked out without touching the notification API.
//
// Split out from syncNotifications so the decisions — what fires, when, and
// which things get dropped when the budget runs out — can be checked directly.
// syncNotifications is then only the part that talks to the OS.
export type NotificationPlan = {
  dated: PendingNotification[];
  // Everything on a fixed weekly, monthly or yearly slot. One entry, booked
  // once, never runs out.
  routines: RepeatingNotification[];
  // Dated reminders that didn't fit. Only ever interesting for diagnosing a
  // full budget.
  dropped: number;
};

export function planNotifications(
  people: Person[],
  myEvents: MyEvent[],
  holidays: Holiday[],
  hour: number,
): NotificationPlan {
  const people$ = collectPeopleNotifications(people, hour);
  const events$ = collectMyEventNotifications(myEvents, hour);

  // Repeating triggers are booked first. They cost one slot each rather than
  // six, which is what stops a handful of birthdays from filling the whole
  // allowance and pushing everything else off the end.
  const routines = [
    ...collectRoutineTriggers(myEvents, hour),
    ...people$.repeating,
    ...events$.repeating,
  ].slice(0, MAX_NOTIFICATIONS);

  const all = [
    ...people$.dated,
    ...events$.dated,
    ...collectHolidayNotifications(holidays, hour),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const room = Math.max(0, MAX_NOTIFICATIONS - routines.length);
  const dated = all.slice(0, room);

  return { dated, routines, dropped: all.length - dated.length };
}

// Translates a slot into whatever shape the notification API wants. Both APIs
// count from 1, but from different places: weekday 1 is Sunday, month 1 is
// January.
function repeatTriggerInput(item: RepeatingNotification): Notifications.NotificationTriggerInput {
  const { hour, minute } = item;

  switch (item.repeat.every) {
    case 'week':
      return {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // expo counts weekdays from 1 = Sunday; ours count from 0 = Sunday.
        weekday: item.repeat.weekday + 1,
        hour,
        minute,
      };
    case 'month':
      return {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: item.repeat.day,
        hour,
        minute,
      };
    case 'year':
      return {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: item.repeat.month - 1, // expo counts months from 0
        day: item.repeat.day,
        hour,
        minute,
      };
  }
}

// Cancels every scheduled notification and reschedules from scratch, so this has
// to be given the complete picture — people, the user's own events AND the
// shared occasions — in one call. Two partial callers would wipe each other's
// reminders.
export async function syncNotifications(
  people: Person[],
  myEvents: MyEvent[] = [],
  holidays: Holiday[] = [],
  nudgesEnabled?: boolean,
) {
  if (Platform.OS === 'web') return;

  let isEnabled = nudgesEnabled;
  if (isEnabled === undefined) {
    const val = await AsyncStorage.getItem('@settings_nudges');
    isEnabled = val === null ? true : val === 'true';
  }

  // 1. Cancel all existing scheduled notifications to avoid duplicates
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Could not cancel notifications', e);
  }

  if (!isEnabled) {
    return;
  }

  const hour = await getReminderHour();
  const plan = planNotifications(people, myEvents, holidays, hour);

  // Route everything through the 'reminders' channel created at startup so
  // Android gives it the right importance and sound. No-op on iOS.
  const channelId = Platform.OS === 'android' ? 'reminders' : undefined;

  // 2. The repeating slots
  for (const item of plan.routines) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: item.title, body: item.body, sound: true },
        trigger: { ...repeatTriggerInput(item), channelId } as any,
      });
    } catch (e) {
      console.warn(`Failed to schedule repeating reminder ${item.title}:`, e);
    }
  }

  // 3. Then everything with a date of its own
  for (const notification of plan.dated) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: true,
        },
        trigger: { date: notification.date, channelId } as any,
      });
    } catch (e) {
      console.warn(`Failed to schedule notification for ${notification.title}:`, e);
    }
  }
}
