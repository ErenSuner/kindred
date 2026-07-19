// Shows a queued write as though it had already happened.
//
// The outbox holds operations that couldn't reach the server. Without this they
// would be invisible until the connection came back, so adding a gift idea on a
// train would look like it did nothing. Applying them to the raw rows before
// mapping means every screen sees them, and the countdown maths still runs on
// real data rather than on a patched-up view.
//
// Rows in, rows out — the same shape Supabase returns, so this slots in ahead
// of mapDbPersonToPerson without anything downstream knowing.

import { NOTEBOOK } from '@/utils/notes';
import type { OutboxEntry } from '@/utils/outbox';

type Row = Record<string, any>;

function noteRow(entry: OutboxEntry, personId: string, kind: string, body: string, specialDayId?: string): Row {
  return {
    id: entry.id,
    kind,
    body,
    created_at: new Date(entry.queuedAt).toISOString(),
    special_day_id: specialDayId ?? null,
    occurred_on: null,
    photo_url: null,
    done_at: null,
    person_id: personId,
  };
}

export function applyOutbox(rows: Row[], entries: OutboxEntry[]): Row[] {
  if (entries.length === 0) return rows;

  // Copied a level deep: the caller's rows are the cached copy of what the
  // server said, and must not be edited in place.
  const people: Row[] = rows.map((p) => ({ ...p, notes: [...(p.notes ?? [])] }));
  const findPerson = (id: string) => people.find((p) => p.id === id);

  const patchNote = (noteId: string, patch: Row) => {
    for (const person of people) {
      const index = person.notes.findIndex((n: Row) => n.id === noteId);
      if (index >= 0) {
        person.notes[index] = { ...person.notes[index], ...patch };
        return;
      }
    }
  };

  for (const entry of entries) {
    const op = entry.op;

    switch (op.kind) {
      case 'insertNote': {
        const person = findPerson(op.personId);
        if (!person) break;
        person.notes.push(noteRow(entry, op.personId, op.noteKind, op.body, op.specialDayId));
        break;
      }

      case 'setNoteDone':
        patchNote(op.noteId, { done_at: op.done ? new Date(entry.queuedAt).toISOString() : null });
        break;

      case 'updateNote':
        patchNote(op.noteId, { body: op.body });
        break;

      case 'deleteNote':
        for (const person of people) {
          person.notes = person.notes.filter((n: Row) => n.id !== op.noteId);
        }
        break;

      case 'saveNotebook': {
        const person = findPerson(op.personId);
        if (!person) break;

        const existing = person.notes.find(
          (n: Row) => n.id === op.existingNoteId || n.kind === NOTEBOOK,
        );

        if (!op.body.trim()) {
          // An empty notebook is deleted rather than left as a blank row.
          if (existing) person.notes = person.notes.filter((n: Row) => n !== existing);
        } else if (existing) {
          person.notes = person.notes.map((n: Row) =>
            n === existing ? { ...n, body: op.body } : n,
          );
        } else {
          person.notes.push(noteRow(entry, op.personId, NOTEBOOK, op.body));
        }
        break;
      }
    }
  }

  return people;
}
