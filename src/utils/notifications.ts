import * as Notifications from 'expo-notifications';
import { SimpleBirthday } from '@/data/mock';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YEARLY } from '@/utils/recurrence';
import { getUpcomingOccurrences } from '@/utils/dates';
import { leadDaysFor } from '@/utils/importance';
import i18n from '@/lib/i18n';

// Scheduling every reminder the app makes.
//
// Notification text is written when the reminder is scheduled, not when it
// arrives, so it is translated here rather than at delivery. Changing the app's
// language reschedules everything — see NotificationSync.

// How many notifications may be booked at once. iOS caps a single app at 64.
export const MAX_NOTIFICATIONS = 60;

// When reminders arrive. One hour for all of them: a per-birthday time would be
// a lot of picker for something nobody would ever change twice.
export const REMINDER_HOUR = 9;

// Whether reminders are on at all. The one switch in settings.
export const NUDGES_KEY = '@settings_nudges';

// A birthday falls on the same date every year, so its reminder is booked as a
// repeating yearly slot: one entry that never expires, rather than six dated
// ones that go quiet after six years.
//
// `month` is 1-12 and `day` is 1-31, matching how dates are written everywhere
// else here. The conversion to whatever the notification API wants happens at
// the point of scheduling.
export type YearlySlot = { month: number; day: number };

export type ScheduledReminder = {
  id: string;
  title: string;
  body: string;
  slot: YearlySlot;
  hour: number;
  // Days before the birthday this one fires. Zero is the morning itself.
  leadDays: number;
};

export type NotificationPlan = {
  scheduled: ScheduledReminder[];
  // Reminders that did not fit in the budget. Only ever interesting for
  // diagnosing a very full account.
  dropped: number;
};

// The year the lead time is subtracted in. Any common year will do; what
// matters is that it is not a leap year.
const REF_YEAR = 2001;

// The slot a reminder occupies, given the next occurrence and how far ahead of
// it the reminder fires.
//
// A yearly trigger is one fixed month and day, but subtracting a lead time in a
// leap year lands on a different day than subtracting it in a common year — a
// week before 5 March is 26 February in 2027 and 27 February in 2028. Doing the
// arithmetic in a fixed common year makes the answer right in three years out
// of four instead of one, and, more usefully, makes it the same answer every
// time: the slot no longer depends on which year the app happened to be opened
// in, so a reminder is not torn down and rebooked each new year.
function slotFor(occurrence: Date, leadDays: number): YearlySlot {
  const month = occurrence.getMonth();

  // 29 February only comes round every fourth year, and a yearly trigger on a
  // date that mostly does not exist fires unpredictably. Falling back to the
  // 28th is the same compromise the occurrence maths already makes — and it is
  // also the only day the reference year has to offer.
  const day = month === 1 && occurrence.getDate() === 29 ? 28 : occurrence.getDate();

  // Rolls back through the start of the year on its own: 1 January less a week
  // is 25 December, and only the month and day are read back out.
  const fireOn = new Date(REF_YEAR, month, day - leadDays);
  return { month: fireOn.getMonth() + 1, day: fireOn.getDate() };
}

function reminderFor(birthday: SimpleBirthday, leadDays: number): ScheduledReminder | null {
  const occurrence = getUpcomingOccurrences(birthday.originalDate, YEARLY, 1)[0];
  if (!occurrence) return null;

  // A repeating trigger says the same thing every year, so the age has to stay
  // out of it — "turning 36" would be wrong by next year. The list on the home
  // screen is where the age belongs, because that text is written fresh each
  // time it is read.
  const body =
    leadDays === 0
      ? i18n.t('notif_bday_today', { name: birthday.name })
      : leadDays === 1
        ? i18n.t('notif_bday_tomorrow', { name: birthday.name })
        : i18n.t('notif_bday_days', { name: birthday.name, n: leadDays });

  return {
    id: `bd_${birthday.id}_${leadDays}`,
    title: i18n.t('notif_title_birthday', { name: birthday.name }),
    body,
    slot: slotFor(occurrence, leadDays),
    hour: REMINDER_HOUR,
    leadDays,
  };
}

// What should be scheduled, worked out without touching the notification API.
//
// Split out from syncBirthdayNotifications so the decisions — what fires, when,
// and what gets dropped when the budget runs out — can be checked directly.
// The sync is then only the part that talks to the OS.
export function planBirthdayNotifications(
  birthdays: SimpleBirthday[],
  hour: number = REMINDER_HOUR,
): NotificationPlan {
  // Soonest first, so that if the budget does run out it runs out on the
  // birthdays furthest away — the ones there is still time to notice.
  const ordered = [...birthdays].sort((a, b) => a.daysAway - b.daysAway);

  // The morning-of reminder is the promise the app makes. The early warning is
  // what importance buys on top of it. They are collected separately so a full
  // budget takes the extras from everyone before it takes the day itself from
  // anyone.
  const dayOf: ScheduledReminder[] = [];
  const early: ScheduledReminder[] = [];

  for (const birthday of ordered) {
    const onTheDay = reminderFor(birthday, 0);
    if (onTheDay) dayOf.push(onTheDay);

    const leadDays = leadDaysFor(birthday.importance);
    if (leadDays > 0) {
      const ahead = reminderFor(birthday, leadDays);
      if (ahead) early.push(ahead);
    }
  }

  const scheduled = dayOf.slice(0, MAX_NOTIFICATIONS);
  const room = MAX_NOTIFICATIONS - scheduled.length;
  scheduled.push(...early.slice(0, room));

  return { scheduled, dropped: dayOf.length + early.length - scheduled.length };
}

// Translates a slot into the shape the notification API wants.
function triggerFor(item: ScheduledReminder): Notifications.NotificationTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.YEARLY,
    month: item.slot.month - 1, // expo counts months from 0
    day: item.slot.day,
    hour: item.hour,
    minute: 0,
  };
}

// Everything scheduled, as one comparable string. Two runs with the same
// signature would cancel and rebook the identical set of reminders, so the
// second one is skipped.
function signatureOf(plan: NotificationPlan): string {
  return JSON.stringify(plan.scheduled.map((r) => [r.id, r.title, r.body, r.slot, r.hour]));
}

// The provider settles in stages on a cold start — cache first, then the
// server — so this is called several times in a row with a growing picture.
// Every call cancels everything before rescheduling, which means two
// overlapping runs can cancel work the other one is halfway through writing.
// Runs are queued end to end, and a run that would reproduce the last applied
// plan does nothing at all.
let syncQueue: Promise<void> = Promise.resolve();
let appliedSignature: string | null = null;

// Cancels every scheduled notification and reschedules from scratch, so it has
// to be given the complete list in one call. Two partial callers would wipe
// each other's reminders.
export function syncBirthdayNotifications(
  birthdays: SimpleBirthday[],
  nudgesEnabled?: boolean,
): Promise<void> {
  syncQueue = syncQueue.catch(() => {}).then(() => runSync(birthdays, nudgesEnabled));
  return syncQueue;
}

// Whether the OS will accept a reminder at all. iOS rejects every schedule
// request from an app that has not been granted permission, and Android 13+
// does the same, so an ungranted app would otherwise spend the whole session
// booking reminders that go nowhere.
async function mayNotify(): Promise<boolean> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch (e) {
    // A permission that cannot be read is not a permission that was refused.
    // Trying and failing is recoverable; assuming refusal is not.
    console.warn('Could not read notification permission', e);
    return true;
  }
}

async function runSync(birthdays: SimpleBirthday[], nudgesEnabled?: boolean) {
  if (Platform.OS === 'web') return;

  // Checked before anything is cancelled. Permission is asked for on a
  // different timeline than the first data load, so this runs while the prompt
  // is still on screen — and the schedule that is already booked from a
  // previous session must survive that.
  //
  // `appliedSignature` is deliberately left alone, so the sync that follows
  // the grant does the work rather than recognising its own last plan and
  // skipping it. NotificationSync watches the permission and calls back.
  if (!(await mayNotify())) return;

  let isEnabled = nudgesEnabled;
  if (isEnabled === undefined) {
    const val = await AsyncStorage.getItem(NUDGES_KEY);
    isEnabled = val === null ? true : val === 'true';
  }

  const plan = isEnabled
    ? planBirthdayNotifications(birthdays)
    : { scheduled: [], dropped: 0 };

  // Worked out before anything is cancelled: if this run would rebuild exactly
  // what is already scheduled, leaving it alone is both cheaper and safer than
  // tearing it down and writing it again.
  const signature = isEnabled ? signatureOf(plan) : 'off';
  if (signature === appliedSignature) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Could not cancel notifications', e);
  }

  // Recorded before the writes rather than after: a failure partway through
  // leaves the schedule in an unknown state, and the next run has to redo it.
  appliedSignature = null;

  if (!isEnabled) {
    appliedSignature = 'off';
    return;
  }

  // Route everything through the 'reminders' channel created at startup so
  // Android gives it the right importance and sound. No-op on iOS.
  const channelId = Platform.OS === 'android' ? 'reminders' : undefined;

  let failed = 0;

  for (const item of plan.scheduled) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: item.title, body: item.body, sound: true },
        // `type` is not optional. Without it expo walks past every schedulable
        // trigger, falls through to the Android channel branch, and the
        // notification is delivered on the spot — which is how a fresh account
        // received a year of reminders the moment it signed in.
        trigger: { ...triggerFor(item), channelId } as any,
      });
    } catch (e) {
      failed++;
      console.warn(`Failed to schedule reminder for ${item.title}:`, e);
    }
  }

  // Only a run that booked everything it meant to may claim the plan is
  // applied. Recording the signature after a partial failure would make the
  // next run recognise its own work and skip it, leaving the reminders that
  // failed missing until something unrelated changed the plan.
  if (failed === 0) appliedSignature = signature;
}

// Test seam: the queue and the last-applied signature are module state, which
// would otherwise leak between test cases.
export function __resetNotificationSyncState() {
  syncQueue = Promise.resolve();
  appliedSignature = null;
}
