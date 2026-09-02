-- Recurrence: events can repeat weekly, monthly, yearly, on any interval, or
-- not at all. This replaces the is_annual boolean on both event tables.
-- Run this once in the Supabase SQL editor.
--
-- is_annual is left in place (unused by the app after this change) so the data
-- is still there if you want to check the backfill. Drop it once you're happy:
--   alter table public.special_days drop column is_annual;
--   alter table public.my_events drop column is_annual;

alter table public.special_days
  add column if not exists repeat_unit text not null default 'year',
  add column if not exists repeat_interval integer not null default 1;

alter table public.my_events
  add column if not exists repeat_unit text not null default 'year',
  add column if not exists repeat_interval integer not null default 1;

-- Carry the old boolean over: annual events repeat yearly, the rest are one-time.
update public.special_days
  set repeat_unit = case when is_annual then 'year' else 'none' end;

update public.my_events
  set repeat_unit = case when is_annual then 'year' else 'none' end;

alter table public.special_days drop constraint if exists special_days_repeat_unit_check;
alter table public.special_days add constraint special_days_repeat_unit_check
  check (repeat_unit in ('none', 'week', 'month', 'year'));

alter table public.special_days drop constraint if exists special_days_repeat_interval_check;
alter table public.special_days add constraint special_days_repeat_interval_check
  check (repeat_interval between 1 and 30);

alter table public.my_events drop constraint if exists my_events_repeat_unit_check;
alter table public.my_events add constraint my_events_repeat_unit_check
  check (repeat_unit in ('none', 'week', 'month', 'year'));

alter table public.my_events drop constraint if exists my_events_repeat_interval_check;
alter table public.my_events add constraint my_events_repeat_interval_check
  check (repeat_interval between 1 and 30);

-- is_annual is no longer written by the app, so new rows must not depend on it.
alter table public.special_days alter column is_annual set default true;
alter table public.my_events alter column is_annual set default true;
