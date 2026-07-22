-- Security audit — reads only, changes nothing. Safe to run any time.
--
-- Run this in the Supabase SQL editor. Every one of the five queries should
-- come back with zero rows. A row is a finding, and each one names what to fix.
--
-- Why this file exists: only `my_events` (my_events.sql) and the avatars bucket
-- (avatars_storage.sql) have their row-level security checked into this repo.
-- `people`, `special_days`, `notes` and `simple_birthdays` were created in the
-- dashboard, so nothing here proves they are locked down. This is how you find
-- out rather than assume.

-- ---------------------------------------------------------------------------
-- 1. Tables with row-level security switched off.
--
-- Without RLS, the anon key shipped inside the app can read every row of that
-- table belonging to every account. This is the finding that matters most.
-- ---------------------------------------------------------------------------
select
  'RLS DISABLED' as finding,
  c.relname     as table_name,
  'alter table public.' || c.relname || ' enable row level security;' as fix
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;

-- ---------------------------------------------------------------------------
-- 2. Tables with RLS on but no policies at all.
--
-- RLS with no policy denies everything, so this does not leak — but it means
-- the app cannot read its own data, which usually gets "fixed" later by turning
-- RLS off again.
-- ---------------------------------------------------------------------------
select
  'RLS ON, NO POLICIES' as finding,
  c.relname             as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  )
order by c.relname;

-- ---------------------------------------------------------------------------
-- 3. Policies that never mention auth.uid().
--
-- A policy like `using (true)` passes for everyone. Every table in this app is
-- owned by exactly one account, so every policy should be scoped to the caller.
-- Read the `definition` column before acting: a policy may legitimately defer to
-- a parent row (a note scoped through its person), and that shows up here too.
-- ---------------------------------------------------------------------------
select
  'POLICY NOT SCOPED TO auth.uid()' as finding,
  p.tablename,
  p.policyname,
  p.cmd,
  coalesce(p.qual, '') || ' | ' || coalesce(p.with_check, '') as definition
from pg_policies p
where p.schemaname = 'public'
  and coalesce(p.qual, '') || coalesce(p.with_check, '') not like '%auth.uid()%'
order by p.tablename, p.policyname;

-- ---------------------------------------------------------------------------
-- 4. Storage policies that are not scoped to the caller's own folder.
--
-- The avatars bucket is public to read on purpose (public URLs), but writing
-- must stay inside `<uid>/…`. Rows here mean someone else can overwrite your
-- photos. INSERT/UPDATE/DELETE only — the public read policy is expected.
-- ---------------------------------------------------------------------------
select
  'STORAGE WRITE POLICY NOT SCOPED' as finding,
  p.policyname,
  p.cmd,
  coalesce(p.qual, '') || ' | ' || coalesce(p.with_check, '') as definition
from pg_policies p
where p.schemaname = 'storage'
  and p.tablename = 'objects'
  and p.cmd <> 'SELECT'
  and coalesce(p.qual, '') || coalesce(p.with_check, '') not like '%auth.uid()%'
order by p.policyname;

-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER functions without a pinned search_path.
--
-- A definer function runs as its owner. If search_path is not pinned, a caller
-- can put a table of their own ahead of the real one and have the function
-- operate on it with the owner's rights. `delete_user` already pins it
-- (delete_user.sql); anything else listed here does not.
-- ---------------------------------------------------------------------------
select
  'DEFINER WITHOUT search_path' as finding,
  p.proname                     as function_name,
  'alter function public.' || p.proname || '() set search_path = public;' as fix
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and (p.proconfig is null or not exists (
    select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%'
  ))
order by p.proname;

-- ---------------------------------------------------------------------------
-- 6. Who may execute delete_user.
--
-- Expected: exactly one row, granting EXECUTE to `authenticated`. A row for
-- PUBLIC or `anon` means anyone holding the app's anon key can call it.
-- ---------------------------------------------------------------------------
select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'delete_user';
