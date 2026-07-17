-- special_days.is_annual backs the "One-Time Event" toggle: the app already
-- writes this column on insert/update and reads it back to decide whether an
-- event repeats each year, but the column was never added to the table.
-- Run this once in the Supabase SQL editor.
--
-- Existing rows default to annual, which matches how they were being treated
-- while the column was missing.

alter table public.special_days
  add column if not exists is_annual boolean not null default true;
