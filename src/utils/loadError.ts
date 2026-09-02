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

// Whether a failure is a dropped connection rather than a rejected value. The
// two need different words: one is worth waiting out, the other never will be.
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
// Nothing queues. A birthday is three fields the user is looking at, so the
// honest thing is to say it didn't save and leave what they typed on screen —
// and to say which kind of problem it is: no connection is worth waiting out,
// a rejection is not.
export function describeWriteError(err: unknown, what = 'save'): string {
  if (isSchemaMismatch(err)) {
    return 'This app is ahead of its database — a migration still needs to be run.';
  }
  if (isOffline(err)) {
    return `You're offline, so this couldn't ${what}. Your changes are still here — try again once you're back online.`;
  }
  return `Could not ${what}. Please try again.`;
}
