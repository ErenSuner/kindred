-- Notes can now belong to a specific occasion rather than to the person as a
-- whole. Run this once in the Supabase SQL editor.
--
-- Birthdays live in their own table, so a note needs one of two possible
-- targets. Both are nullable: a note with neither set is a general note about
-- the person, which is what every existing row is. Nothing is migrated or
-- deleted — old notes keep showing on the person page under "About <name>".

alter table public.notes
  add column if not exists special_day_id uuid references public.special_days(id) on delete cascade,
  add column if not exists birthday_id uuid references public.birthdays(id) on delete cascade;

create index if not exists notes_special_day_id_idx on public.notes (special_day_id);
create index if not exists notes_birthday_id_idx on public.notes (birthday_id);

-- A note points at one thing at most.
alter table public.notes drop constraint if exists notes_single_target_check;
alter table public.notes add constraint notes_single_target_check
  check (special_day_id is null or birthday_id is null);
