-- Clears out notes written under the old tagged-note system.
--
-- Notes used to carry a `kind` the user picked from four chips: Gift Idea,
-- Memory, Reminder, Other. Those chips are gone. A note's kind now says which
-- part of the app it belongs to, and only three values mean anything for a
-- general note about a person:
--
--   'Gift Idea'  the gift list
--   'Notebook'   the free-form notebook, one row per person
--   (photo_url)  a memory, which is a picture
--
-- Anything else was a 'Reminder' or an 'Other' from before the change. They
-- were being shown in an "Earlier notes" section that would never go away.
--
-- READ THIS BEFORE RUNNING: this deletes data. It is only safe if the rows are
-- your own test notes. Check what you are about to lose first:
--
--   select id, kind, body, created_at from public.notes
--   where special_day_id is null
--     and photo_url is null
--     and kind not in ('Gift Idea', 'Notebook');
--
-- Then, if you are happy with that list:

delete from public.notes
where special_day_id is null
  and photo_url is null
  and kind not in ('Gift Idea', 'Notebook');
