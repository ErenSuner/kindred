-- Account deletion — the RPC the Settings screen calls.
--
-- Google Play requires an in-app way to delete the account and its data. The
-- app calls `supabase.rpc('delete_user')` (src/app/(tabs)/settings.tsx). Without
-- this function that call fails and the "Delete account" button does nothing.
--
-- Everything the user owns hangs off auth.users(id) with `on delete cascade`
-- (people, special_days, notes, my_events, simple_birthdays), so deleting the
-- auth row removes all of it. Storage objects do not cascade, so the user's
-- folder in the `avatars` bucket (also used for memory photos) is cleared first.
--
-- SECURITY DEFINER: runs as the function owner so it may touch auth.users and
-- storage.objects, but it only ever acts on auth.uid() — the caller's own row.
--
-- Run this once in the Supabase SQL editor.

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

  -- Per-user folder is the uid; the app stores at `<uid>/...` in the avatars
  -- bucket (see src/utils/avatars.ts). Wipe it before the auth row goes.
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = uid::text;

  -- Cascades to every table that references auth.users(id) on delete cascade.
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may call it, and it self-limits to auth.uid() above.
revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
