-- Storage for profile pictures — both the people you track and your own.
-- Run this once in the Supabase SQL editor.
--
-- Files are laid out as  avatars/<user-id>/<something>.jpg  so the owner can be
-- read straight off the path. That's what every policy below keys on: you may
-- only write inside your own folder.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read. The bucket holds nothing secret, and public URLs mean the app
-- can render an avatar with a plain <Image src>, no signing round-trip.
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatars" on storage.objects;
create policy "Users upload their own avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users replace their own avatars" on storage.objects;
create policy "Users replace their own avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own avatars" on storage.objects;
create policy "Users delete their own avatars"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
