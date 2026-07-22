// The one database call the feedback screen makes.
//
// Same shape as peopleApi: a plain async function that takes arguments, talks to
// Supabase, and throws if it goes wrong. It lives in its own file rather than in
// peopleApi because that file is the people/days/notes surface and this has
// nothing to do with it — but it belongs here, not in a screen. Screens never
// call Supabase.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

export type FeedbackKind = 'bug' | 'idea' | 'other';

export type FeedbackDraft = {
  kind: FeedbackKind;
  body: string;
  // Optional: someone may not want a reply at all.
  replyTo?: string;
};

export async function sendFeedback(draft: FeedbackDraft): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = auth.user?.id;
  if (!userId) throw new Error('Not signed in');

  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    kind: draft.kind,
    body: draft.body.trim(),
    reply_to: draft.replyTo?.trim() || null,
    // Recorded rather than asked for. "Which version are you on?" is a round
    // trip most people can't answer anyway.
    app_version: Constants.expoConfig?.version ?? null,
    platform: Platform.OS,
  });

  if (error) throw error;
}
