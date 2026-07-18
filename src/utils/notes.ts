import type { Note } from '@/data/mock';

export function relativeWhen(createdAt: string, now: number = Date.now()): string {
  const diffMs = now - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
  if (diffHours > 0) return `${diffHours} hours ago`;
  if (diffMins > 0) return `${diffMins} mins ago`;
  return 'Just now';
}

export function mapDbNote(row: any, now?: number): Note {
  return {
    id: row.id,
    kind: row.kind,
    when: relativeWhen(row.created_at, now),
    body: row.body,
    specialDayId: row.special_day_id || undefined,
    birthdayId: row.birthday_id || undefined,
  };
}

type DayLike = { id: string; isBirthday?: boolean };

// Splits notes between the occasions they belong to and the person as a whole.
// A note written before notes could target an occasion has neither id set, so it
// falls through to the general bucket rather than disappearing.
export function distributeNotes<T extends DayLike>(notes: Note[], days: T[]): {
  byDay: Map<string, Note[]>;
  general: Note[];
} {
  const byDay = new Map<string, Note[]>();

  for (const day of days) {
    byDay.set(
      day.id,
      notes.filter((n) => (day.isBirthday ? n.birthdayId === day.id : n.specialDayId === day.id)),
    );
  }

  // Anything pointing at an occasion that no longer exists would otherwise be
  // invisible, so treat a dangling target as general rather than dropping it.
  const claimed = new Set<string>();
  for (const list of byDay.values()) {
    for (const note of list) claimed.add(note.id);
  }
  const general = notes.filter((n) => !claimed.has(n.id));

  return { byDay, general };
}
