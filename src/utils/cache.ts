import AsyncStorage from '@react-native-async-storage/async-storage';

// Raw database rows are cached, not the mapped objects the screens use.
// Mapped objects carry computed fields — "3 days away", "August 2nd, 2026" —
// which would be wrong the moment the cache outlived the day it was written.
// Re-mapping on read keeps every countdown honest.

const PREFIX = '@cache';

export function cacheKey(scope: string, userId: string): string {
  return `${PREFIX}:${scope}:${userId}`;
}

type Envelope<T> = { savedAt: number; rows: T };

export async function readCache<T>(key: string): Promise<{ rows: T; savedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    return { rows: parsed.rows, savedAt: parsed.savedAt };
  } catch (e) {
    console.warn('Could not read cache', key, e);
    return null;
  }
}

export async function writeCache(key: string, rows: unknown): Promise<void> {
  try {
    const envelope: Envelope<unknown> = { savedAt: Date.now(), rows };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (e) {
    // A full disk shouldn't break saving — the app just loses its offline copy.
    console.warn('Could not write cache', key, e);
  }
}

// Signing out shouldn't leave one account's data readable by the next.
export async function clearCachesForUser(userId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(PREFIX) && k.endsWith(`:${userId}`));
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
  } catch (e) {
    console.warn('Could not clear caches', e);
  }
}
