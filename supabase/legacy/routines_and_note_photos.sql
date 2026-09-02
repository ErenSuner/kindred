-- Three changes, all additive. Run this once in the Supabase SQL editor.
--
-- 1. Repeating every N days. The custom repeat picker offers days now, so the
--    check constraints have to allow the unit.
-- 2. Weekly routines. A course that meets on Tuesdays and Thursdays isn't a
--    date — it's a set of weekdays. Routines live in my_events so everything
--    that already reads that table keeps working; a row with a non-empty
--    weekdays array is a routine, and its `date` is only the start.
-- 3. Photos on notes. A memory is a picture, so a note needs somewhere to hold
--    one. Files go in the existing avatars bucket.

-- 1 ---------------------------------------------------------------------------

alter table public.special_days drop constraint if exists special_days_repeat_unit_check;
alter table public.special_days add constraint special_days_repeat_unit_check
  check (repeat_unit in ('none', 'day', 'week', 'month', 'year'));

alter table public.my_events drop constraint if exists my_events_repeat_unit_check;
alter table public.my_events add constraint my_events_repeat_unit_check
  check (repeat_unit in ('none', 'day', 'week', 'month', 'year'));

-- 2 ---------------------------------------------------------------------------

-- 0 = Sunday through 6 = Saturday, matching JavaScript's getDay().
alter table public.my_events
  add column if not exists weekdays smallint[] not null default '{}';

alter table public.my_events drop constraint if exists my_events_weekdays_check;
alter table public.my_events add constraint my_events_weekdays_check
  check (array_length(weekdays, 1) is null or weekdays <@ array[0,1,2,3,4,5,6]::smallint[]);

-- 3 ---------------------------------------------------------------------------

alter table public.notes
  add column if not exists photo_url text;

-- A notebook page is one row per person, edited in place rather than appended
-- to. Nothing enforces the one-per-person rule at the database level because
-- notes are already scoped by person_id and kind.
create index if not exists notes_person_kind_idx on public.notes (person_id, kind);
