-- Feedback: what people send from Settings → Feedback.
--
-- This used to be a `mailto:` link, which on Android 11+ cannot be resolved
-- without a <queries> manifest entry — so the system handed it to the browser
-- and the person got a blank page. Writing to the database instead means the
-- feature works on every device, with or without a mail app, and a failure is
-- something the screen can actually report.
--
-- Run this once in the Supabase SQL editor.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'other' check (kind in ('bug', 'idea', 'other')),
  body text not null check (length(btrim(body)) > 0),
  -- Where to write back, if they want an answer. Defaults to the account's
  -- address in the app but is editable, so it is stored rather than assumed.
  reply_to text,
  -- Captured automatically. Asking "which version are you on?" in the reply
  -- wastes a round trip, and most people don't know.
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

create policy "Users read their own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "Users insert their own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

-- No update or delete policy on purpose. Sent feedback is a record of what was
-- said at the time; RLS denies any command without a matching policy, so this
-- is enforced rather than merely intended. (Rows still go when the account does,
-- through the cascade above — which is what delete_user relies on.)
