-- Links a person back to the address-book entry they were imported from.
-- Run this once in the Supabase SQL editor.
--
-- This stores the operating system's opaque contact identifier and nothing
-- else. No phone number, no email — Kindred deliberately holds no copy of
-- anyone's contact details. The id is only good for handing back to the phone
-- so it can open its own Contacts app, which is where calling and messaging
-- belong anyway.
--
-- The id is device-specific: restore onto a new phone and it stops resolving.
-- That is why nothing depends on it. The button that uses it simply doesn't
-- appear when the contact can't be found.

alter table public.people
  add column if not exists contact_id text;
