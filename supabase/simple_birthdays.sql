-- Simple Birthdays: a birthday saved on its own, with no person attached.
--
-- People in Kindred carry the whole relationship machinery — role, tags, notes,
-- countdowns. Sometimes you only want to remember that someone's birthday is on
-- a date without adopting them as a full contact. That's this table: a name, a
-- date, an emoji, and reminders. Nothing else.
--
-- Run this once in the Supabase SQL editor.

create table if not exists public.simple_birthdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- A year of 1000 means the user skipped the year, so no age is shown.
  date date not null,
  emoji text not null default '🎂',
  nudges text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists simple_birthdays_user_id_idx on public.simple_birthdays (user_id);

alter table public.simple_birthdays enable row level security;

create policy "Users read their own simple birthdays"
  on public.simple_birthdays for select
  using (auth.uid() = user_id);

create policy "Users insert their own simple birthdays"
  on public.simple_birthdays for insert
  with check (auth.uid() = user_id);

create policy "Users update their own simple birthdays"
  on public.simple_birthdays for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own simple birthdays"
  on public.simple_birthdays for delete
  using (auth.uid() = user_id);
