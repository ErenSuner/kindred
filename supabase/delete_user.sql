-- Account deletion — the RPC the Security screen calls.
--
-- Google Play requires an in-app way to delete the account and its data. The
-- app calls `supabase.rpc('delete_user')` (src/app/settings/security.tsx).
-- Without this function that call fails and the "Delete account" button does
-- nothing.
--
-- simple_birthdays hangs off auth.users(id) with `on delete cascade`, so
-- deleting the auth row removes everything the user owns.
--
-- SECURITY DEFINER: runs as the function owner so it may touch auth.users, but
-- it only ever acts on auth.uid() — the caller's own row.
--
-- Run this once in the Supabase SQL editor.
--
-- Note: this is the current definition. drop_removed_features.sql replaces an
-- older version that also cleared the user's folder in the `avatars` bucket,
-- which no longer exists.

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

-- Only signed-in users may call it, and it self-limits to auth.uid() above.
revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
