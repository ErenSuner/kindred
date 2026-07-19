import type { Note } from '@/data/mock';

// `kind` used to be a label the user picked from four chips. It isn't a label
// any more — it says which part of the app the note belongs to, and the user
// never sees it.
export const GIFT_IDEA = 'Gift Idea';
export const MEMORY = 'Memory';
// The person's free-form notebook. At most one row per person, edited in place.
export const NOTEBOOK = 'Notebook';
// A plain note attached to one occasion.
export const NOTE = 'Note';

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
    occurredOn: row.occurred_on || undefined,
    photoUrl: row.photo_url || undefined,
    doneAt: row.done_at || undefined,
  };
}

type DayLike = { id: string };

// Splits notes between the occasions they belong to and the person as a whole.
// A note written before notes could target an occasion has no target set, so it
// falls through to the general bucket rather than disappearing.
export function distributeNotes<T extends DayLike>(notes: Note[], days: T[]): {
  byDay: Map<string, Note[]>;
  general: Note[];
} {
  const byDay = new Map<string, Note[]>();

  for (const day of days) {
    byDay.set(day.id, notes.filter((n) => n.specialDayId === day.id));
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
