// The one database call the feedback screen makes.
//
// A plain async function: takes arguments, talks to Supabase, throws if it goes
// wrong. It lives here rather than in the screen because screens never call
// Supabase, and it is not in a context because there is no state to hold — the
// form sends once and forgets.

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
