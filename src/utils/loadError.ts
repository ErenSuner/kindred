import { isOffline } from '@/utils/outbox';

// Turning a failed fetch into something worth reading.
//
// The codes below are the ones that mean "the app is ahead of its database",
// which is a developer problem with a specific fix (run the migration) rather
// than something the user can retry their way out of. Everything else is
// treated as transient.
//
// Verified against the live project: a missing column comes back as Postgres
// 42703, but a missing *table* is caught by PostgREST first and reported as
// PGRST205 — not the Postgres 42P01 you would expect.
const SCHEMA_MISMATCH_CODES = new Set([
  '42703', // undefined_column
  '42P01', // undefined_table (direct from Postgres)
  'PGRST204', // PostgREST: column not found in schema cache
  'PGRST205', // PostgREST: table not found in schema cache
]);

export function isSchemaMismatch(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return typeof code === 'string' && SCHEMA_MISMATCH_CODES.has(code);
}

export function describeLoadError(err: unknown, fallback: string): string {
  return isSchemaMismatch(err)
    ? 'This app is ahead of its database — a migration still needs to be run.'
    : fallback;
}

// What to say when a write didn't land.
//
// Notes queue up and send themselves later, but people, days and events don't —
// they carry photos, ids and relationships that can't be replayed safely. So
// the user has to be told plainly, and told which kind of problem it is: no
// connection is worth waiting out, a rejection is not.
export function describeWriteError(err: unknown, what = 'save'): string {
  if (isSchemaMismatch(err)) {
    return 'This app is ahead of its database — a migration still needs to be run.';
  }
  if (isOffline(err)) {
    return `You're offline, so this couldn't ${what}. Your changes are still here — try again once you're back online.`;
  }
  return `Could not ${what}. Please try again.`;
}
