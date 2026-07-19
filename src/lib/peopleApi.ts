// Every database call the people screens make, in one place.
//
// These are plain async functions: they take arguments, talk to Supabase, and
// throw if it goes wrong. No React, no state, no refreshing. PeopleContext owns
// all of that — which is what stopped it being 800 lines of provider with the
// SQL buried in the middle.

import { supabase } from '@/lib/supabase';
import type { Note, Relationship } from '@/data/mock';
import { removeAvatarByUrl } from '@/utils/avatars';
import { MEMORY, NOTEBOOK } from '@/utils/notes';
import { Recurrence, YEARLY, serializeRecurrence } from '@/utils/recurrence';

// Which occasion a note hangs off, if any. Omitting it writes a general note
// about the person. Birthdays are special days now, so they use the same target.
export type NoteTarget = { specialDayId: string };

// A note supplied alongside the occasion it belongs to, before that occasion
// has an id of its own.
export type NoteDraft = { kind: string; body: string };

// Supabase returns { data, error } rather than rejecting, so every call has to
// be unwrapped. Doing it here means the callers read as ordinary async code.
function unwrap<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

// For the calls that use .single() and then need the row back. Supabase types
// the row as nullable even though an error is raised when nothing comes back,
// so this makes the impossible case explicit rather than silently optional.
function unwrapRow<T>(result: { data: T | null; error: unknown }): NonNullable<T> {
  const row = unwrap(result);
  if (row == null) throw new Error('Write succeeded but returned no row');
  return row as NonNullable<T>;
}

const PEOPLE_SELECT = `
  id,
  name,
  role,
  avatar_url,
  is_pinned,
  contact_id,
  special_days (id, title, date, icon, accent, nudges, repeat_unit, repeat_interval, is_birthday, created_at),
  notes (id, kind, body, created_at, special_day_id, occurred_on, photo_url, done_at)
`;

export async function fetchPeopleRows(): Promise<any[]> {
  return unwrap(await supabase.from('people').select(PEOPLE_SELECT)) ?? [];
}

// --- People ------------------------------------------------------------------

export async function insertPerson(
  userId: string,
  data: { name: string; role: Relationship; avatarUrl?: string | null },
): Promise<string> {
  const row = unwrapRow<{ id: string }>(
    await supabase
      .from('people')
      .insert({
        user_id: userId,
        name: data.name,
        role: data.role,
        avatar_url: data.avatarUrl ?? null,
      })
      .select('id')
      .single(),
  );
  return row.id;
}

// One person, imported from the address book. `contactId` is the phone's own
// identifier — see contact_link.sql for why it, and only it, is stored.
export type ImportEntry = {
  name: string;
  role: Relationship;
  avatarUrl?: string | null;
  contactId?: string;
  // 'YYYY-MM-DD', with SKIPPED_YEAR when only a day and month are known.
  birthday?: string;
  birthdayNudges?: string[];
};

// Imports a whole selection in two round trips rather than two per person.
// Doing it one at a time meant fifty contacts cost a hundred full reloads of
// every person, day and note the user has.
export async function insertPeopleBatch(userId: string, entries: ImportEntry[]): Promise<string[]> {
  if (entries.length === 0) return [];

  const inserted = unwrapRow<{ id: string }[]>(
    await supabase
      .from('people')
      .insert(
        entries.map((e) => ({
          user_id: userId,
          name: e.name,
          role: e.role,
          avatar_url: e.avatarUrl ?? null,
          contact_id: e.contactId ?? null,
        })),
      )
      .select('id'),
  );

  // Postgres returns inserted rows in the order they were given, which is what
  // lets a birthday be matched back to the contact it came from.
  const birthdays = entries
    .map((entry, i) => ({ entry, id: inserted[i]?.id }))
    .filter(({ entry, id }) => !!entry.birthday && !!id)
    .map(({ entry, id }) => ({
      person_id: id,
      title: 'Birthday',
      date: entry.birthday,
      nudges: entry.birthdayNudges ?? [],
      icon: 'cake',
      accent: 'tertiary',
      repeat_unit: 'year',
      repeat_interval: 1,
      is_birthday: true,
    }));

  if (birthdays.length > 0) {
    // The people saved. Losing a birthday shouldn't undo that, so this is
    // reported rather than thrown.
    const { error } = await supabase.from('special_days').insert(birthdays);
    if (error) console.error('People imported, but some birthdays failed:', error);
  }

  return inserted.map((row) => row.id);
}

// Used to undo an import. One call, however many people.
export async function deletePeopleRows(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  unwrap(await supabase.from('people').delete().in('id', ids));
}

export async function updatePersonRow(
  id: string,
  data: { name: string; role: Relationship; avatarUrl?: string | null },
): Promise<void> {
  const updates: Record<string, unknown> = { name: data.name, role: data.role };
  // Left untouched unless the caller actually supplied one, so saving the name
  // doesn't wipe an existing picture.
  if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

  unwrap(await supabase.from('people').update(updates).eq('id', id));
}

export async function deletePersonRow(id: string): Promise<void> {
  unwrap(await supabase.from('people').delete().eq('id', id));
}

export async function setPinned(id: string, isPinned: boolean): Promise<void> {
  unwrap(await supabase.from('people').update({ is_pinned: isPinned }).eq('id', id));
}

// --- Special days ------------------------------------------------------------

function iconForTitle(title: string): string {
  return title.toLowerCase().includes('birthday') ? 'cake' : 'event';
}

export async function insertSpecialDay(
  personId: string,
  data: { title: string; date: string; nudges?: string[]; recurrence?: Recurrence; notes?: NoteDraft[] },
): Promise<void> {
  const inserted = unwrapRow<{ id: string }>(
    await supabase
      .from('special_days')
      .insert({
        person_id: personId,
        title: data.title,
        date: data.date,
        nudges: data.nudges || [],
        icon: iconForTitle(data.title),
        accent: 'primary',
        ...serializeRecurrence(data.recurrence ?? YEARLY),
      })
      .select('id')
      .single(),
  );

  await attachNotes(personId, inserted.id, data.notes, 'Special day');
}

export async function updateSpecialDayRow(
  dayId: string,
  data: { title?: string; date?: string; nudges?: string[]; recurrence?: Recurrence },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.title) {
    updates.title = data.title;
    updates.icon = iconForTitle(data.title);
  }
  if (data.date) updates.date = data.date;
  if (data.nudges) updates.nudges = data.nudges;
  if (data.recurrence !== undefined) Object.assign(updates, serializeRecurrence(data.recurrence));

  unwrap(await supabase.from('special_days').update(updates).eq('id', dayId));
}

export async function deleteSpecialDayRow(dayId: string): Promise<void> {
  unwrap(await supabase.from('special_days').delete().eq('id', dayId));
}

// A birthday is a special day with its title, icon and cycle fixed. The
// one-per-person rule is enforced by a partial unique index on the table.
export async function insertBirthday(
  personId: string,
  data: { date: string; nudges?: string[]; notes?: NoteDraft[] },
): Promise<void> {
  const inserted = unwrapRow<{ id: string }>(
    await supabase
      .from('special_days')
      .insert({
        person_id: personId,
        title: 'Birthday',
        date: data.date,
        nudges: data.nudges || [],
        icon: 'cake',
        accent: 'tertiary',
        repeat_unit: 'year',
        repeat_interval: 1,
        is_birthday: true,
      })
      .select('id')
      .single(),
  );

  await attachNotes(personId, inserted.id, data.notes, 'Birthday');
}

export async function updateBirthdayRow(
  birthdayId: string,
  data: { date?: string; nudges?: string[] },
): Promise<void> {
  unwrap(await supabase.from('special_days').update(data).eq('id', birthdayId));
}

// Notes written alongside a brand new occasion. The occasion saved fine, so
// losing these shouldn't read as a failed save — hence logged, not thrown.
async function attachNotes(
  personId: string,
  specialDayId: string,
  notes: NoteDraft[] | undefined,
  label: string,
): Promise<void> {
  if (!notes?.length) return;

  const { error } = await supabase.from('notes').insert(
    notes.map((n) => ({
      person_id: personId,
      special_day_id: specialDayId,
      kind: n.kind,
      body: n.body,
    })),
  );
  if (error) console.error(`${label} saved, but its notes failed:`, error);
}

// --- Notes -------------------------------------------------------------------

export async function insertNote(
  personId: string,
  kind: string,
  body: string,
  target?: NoteTarget,
  photoUrl?: string,
): Promise<void> {
  unwrap(
    await supabase.from('notes').insert({
      person_id: personId,
      kind,
      body,
      special_day_id: target?.specialDayId ?? null,
      photo_url: photoUrl ?? null,
    }),
  );
}

export async function updateNoteRow(
  noteId: string,
  data: { kind?: string; body?: string },
): Promise<void> {
  unwrap(await supabase.from('notes').update(data).eq('id', noteId));
}

// Marks a gift idea bought, or puts it back on the list. Stored as a timestamp
// rather than a boolean so "when did I get this" is answerable later.
export async function setNoteDone(noteId: string, done: boolean): Promise<void> {
  unwrap(
    await supabase
      .from('notes')
      .update({ done_at: done ? new Date().toISOString() : null })
      .eq('id', noteId),
  );
}

export async function deleteNoteRow(noteId: string): Promise<void> {
  // Read the photo first: once the row is gone there's nothing left pointing at
  // the file, and it would sit in storage forever.
  const { data: existing } = await supabase
    .from('notes')
    .select('photo_url')
    .eq('id', noteId)
    .maybeSingle();

  unwrap(await supabase.from('notes').delete().eq('id', noteId));

  if (existing?.photo_url) await removeAvatarByUrl(existing.photo_url);
}

// One notebook per person. An empty body deletes it rather than leaving a blank
// row behind.
export async function saveNotebookRow(
  personId: string,
  body: string,
  existingNoteId?: string,
): Promise<void> {
  if (existingNoteId) {
    if (body.trim()) {
      unwrap(await supabase.from('notes').update({ body }).eq('id', existingNoteId));
    } else {
      unwrap(await supabase.from('notes').delete().eq('id', existingNoteId));
    }
    return;
  }

  if (body.trim()) {
    unwrap(await supabase.from('notes').insert({ person_id: personId, kind: NOTEBOOK, body }));
  }
}

// A memory is a note pinned to one occurrence of a day. It deliberately does
// not go through syncNoteRows — the day's editor only knows about standing
// notes and would treat a memory it has never seen as deleted.
export async function saveMemoryRow(
  personId: string,
  specialDayId: string,
  occurredOn: string,
  body: string,
  existingNoteId?: string,
): Promise<void> {
  if (existingNoteId) {
    unwrap(await supabase.from('notes').update({ body }).eq('id', existingNoteId));
    return;
  }

  unwrap(
    await supabase.from('notes').insert({
      person_id: personId,
      special_day_id: specialDayId,
      occurred_on: occurredOn,
      kind: MEMORY,
      body,
    }),
  );
}

// Reconciles the notes attached to one occasion against what the editor is
// holding: anything gone from `next` is deleted, anything with an id is updated
// if its text changed, and the rest are created.
export async function syncNoteRows(
  personId: string,
  target: NoteTarget,
  existing: Note[],
  next: { id?: string; kind: string; body: string }[],
): Promise<void> {
  const keptIds = new Set(next.map((n) => n.id).filter(Boolean) as string[]);
  const removedIds = existing.filter((n) => !keptIds.has(n.id)).map((n) => n.id);

  const toInsert = next.filter((n) => !n.id);
  const toUpdate = next.filter((n) => {
    if (!n.id) return false;
    const before = existing.find((e) => e.id === n.id);
    return before && (before.body !== n.body || before.kind !== n.kind);
  });

  if (removedIds.length > 0) {
    unwrap(await supabase.from('notes').delete().in('id', removedIds));
  }

  if (toInsert.length > 0) {
    unwrap(
      await supabase.from('notes').insert(
        toInsert.map((n) => ({
          person_id: personId,
          special_day_id: target.specialDayId,
          kind: n.kind,
          body: n.body,
        })),
      ),
    );
  }

  for (const n of toUpdate) {
    unwrap(await supabase.from('notes').update({ kind: n.kind, body: n.body }).eq('id', n.id as string));
  }
}
