-- Cleanup for merge_birthdays.sql. DESTRUCTIVE — run only after confirming in
-- the app that every birthday and its notes survived the merge.
--
-- Check first. birthdays_before and birthdays_migrated should match, and
-- notes_still_orphaned should be 0:
--
--   select
--     (select count(*) from public.birthdays) as birthdays_before,
--     (select count(*) from public.special_days where is_birthday) as birthdays_migrated,
--     (select count(*) from public.notes where birthday_id is not null) as notes_still_orphaned;
--
-- Only run what follows if those numbers look right. Once dropped, the original
-- birthday rows are gone for good.

alter table public.notes drop column if exists birthday_id;
drop table if exists public.birthdays;

-- The provenance column has done its job once the source table is gone.
alter table public.special_days drop column if exists migrated_from_birthday_id;
