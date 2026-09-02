-- My Events: reminders that belong to the user directly, not to a person.
-- Run this once in the Supabase SQL editor.

create table if not exists public.my_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  icon text not null default 'event',
  accent text not null default 'primary',
  nudges text[] not null default '{}',
  repeat_unit text not null default 'year' check (repeat_unit in ('none', 'week', 'month', 'year')),
  repeat_interval integer not null default 1 check (repeat_interval between 1 and 30),
  created_at timestamptz not null default now()
);

create index if not exists my_events_user_id_idx on public.my_events (user_id);

alter table public.my_events enable row level security;

create policy "Users read their own events"
  on public.my_events for select
  using (auth.uid() = user_id);

create policy "Users insert their own events"
  on public.my_events for insert
  with check (auth.uid() = user_id);

create policy "Users update their own events"
  on public.my_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own events"
  on public.my_events for delete
  using (auth.uid() = user_id);
