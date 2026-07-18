-- Looking back: let a note record what actually happened on one occurrence of a
-- day, rather than only what you plan to do next time.
--
-- A note with occurred_on set is a memory of that specific date ("got her the
-- camera lens"). A note without it is a standing note about the day or the
-- person, which is what every existing note is.
--
-- Run this once in the Supabase SQL editor.

alter table public.notes
  add column if not exists occurred_on date;

create index if not exists notes_occurred_on_idx
  on public.notes (special_day_id, occurred_on)
  where occurred_on is not null;
