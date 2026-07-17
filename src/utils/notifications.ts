import * as Notifications from 'expo-notifications';
import { Person } from '@/data/mock';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// How many notifications to schedule in advance. iOS has a limit of 64.
const MAX_NOTIFICATIONS = 60;

function calculateNotificationDate(targetDateStr: string, reminderType: string, customValue?: string, isAnnual: boolean = true): Date | null {
  // targetDateStr is YYYY-MM-DD
  const [yearStr, monthStr, dayStr] = targetDateStr.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);

  const now = new Date();
  
  // If it's a custom date (like '2025-05-10'), we don't repeat it yearly, we just parse it.
  if (reminderType === 'custom' && customValue) {
    const [cYear, cMonth, cDay] = customValue.split('-');
    const customDate = new Date(Number(cYear), Number(cMonth) - 1, Number(cDay), 9, 0, 0, 0); // 9:00 AM
    return customDate.getTime() > now.getTime() ? customDate : null;
  }

  // Calculate the next occurrence of the special day/birthday
  let targetYear = isAnnual ? now.getFullYear() : Number(yearStr);
  let target = new Date(targetYear, month - 1, day, 9, 0, 0, 0); // Default to 9:00 AM

  // Calculate the offset for the reminder
  let offsetDays = 0;
  switch (reminderType) {
    case 'day_of': offsetDays = 0; break;
    case '1_day': offsetDays = 1; break;
    case '3_days': offsetDays = 3; break;
    case '1_week': offsetDays = 7; break;
    case '2_weeks': offsetDays = 14; break;
    case '1_month': offsetDays = 30; break; // approximate 1 month as 30 days
  }

  target.setDate(target.getDate() - offsetDays);

  // If the reminder time has already passed this year, schedule it for next year
  if (target.getTime() < now.getTime()) {
    if (isAnnual) {
      targetYear += 1;
      target = new Date(targetYear, month - 1, day, 9, 0, 0, 0);
      target.setDate(target.getDate() - offsetDays);
    } else {
      return null;
    }
  }

  return target;
}

export async function syncNotifications(people: Person[], nudgesEnabled?: boolean) {
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

  const upcomingNotifications: { title: string; body: string; date: Date; id: string }[] = [];

  // 2. Gather all reminders
  for (const person of people) {
    // Process Birthday
    if (person.birthday && person.birthday.nudges) {
      for (const nudge of person.birthday.nudges) {
        const notifyDate = calculateNotificationDate(person.birthday.date, nudge.type, nudge.value, true);
        if (notifyDate) {
          const bdSpecialDay = person.specialDays?.find(d => d.isBirthday);
          const turningStr = bdSpecialDay?.turningAge ? ` (turning ${bdSpecialDay.turningAge})` : '';
          let body = `${person.name}'s birthday${turningStr} is on ${person.birthday.date}.`;
          if (nudge.type === 'day_of') body = `It's ${person.name}'s birthday today!${turningStr}`;
          
          upcomingNotifications.push({
            id: `bd_${person.id}_${nudge.type}`,
            title: `Birthday Reminder: ${person.name}`,
            body,
            date: notifyDate,
          });
        }
      }
    }

    // Process Special Days
    if (person.specialDays) {
      for (const sd of person.specialDays) {
        if (!sd.nudges || sd.isBirthday) continue; // skip birthdays here since handled above

        for (const nudge of sd.nudges) {
          const notifyDate = calculateNotificationDate(sd.date, nudge.type, nudge.value, sd.isAnnual ?? true);
          if (notifyDate) {
            let body = `${person.name}'s ${sd.title} is on ${sd.date}.`;
            if (nudge.type === 'day_of') body = `It's ${person.name}'s ${sd.title} today!`;
            
            upcomingNotifications.push({
              id: `sd_${sd.id}_${nudge.type}`,
              title: `Special Day: ${person.name}`,
              body,
              date: notifyDate,
            });
          }
        }
      }
    }
  }

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
