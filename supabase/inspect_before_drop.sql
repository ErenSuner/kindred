-- READ-ONLY. Run this first, in the Supabase SQL editor.
--
-- It answers the only question that matters before running
-- drop_removed_features.sql: how much real data is about to be destroyed.
-- Nothing here writes.

-- 1. Which tables still exist, and how many rows each holds.
select
  c.relname                        as table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) as size,
  (select count(*) from pg_class c2
    where c2.relnamespace = c.relnamespace
      and c2.relname = c.relname)  as exists_check,
  c.reltuples::bigint              as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 2. Exact counts for the tables the app no longer reads. Comment out any line
--    whose table has already been dropped, or the whole query errors.
--
--    `birthdays` is the pre-merge table. It was supposed to have been dropped
--    by legacy/drop_birthdays.sql, but that migration turns out never to have
--    run here — which is how it showed up holding a foreign key to people.
select 'people'        as table_name, count(*) from public.people
union all select 'special_days',      count(*) from public.special_days
union all select 'notes',             count(*) from public.notes
union all select 'my_events',         count(*) from public.my_events
union all select 'birthdays',         count(*) from public.birthdays;

-- 2b. Everything that still points at a table we are about to drop.
--     Anything listed here that is NOT itself on the drop list has to be dealt
--     with before drop_removed_features.sql will run. This is the query that
--     would have caught `birthdays` up front.
select
  con.conname     as constraint_name,
  child.relname   as depends_on_it,
  parent.relname  as referenced_table
from pg_constraint con
join pg_class child  on child.oid  = con.conrelid
join pg_class parent on parent.oid = con.confrelid
join pg_namespace n  on n.oid      = parent.relnamespace
where con.contype = 'f'
  and n.nspname = 'public'
  and parent.relname in ('people', 'special_days', 'notes', 'my_events', 'birthdays')
order by parent.relname, child.relname;

-- 3. Exact counts for the tables that STAY. These must survive.
select 'simple_birthdays' as table_name, count(*) from public.simple_birthdays
union all select 'feedback',            count(*) from public.feedback;

-- 4. Files in the avatars bucket, which is also going.
select count(*) as avatar_files, pg_size_pretty(sum((metadata->>'size')::bigint)) as total
from storage.objects
where bucket_id = 'avatars';
