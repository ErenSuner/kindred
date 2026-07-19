// The time of day an event actually happens, as opposed to the time its
// reminders arrive.
//
// Stored as 'HH:MM' (Postgres `time`), or absent when the event has no
// particular time — a birthday doesn't, a course at 18:00 does.

export type TimeOfDay = { hour: number; minute: number };

// How long before a timed event the "get moving" reminder lands. Firing at the
// event's own time tells you about something you're already late for; two hours
// is enough to actually leave the house.
export const HEADS_UP_HOURS = 2;

const TIME = /^(\d{1,2}):(\d{2})/;

export function parseTimeOfDay(raw: unknown): TimeOfDay | null {
  if (typeof raw !== 'string') return null;
  const match = TIME.exec(raw.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

// Postgres wants seconds; the picker never produces them.
export function serializeTimeOfDay(time: TimeOfDay | null): string | null {
  if (!time) return null;
  return `${pad(time.hour)}:${pad(time.minute)}:00`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// 24-hour, matching how a timetable is written.
export function formatTimeOfDay(time: TimeOfDay | null | undefined): string {
  if (!time) return '';
  return `${pad(time.hour)}:${pad(time.minute)}`;
}

// The morning glance is only worth sending if it comes a clear stretch before
// the two-hour warning. Any closer and it is the same message twice.
const MIN_GAP_MINUTES = 60;

export type DayOfFiring = {
  // How many days earlier than the event this fires. Two hours before a 01:00
  // event is the previous evening.
  dayOffset: number;
  hour: number;
  minute: number;
  // 'heads-up' is the morning glance at the day ahead; 'imminent' is the one
  // that means leave soon.
  kind: 'heads-up' | 'imminent';
};

// What should fire on the day of a timed event.
//
// Two reminders, deliberately: the morning one so the day is not a surprise,
// and one two hours out so there is still time to do something about it. An
// untimed event only has the morning one, because there is nothing to be two
// hours early for.
export function dayOfFirings(time: TimeOfDay | null | undefined, globalHour: number): DayOfFiring[] {
  const headsUp: DayOfFiring = { dayOffset: 0, hour: globalHour, minute: 0, kind: 'heads-up' };
  if (!time) return [headsUp];

  // Two hours before the event, measured from midnight on the day of it. This
  // goes negative for an event early enough that the warning is the night
  // before.
  const imminentMinutes = time.hour * 60 + time.minute - HEADS_UP_HOURS * 60;
  const dayOffset = imminentMinutes < 0 ? 1 : 0;
  const wrapped = ((imminentMinutes % 1440) + 1440) % 1440;

  const imminent: DayOfFiring = {
    dayOffset,
    hour: Math.floor(wrapped / 60),
    minute: wrapped % 60,
    kind: 'imminent',
  };

  // Both are measured against the same midnight, so this catches every case
  // where the glance is redundant: a 10:00 event whose warning fires at 08:00,
  // and a 01:00 event whose warning fired last night. In both, a 09:00 "today
  // you have..." is either a repeat or already too late.
  const headsUpMinutes = globalHour * 60;
  if (imminentMinutes - headsUpMinutes < MIN_GAP_MINUTES) return [imminent];

  return [headsUp, imminent];
}
