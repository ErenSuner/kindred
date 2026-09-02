-- Dropping everything the app stopped reading when Kindred became a birthday
-- reminder and nothing else.
--
-- THIS IS IRREVERSIBLE. Every person, note, gift idea, memory photo, personal
-- event and routine in the database is destroyed. Run inspect_before_drop.sql
-- first and read the row counts, and take a backup from
-- Supabase → Database → Backups if any of it is real.
--
-- What survives: simple_birthdays, feedback, delete_user().
--
-- The `avatars` bucket is NOT handled here. Supabase blocks direct deletes from
-- storage.objects (a storage.protect_delete() trigger), so the bucket has to be
-- emptied and removed through the Storage API — in practice, from the dashboard:
-- Storage → avatars → Empty bucket, then Delete bucket. Do that after this runs.
--
-- Run once in the Supabase SQL editor.

-- === 1. Application tables ====================================================
--
-- Dropped in dependency order rather than with `cascade`, so that anything
-- pointing at them that this script does not know about raises an error and
-- rolls the whole transaction back, instead of being silently swept away.
-- That is not theoretical: the first run of this script stopped on `birthdays`,
-- a table legacy/drop_birthdays.sql was supposed to have removed years ago and
-- never did. A `cascade` would have deleted it without ever mentioning it.

begin;

drop table if exists public.notes;         -- references people, special_days, birthdays
drop table if exists public.birthdays;     -- references people (pre-merge table)
drop table if exists public.special_days;  -- references people
drop table if exists public.my_events;
drop table if exists public.people;

commit;

-- === 2. Account deletion ======================================================
--
-- Its own statement, after the commit, because it replaces a function rather
-- than dropping anything: if it fails, the table drops above still stand.
--
-- The old body cleared the user's folder in the avatars bucket. That is now a
-- hard error — storage.protect_delete() rejects it — which means account
-- deletion is broken until this runs. Nothing needs to replace it: the bucket
-- is going away, and simple_birthdays cascades off auth.users on its own.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Cascades to every table that references auth.users(id) on delete cascade.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;

-- === 3. Avatar storage policies ==============================================
--
-- Dropping a policy is DDL, not a delete, so protect_delete() does not apply.
-- Last, and outside any transaction, so that a permissions refusal here cannot
-- undo anything above. If these do error, remove them from
-- Storage → Policies in the dashboard instead — they are inert either way once
-- the bucket is gone.

drop policy if exists "Avatars are publicly readable" on storage.objects;
drop policy if exists "Users upload their own avatars" on storage.objects;
drop policy if exists "Users replace their own avatars" on storage.objects;
drop policy if exists "Users delete their own avatars" on storage.objects;

-- === 4. Confirm ==============================================================
-- Should list exactly: feedback, simple_birthdays.

select c.relname as remaining_table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
