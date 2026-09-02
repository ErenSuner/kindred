-- Two additions. Run this once in the Supabase SQL editor.
--
-- 1. A time of day for reminders and routines. A course at 18:00 was only ever
--    "Tuesday" before, which is not enough to leave the house on time. Null
--    means the event has no particular time, which is still the common case for
--    a birthday or a renewal date.
-- 2. Gift ideas that have been bought. They used to pile up with no way to
--    close one off, so the list only ever grew.

alter table public.my_events
  add column if not exists time_of_day time;

alter table public.notes
  add column if not exists done_at timestamptz;

-- Bought gift ideas are filtered out of the main list, so they're worth an
-- index once someone has a few years of them.
create index if not exists notes_done_at_idx
  on public.notes (person_id, done_at)
  where done_at is not null;
