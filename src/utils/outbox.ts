// Writes that couldn't reach the server yet.
//
// Reads have been cached for a while, so the app opens and shows your people
// with no connection. Writes had no equivalent: adding a gift idea on the
// underground simply failed and the text was gone. This is the other half —
// the operation is written down, applied to what's on screen straight away,
// and sent when the connection comes back.
//
// Only operations that are safe to replay belong here. Each one names a
// function in peopleApi and carries its arguments; nothing about React or the
// current screen is stored, so a queued write survives a restart.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@outbox';

// Which peopleApi calls can be queued. Deliberately a closed list: anything
// involving a file upload or an id that only exists on the server is left out,
// because replaying it later would not mean the same thing.
export type OutboxOp =
  | { kind: 'insertNote'; personId: string; noteKind: string; body: string; specialDayId?: string }
  | { kind: 'setNoteDone'; noteId: string; done: boolean }
  | { kind: 'updateNote'; noteId: string; body: string }
  | { kind: 'deleteNote'; noteId: string }
  | { kind: 'saveNotebook'; personId: string; body: string; existingNoteId?: string };

export type OutboxEntry = {
  // Also used as the id of the row the operation creates, so an optimistic note
  // on screen and the row it becomes are the same thing.
  id: string;
  op: OutboxOp;
  queuedAt: number;
  // Bumped each time a flush fails, so a permanently broken entry can be
  // spotted rather than retried into eternity.
  attempts: number;
};

// After this many failed sends an entry is almost certainly not a connection
// problem — a deleted row, a rejected value — and retrying it forever would
// block everything queued behind it.
export const MAX_ATTEMPTS = 5;

export function outboxKey(userId: string): string {
  return `${KEY_PREFIX}:${userId}`;
}

// Local ids are marked so nothing mistakes one for a database id.
export function localId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith('local_');
}

export async function readOutbox(userId: string): Promise<OutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(outboxKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Could not read outbox', e);
    return [];
  }
}

export async function writeOutbox(userId: string, entries: OutboxEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(outboxKey(userId), JSON.stringify(entries));
  } catch (e) {
    // Nothing useful to do: the change is still applied on screen, it just
    // won't survive a restart.
    console.warn('Could not write outbox', e);
  }
}

export async function clearOutbox(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(outboxKey(userId));
  } catch (e) {
    console.warn('Could not clear outbox', e);
  }
}

// Whether a failure is worth queueing for. A dropped connection is; a rejected
// value is not — replaying that would fail exactly the same way in an hour.
//
// Supabase surfaces network trouble as a TypeError from fetch, and everything
// else as an object with a Postgres error code.
export function isOffline(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof TypeError) return true;

  const message = String((error as { message?: unknown })?.message ?? error).toLowerCase();
  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('timeout') ||
    message.includes('offline')
  ) {
    return true;
  }

  // A Postgres error code means the server answered, so it isn't a connection
  // problem however unhappy the answer was.
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' && code === '';
}
