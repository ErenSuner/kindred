import { applyOutbox } from '@/utils/applyOutbox';
import { GIFT_IDEA, NOTEBOOK } from '@/utils/notes';
import type { OutboxEntry, OutboxOp } from '@/utils/outbox';

const QUEUED_AT = new Date(2026, 6, 15, 10, 0, 0).getTime();

let seq = 0;
const entry = (op: OutboxOp): OutboxEntry => ({
  id: `local_${seq++}`,
  op,
  queuedAt: QUEUED_AT,
  attempts: 0,
});

const rows = () => [
  {
    id: 'p1',
    name: 'Eleanor',
    notes: [
      { id: 'n1', kind: GIFT_IDEA, body: 'Camera lens', done_at: null, photo_url: null, special_day_id: null },
      { id: 'n2', kind: NOTEBOOK, body: 'Allergic to nuts', done_at: null, photo_url: null, special_day_id: null },
    ],
  },
  { id: 'p2', name: 'Sam', notes: [] },
];

const notesOf = (out: any[], personId: string) => out.find((p) => p.id === personId).notes;

describe('nothing queued', () => {
  it('hands the rows straight back', () => {
    const input = rows();
    expect(applyOutbox(input, [])).toBe(input);
  });
});

describe('it never edits the caller in place', () => {
  it('leaves the original rows alone', () => {
    const input = rows();
    applyOutbox(input, [entry({ kind: 'deleteNote', noteId: 'n1' })]);
    expect(input[0].notes).toHaveLength(2);
  });
});

describe('insertNote', () => {
  it('shows a queued note on the right person', () => {
    const out = applyOutbox(
      rows(),
      [entry({ kind: 'insertNote', personId: 'p2', noteKind: GIFT_IDEA, body: 'Wool socks' })],
    );

    expect(notesOf(out, 'p2')).toHaveLength(1);
    expect(notesOf(out, 'p2')[0].body).toBe('Wool socks');
    expect(notesOf(out, 'p1')).toHaveLength(2);
  });

  it('gives the note the queue entry id, so it is the same thing once sent', () => {
    const e = entry({ kind: 'insertNote', personId: 'p2', noteKind: GIFT_IDEA, body: 'Wool socks' });
    const out = applyOutbox(rows(), [e]);
    expect(notesOf(out, 'p2')[0].id).toBe(e.id);
  });

  it('ignores a person who is no longer there', () => {
    const out = applyOutbox(
      rows(),
      [entry({ kind: 'insertNote', personId: 'gone', noteKind: GIFT_IDEA, body: 'x' })],
    );
    expect(out.flatMap((p) => p.notes)).toHaveLength(2);
  });

  it('carries the occasion a note was attached to', () => {
    const out = applyOutbox(
      rows(),
      [entry({ kind: 'insertNote', personId: 'p2', noteKind: 'Note', body: 'Book a table', specialDayId: 'd9' })],
    );
    expect(notesOf(out, 'p2')[0].special_day_id).toBe('d9');
  });
});

describe('setNoteDone', () => {
  it('ticks a gift off', () => {
    const out = applyOutbox(rows(), [entry({ kind: 'setNoteDone', noteId: 'n1', done: true })]);
    expect(notesOf(out, 'p1')[0].done_at).toBeTruthy();
  });

  it('puts it back', () => {
    const out = applyOutbox(
      rows(),
      [
        entry({ kind: 'setNoteDone', noteId: 'n1', done: true }),
        entry({ kind: 'setNoteDone', noteId: 'n1', done: false }),
      ],
    );
    expect(notesOf(out, 'p1')[0].done_at).toBeNull();
  });

  it('does nothing for a note that isn’t there', () => {
    const out = applyOutbox(rows(), [entry({ kind: 'setNoteDone', noteId: 'nope', done: true })]);
    expect(notesOf(out, 'p1')[0].done_at).toBeNull();
  });
});

describe('updateNote', () => {
  it('replaces the text', () => {
    const out = applyOutbox(rows(), [entry({ kind: 'updateNote', noteId: 'n1', body: 'A tripod' })]);
    expect(notesOf(out, 'p1')[0].body).toBe('A tripod');
  });
});

describe('deleteNote', () => {
  it('takes it off the list', () => {
    const out = applyOutbox(rows(), [entry({ kind: 'deleteNote', noteId: 'n1' })]);
    expect(notesOf(out, 'p1').map((n: any) => n.id)).toEqual(['n2']);
  });

  it('can delete something that was only queued', () => {
    const added = entry({ kind: 'insertNote', personId: 'p2', noteKind: GIFT_IDEA, body: 'Wool socks' });
    const out = applyOutbox(rows(), [added, entry({ kind: 'deleteNote', noteId: added.id })]);
    expect(notesOf(out, 'p2')).toHaveLength(0);
  });
});

describe('saveNotebook', () => {
  it('edits the notebook that is already there', () => {
    const out = applyOutbox(
      rows(),
      [entry({ kind: 'saveNotebook', personId: 'p1', body: 'Allergic to nuts and shellfish', existingNoteId: 'n2' })],
    );
    const notebook = notesOf(out, 'p1').find((n: any) => n.kind === NOTEBOOK);
    expect(notebook.body).toBe('Allergic to nuts and shellfish');
    expect(notesOf(out, 'p1')).toHaveLength(2);
  });

  it('creates one for a person who has none', () => {
    const out = applyOutbox(rows(), [entry({ kind: 'saveNotebook', personId: 'p2', body: 'Vegetarian' })]);
    expect(notesOf(out, 'p2')[0]).toMatchObject({ kind: NOTEBOOK, body: 'Vegetarian' });
  });

  it('removes an emptied notebook rather than leaving a blank row', () => {
    const out = applyOutbox(
      rows(),
      [entry({ kind: 'saveNotebook', personId: 'p1', body: '   ', existingNoteId: 'n2' })],
    );
    expect(notesOf(out, 'p1').some((n: any) => n.kind === NOTEBOOK)).toBe(false);
  });

  it('finds the notebook by kind when the id was never known', () => {
    // A notebook written offline has no server id to reference yet.
    const out = applyOutbox(rows(), [entry({ kind: 'saveNotebook', personId: 'p1', body: 'Rewritten' })]);
    const notebooks = notesOf(out, 'p1').filter((n: any) => n.kind === NOTEBOOK);
    expect(notebooks).toHaveLength(1);
    expect(notebooks[0].body).toBe('Rewritten');
  });
});

describe('order', () => {
  it('applies operations in the order they were queued', () => {
    const out = applyOutbox(
      rows(),
      [
        entry({ kind: 'updateNote', noteId: 'n1', body: 'first' }),
        entry({ kind: 'updateNote', noteId: 'n1', body: 'second' }),
      ],
    );
    expect(notesOf(out, 'p1')[0].body).toBe('second');
  });
});
