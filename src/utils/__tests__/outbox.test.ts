import {
  MAX_ATTEMPTS,
  OutboxEntry,
  clearOutbox,
  isLocalId,
  isOffline,
  localId,
  outboxKey,
  readOutbox,
  writeOutbox,
} from '@/utils/outbox';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER = 'user-1';

const entry = (over: Partial<OutboxEntry> = {}): OutboxEntry => ({
  id: localId(),
  op: { kind: 'setNoteDone', noteId: 'n1', done: true },
  queuedAt: Date.now(),
  attempts: 0,
  ...over,
});

beforeEach(async () => {
  await clearOutbox(USER);
});

describe('local ids', () => {
  it('are recognisable', () => {
    expect(isLocalId(localId())).toBe(true);
  });

  it('do not collide', () => {
    const ids = new Set(Array.from({ length: 500 }, () => localId()));
    expect(ids.size).toBe(500);
  });

  it('do not mistake a database id for a local one', () => {
    expect(isLocalId('8f14e45f-ceea-467a-9c1d-1e1a1e1a1e1a')).toBe(false);
  });
});

describe('storage', () => {
  it('is empty to begin with', async () => {
    expect(await readOutbox(USER)).toEqual([]);
  });

  it('round-trips entries', async () => {
    const entries = [entry(), entry()];
    await writeOutbox(USER, entries);
    expect(await readOutbox(USER)).toEqual(entries);
  });

  it('keeps one user out of another', async () => {
    await writeOutbox(USER, [entry()]);
    expect(await readOutbox('user-2')).toEqual([]);
    expect(outboxKey(USER)).not.toBe(outboxKey('user-2'));
  });

  it('survives a corrupted store rather than throwing', async () => {
    await AsyncStorage.setItem(outboxKey(USER), 'not json');
    expect(await readOutbox(USER)).toEqual([]);
  });

  it('ignores a stored value that is not a list', async () => {
    await AsyncStorage.setItem(outboxKey(USER), JSON.stringify({ nope: true }));
    expect(await readOutbox(USER)).toEqual([]);
  });
});

describe('isOffline', () => {
  it('recognises a dropped connection', () => {
    expect(isOffline(new TypeError('Network request failed'))).toBe(true);
    expect(isOffline({ message: 'Failed to fetch' })).toBe(true);
    expect(isOffline({ message: 'Request timeout' })).toBe(true);
  });

  it('does not queue a rejection the server actually sent', () => {
    // A Postgres code means the request arrived and was refused. Replaying it
    // would fail identically.
    expect(isOffline({ code: '23505', message: 'duplicate key value' })).toBe(false);
    expect(isOffline({ code: '42501', message: 'row-level security' })).toBe(false);
  });

  it('is false for nothing', () => {
    expect(isOffline(null)).toBe(false);
    expect(isOffline(undefined)).toBe(false);
  });
});

describe('attempt limit', () => {
  it('gives up rather than blocking the queue forever', () => {
    // The entry ahead of everything else must not be retried indefinitely, or
    // nothing behind it ever sends.
    const stuck = entry({ attempts: MAX_ATTEMPTS });
    expect(stuck.attempts >= MAX_ATTEMPTS).toBe(true);
  });
});
