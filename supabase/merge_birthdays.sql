-- Fold `birthdays` into `special_days`.
--
-- A birthday was only ever a special day with a fixed title and a yearly cycle,
-- but keeping it in its own table meant every feature — recurrence, notes,
-- reminders — had to be built twice and the two copies drifted apart.
--
-- This migration is re-runnable: it tracks which birthday each copied row came
-- from and skips anything already moved.
--
-- It deliberately does NOT drop the `birthdays` table or `notes.birthday_id`.
-- They stay as a backup until you have confirmed birthdays still look right in
-- the app. Cleanup lives in drop_birthdays.sql, to be run later.

-- 1. Mark which special days are birthdays, and remember where they came from.
alter table public.special_days
  add column if not exists is_birthday boolean not null default false,
  add column if not exists migrated_from_birthday_id uuid;

create index if not exists special_days_is_birthday_idx
  on public.special_days (person_id) where is_birthday;

-- 2. Copy each birthday across.
--
-- DISTINCT ON keeps one row per person if duplicates ever crept in; the newest
-- wins and the rest stay recoverable from the untouched `birthdays` table.
insert into public.special_days
  (person_id, title, date, icon, accent, nudges, repeat_unit, repeat_interval,
   is_birthday, migrated_from_birthday_id, created_at)
select distinct on (b.person_id)
  b.person_id,
  'Birthday',
  b.date,
  'cake',
  'tertiary',
  coalesce(b.nudges, '{}'),
  'year',
  1,
  true,
  b.id,
  b.created_at
from public.birthdays b
where not exists (
  select 1 from public.special_days sd where sd.migrated_from_birthday_id = b.id
)
and not exists (
  -- Belt and braces: never create a second birthday for someone who already has
  -- one, however it got there.
  select 1 from public.special_days sd where sd.person_id = b.person_id and sd.is_birthday
)
order by b.person_id, b.created_at desc;

-- 3. Point birthday notes at the special day that replaced their birthday.
update public.notes n
set special_day_id = sd.id,
    birthday_id = null
from public.special_days sd
where n.birthday_id is not null
  and sd.migrated_from_birthday_id = n.birthday_id;

-- 4. One birthday per person, enforced from here on.
create unique index if not exists special_days_one_birthday_per_person
  on public.special_days (person_id) where is_birthday;

-- 5. Sanity check — both counts should match, and orphaned should be 0.
select
  (select count(*) from public.birthdays) as birthdays_before,
  (select count(*) from public.special_days where is_birthday) as birthdays_migrated,
  (select count(*) from public.notes where birthday_id is not null) as notes_still_orphaned;
