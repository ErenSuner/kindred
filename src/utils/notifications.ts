import * as Notifications from 'expo-notifications';
import { MyEvent, Person } from '@/data/mock';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAY_OF, Nudge, offsetDaysFor, parseNudge, parseNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { getUpcomingOccurrences } from '@/utils/dates';
import { Holiday } from '@/data/holidays';
import { formatHolidayDate, nextHolidayDates } from '@/utils/holidays';

// How many notifications to schedule in advance. iOS has a limit of 64.
const MAX_NOTIFICATIONS = 60;

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

type PendingNotification = { title: string; body: string; date: Date; id: string };

// Nudges fire relative to an occurrence — a preset or a custom lead time is N
// days before it. A legacy absolute date is pinned to itself and ignores the
// cycle entirely.
function notificationDatesFor(anchorDate: string, recurrence: Recurrence, nudge: Nudge, hour: number): Date[] {
  const now = new Date();

  if (nudge.type === 'date') {
    const [y, m, d] = nudge.value.split('-').map(Number);
    const at = new Date(y, m - 1, d, hour, 0, 0, 0);
    return at.getTime() > now.getTime() ? [at] : [];
  }

  const offsetDays = offsetDaysFor(nudge) ?? 0;

  return getUpcomingOccurrences(anchorDate, recurrence, MAX_OCCURRENCES_PER_NUDGE)
    .map((occurrence) => {
      const at = new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate(), hour, 0, 0, 0);
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

function collectPeopleNotifications(people: Person[], hour: number): PendingNotification[] {
  const pending: PendingNotification[] = [];

  for (const person of people) {
    // Birthdays are special days now, so one loop covers everything. Only the
    // wording differs — a birthday gets the age, and its own notification title.
    for (const sd of person.specialDays ?? []) {
      const dateStr = sd.originalDate;
      if (!dateStr) continue;

      const isBirthday = sd.isBirthday === true;
      const turningStr = isBirthday && sd.turningAge ? ` (turning ${sd.turningAge})` : '';

      for (const nudge of nudgesFor(sd.nudges)) {
        const dates = notificationDatesFor(dateStr, sd.recurrence ?? YEARLY, nudge, hour);
        dates.forEach((date, i) => {
          let body: string;
          if (isBirthday) {
            body =
              nudge.value === 'day_of'
                ? `It's ${person.name}'s birthday today!${turningStr}`
                : `${person.name}'s birthday${turningStr} is on ${sd.date}.`;
          } else {
            body =
              nudge.value === 'day_of'
                ? `It's ${person.name}'s ${sd.title} today!`
                : `${person.name}'s ${sd.title} is on ${sd.date}.`;
          }

          pending.push({
            id: `sd_${sd.id}_${nudge.value}_${i}`,
            title: isBirthday ? `Birthday Reminder: ${person.name}` : `Special Day: ${person.name}`,
            body,
            date,
          });
        });
      }
    }
  }

  return pending;
}

function collectMyEventNotifications(myEvents: MyEvent[], hour: number): PendingNotification[] {
  const pending: PendingNotification[] = [];

  for (const event of myEvents) {
    for (const nudge of nudgesFor(event.nudges)) {
      const dates = notificationDatesFor(event.originalDate, event.recurrence, nudge, hour);
      dates.forEach((date, i) => {
        let body = `${event.title} is on ${event.date}.`;
        if (nudge.value === 'day_of') body = `${event.title} is today!`;

        pending.push({
          id: `me_${event.id}_${nudge.value}_${i}`,
          title: 'Your Reminder',
          body,
          date,
        });
      });
    }
  }

  return pending;
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
    console.log('[Notifications] Gentle Nudges disabled. Cancelled all notifications.');
    return;
  }

  const hour = await getReminderHour();

  // 2. Gather all reminders
  const upcomingNotifications = [
    ...collectPeopleNotifications(people, hour),
    ...collectMyEventNotifications(myEvents, hour),
    ...collectHolidayNotifications(holidays, hour),
  ];

  // 3. Sort by closest date
  upcomingNotifications.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 4. Take the next MAX_NOTIFICATIONS
  const toSchedule = upcomingNotifications.slice(0, MAX_NOTIFICATIONS);

  // 5. Schedule them
  for (const notification of toSchedule) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: true,
        },
        trigger: { date: notification.date } as any,
      });
    } catch (e) {
      console.warn(`Failed to schedule notification for ${notification.title}:`, e);
    }
  }

  console.log(`[Notifications] Synced ${toSchedule.length} upcoming reminders.`);
}
