import type { Note, Person, Relationship } from '@/data/mock';
import { cacheKey, readCache, writeCache } from '@/utils/cache';
import { describeLoadError } from '@/utils/loadError';
import { Recurrence } from '@/utils/recurrence';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { useUndo } from './UndoContext';
import { NO_UPCOMING_DAYS, deriveUpcoming } from '@/utils/upcoming';
import { mapDbPersonToPerson } from '@/utils/mapPerson';
import * as api from '@/lib/peopleApi';
import type { NoteDraft, NoteTarget } from '@/lib/peopleApi';
import {
  MAX_ATTEMPTS,
  OutboxEntry,
  OutboxOp,
  isOffline,
  localId,
  readOutbox,
  writeOutbox,
} from '@/utils/outbox';
import { applyOutbox } from '@/utils/applyOutbox';

export type { NoteDraft, NoteTarget };

type PeopleContextValue = {
  people: Person[];
  loading: boolean;
  // Set when the last load failed; `people` may still hold the previous result.
  loadError: string | null;
  // Returns the new person's id, so a caller can immediately attach a birthday
  // without waiting for the list to come back round through React state.
  addPerson: (data: { name: string; role: Relationship; avatarUrl?: string | null }) => Promise<string | undefined>;
  // Adds a whole selection at once and stages an undo. Reloads the list once
  // at the end rather than once per person.
  importPeople: (entries: api.ImportEntry[]) => Promise<number>;
  updatePerson: (id: string, data: { name: string; role: Relationship; avatarUrl?: string | null }) => Promise<void>;
  addSpecialDay: (personId: string, data: {
    title: string;
    date: string;
    nudges?: string[];
    recurrence?: Recurrence;
    notes?: NoteDraft[];
  }) => Promise<void>;
  updateSpecialDay: (dayId: string, data: {
    title?: string;
    date?: string;
    nudges?: string[];
    recurrence?: Recurrence;
  }) => Promise<void>;
  deleteSpecialDay: (dayId: string) => Promise<void>;
  // Hides the day immediately and offers an undo before it reaches the database.
  deleteSpecialDayWithUndo: (dayId: string, title: string) => void;
  addBirthday: (personId: string, data: { date: string; nudges?: string[]; notes?: NoteDraft[] }) => Promise<void>;
  updateBirthday: (birthdayId: string, data: { date?: string; nudges?: string[] }) => Promise<void>;
  deleteBirthday: (birthdayId: string) => Promise<void>;
  addNoteToPerson: (personId: string, kind: string, body: string, target?: NoteTarget, photoUrl?: string) => Promise<void>;
  // The person's notebook is a single row edited in place, so it is written
  // through here rather than through addNoteToPerson.
  saveNotebook: (personId: string, body: string, existingNoteId?: string) => Promise<void>;
  syncNotes: (
    personId: string,
    target: NoteTarget,
    existing: Note[],
    next: { id?: string; kind: string; body: string }[],
  ) => Promise<void>;
  updateNote: (noteId: string, data: { kind?: string; body?: string }) => Promise<void>;
  // Ticks a gift idea off, or puts it back on the list.
  setNoteDone: (noteId: string, done: boolean) => Promise<void>;
  // Records or edits what happened on one occurrence of a day.
  saveMemory: (personId: string, specialDayId: string, occurredOn: string, body: string, existingNoteId?: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  // Hides the note immediately and offers an undo before it reaches the database.
  deleteNoteWithUndo: (noteId: string) => void;
  removePerson: (id: string) => Promise<void>;
  // Hides the person immediately and offers an undo; the delete only reaches the
  // database once the window closes.
  removePersonWithUndo: (person: Person) => void;
  togglePin: (id: string, isPinned: boolean) => Promise<void>;
  refreshPeople: () => Promise<void>;
  getPerson: (id: string) => Person | undefined;
  // How many writes are waiting for a connection, and a way to try them now.
  pendingWrites: number;
  retryPendingWrites: () => Promise<void>;
};

const PeopleContext = createContext<PeopleContextValue | null>(null);

export function PeopleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  // A failed load used to leave an empty list behind with nothing to explain it,
  // which reads exactly like "all your data is gone". Screens show this instead.
  const [loadError, setLoadError] = useState<string | null>(null);
  // People staged for deletion. They're kept out of `people` so the UI reads as
  // deleted, but the rows are untouched until the undo window closes.
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [hiddenDayIds, setHiddenDayIds] = useState<string[]>([]);
  const [hiddenNoteIds, setHiddenNoteIds] = useState<string[]>([]);
  const { stage } = useUndo();
  // Lets the cache hydration check what is already loaded without re-running on
  // every state change.
  const peopleRef = useRef<Person[]>([]);

  // Writes that haven't reached the server. Kept in a ref as well as state
  // because applyRows needs the current queue without being re-created every
  // time it changes.
  const [pending, setPending] = useState<OutboxEntry[]>([]);
  const pendingRef = useRef<OutboxEntry[]>([]);
  // The last rows the server actually gave us. A queued write is applied on top
  // of these, never on top of an already-patched copy.
  const serverRowsRef = useRef<any[]>([]);
  const flushingRef = useRef(false);

  const setPendingBoth = (entries: OutboxEntry[]) => {
    pendingRef.current = entries;
    setPending(entries);
  };

  // Rows in, sorted people out. Shared by the network and the offline cache so
  // both paths produce identical state — and so countdowns are always computed
  // from today, never from whenever the cache was written.
  const applyRows = (rows: any[]) => {
    serverRowsRef.current = rows;
    // Anything still queued is folded in here, so a write made offline is on
    // screen immediately and stays there across restarts.
    const mapped = applyOutbox(rows, pendingRef.current).map(mapDbPersonToPerson);

    // A one-off date that has passed used to be deleted here, taking its notes
    // with it. It's kept now and simply moved out of the upcoming list, so
    // "Looking back" has something to show.
    mapped.forEach((p) => {
      if (p.specialDays) {
        p.pastDays = p.specialDays.filter((sd) => sd.isExpired);
        p.specialDays = p.specialDays.filter((sd) => !sd.isExpired);
      }
    });

    // Pinned first, then closest event first.
    mapped.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.daysAway ?? NO_UPCOMING_DAYS) - (b.daysAway ?? NO_UPCOMING_DAYS);
    });

    setPeople(mapped);
    peopleRef.current = mapped;
  };

  const refreshPeople = async () => {
    if (!user) {
      setPeople([]);
      setLoadError(null);
      return;
    }
    try {
      const rows = await api.fetchPeopleRows();
      applyRows(rows);
      setLoadError(null);
      writeCache(cacheKey('people', user.id), rows);
    } catch (err) {
      console.error('Error fetching people:', err);
      // Whatever is already on screen stays — a cached or stale list beats a
      // blank one when the connection drops.
      setLoadError(describeLoadError(err, "Couldn't reach the server. Showing your saved copy."));
    }
  };

  // Paints the last known data before the network is even tried, so a cold start
  // without a connection shows the app rather than an empty screen.
  const hydrateFromCache = async (userId: string) => {
    const cached = await readCache<any[]>(cacheKey('people', userId));
    if (!cached?.rows?.length) return;
    // Only fills an empty screen — a refresh that already landed wins.
    if (peopleRef.current.length === 0) applyRows(cached.rows);
  };

  // Sends what's queued, oldest first, stopping at the first thing that fails
  // for a connection reason — order matters, and pushing past a stuck entry
  // could apply a later edit to a note that doesn't exist yet.
  const flushOutbox = async (): Promise<void> => {
    if (!user || flushingRef.current) return;
    if (pendingRef.current.length === 0) return;

    flushingRef.current = true;
    let queue = [...pendingRef.current];
    let sentAny = false;

    try {
      while (queue.length > 0) {
        const entry = queue[0];
        try {
          await runOp(entry.op);
          queue = queue.slice(1);
          sentAny = true;
        } catch (err) {
          if (isOffline(err)) break; // Still no connection. Try again later.

          // The server refused it. Retrying forever would block everything
          // behind it, so it gets a few goes and is then dropped.
          console.error('Queued change was rejected', entry.op, err);
          const attempts = entry.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            queue = queue.slice(1);
          } else {
            queue = [{ ...entry, attempts }, ...queue.slice(1)];
            break;
          }
        }
      }
    } finally {
      flushingRef.current = false;
      setPendingBoth(queue);
      await writeOutbox(user.id, queue);
      // Only worth a round trip if something actually landed.
      if (sentAny) await refreshPeople();
    }
  };

  useEffect(() => {
    if (!user) {
      setPeople([]);
      setPendingBoth([]);
      setLoadError(null);
      return;
    }

    setLoading(true);
    // The queue has to be loaded before the first render of the list, or a
    // write made last session would flicker in after the fact.
    readOutbox(user.id)
      .then((queued) => setPendingBoth(queued))
      .then(() => hydrateFromCache(user.id))
      .then(() => refreshPeople())
      .then(() => flushOutbox())
      .finally(() => setLoading(false));
  }, [user]);

  // A queued write is worth another go whenever the app comes back to the
  // foreground — that is usually when the connection has returned.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushOutbox();
    });
    return () => sub.remove();
  });

  // Turns a queued operation back into the call it stands for.
  const runOp = (op: OutboxOp): Promise<void> => {
    switch (op.kind) {
      case 'insertNote':
        return api.insertNote(
          op.personId,
          op.noteKind,
          op.body,
          op.specialDayId ? { specialDayId: op.specialDayId } : undefined,
        );
      case 'setNoteDone':
        return api.setNoteDone(op.noteId, op.done);
      case 'updateNote':
        return api.updateNoteRow(op.noteId, { body: op.body });
      case 'deleteNote':
        return api.deleteNoteRow(op.noteId);
      case 'saveNotebook':
        return api.saveNotebookRow(op.personId, op.body, op.existingNoteId);
    }
  };

  // Tries the write. If the only thing wrong is the connection, the operation
  // is written down and shown as done — anything else is a real failure and is
  // raised, because retrying it later would fail the same way.
  const queueable = async (op: OutboxOp) => {
    if (!user) return;

    try {
      await runOp(op);
      await refreshPeople();
      return;
    } catch (err) {
      if (!isOffline(err)) {
        console.error('Write failed', op, err);
        throw err;
      }
    }

    const next = [...pendingRef.current, { id: localId(), op, queuedAt: Date.now(), attempts: 0 }];
    setPendingBoth(next);
    await writeOutbox(user.id, next);
    // Re-render from the rows we already have, now with the queued write on top.
    applyRows(serverRowsRef.current);
  };

  // Every mutation below is the same shape: do the write, then reload. This
  // wraps that up so the individual methods say what they do and nothing else.
  const mutate = async (what: string, run: () => Promise<void>, showsSpinner = false) => {
    if (!user) return;
    if (showsSpinner) setLoading(true);
    try {
      await run();
      await refreshPeople();
    } catch (err) {
      console.error(`Error ${what}:`, err);
      throw err;
    } finally {
      if (showsSpinner) setLoading(false);
    }
  };

  const addPerson = async (data: { name: string; role: Relationship; avatarUrl?: string | null }) => {
    if (!user) return undefined;
    setLoading(true);
    try {
      const id = await api.insertPerson(user.id, data);
      await refreshPeople();
      return id;
    } catch (err) {
      console.error('Error adding person:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Unlike the staged deletions below, the write here has already happened by
  // the time the snackbar appears — an import is not destructive, so there is
  // nothing to hold back. Undo therefore deletes rather than cancels.
  const importPeople = async (entries: api.ImportEntry[]) => {
    if (!user || entries.length === 0) return 0;
    setLoading(true);
    try {
      const ids = await api.insertPeopleBatch(user.id, entries);
      await refreshPeople();

      stage({
        message: `${ids.length} ${ids.length === 1 ? 'person' : 'people'} added`,
        // Nothing left to do once the window closes: the rows are already in.
        commit: () => {},
        undo: async () => {
          try {
            await api.deletePeopleRows(ids);
            await refreshPeople();
          } catch (err) {
            console.error('Error undoing import:', err);
          }
        },
      });

      return ids.length;
    } catch (err) {
      console.error('Error importing people:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePerson = (id: string, data: { name: string; role: Relationship; avatarUrl?: string | null }) =>
    mutate('updating person', () => api.updatePersonRow(id, data), true);

  const removePerson = (id: string) =>
    mutate('removing person', () => api.deletePersonRow(id), true);

  const addSpecialDay = (personId: string, data: {
    title: string;
    date: string;
    nudges?: string[];
    recurrence?: Recurrence;
    notes?: NoteDraft[];
  }) => mutate('adding special day', () => api.insertSpecialDay(personId, data));

  const updateSpecialDay = (dayId: string, data: {
    title?: string;
    date?: string;
    nudges?: string[];
    recurrence?: Recurrence;
  }) => mutate('updating special day', () => api.updateSpecialDayRow(dayId, data));

  const deleteSpecialDay = (dayId: string) =>
    mutate('deleting special day', () => api.deleteSpecialDayRow(dayId));

  const addBirthday = (personId: string, data: { date: string; nudges?: string[]; notes?: NoteDraft[] }) =>
    mutate('adding birthday', () => api.insertBirthday(personId, data));

  const updateBirthday = (birthdayId: string, data: { date?: string; nudges?: string[] }) =>
    mutate('updating birthday', () => api.updateBirthdayRow(birthdayId, data));

  const deleteBirthday = (birthdayId: string) =>
    mutate('deleting birthday', () => api.deleteSpecialDayRow(birthdayId));

  const addNoteToPerson = (personId: string, kind: string, body: string, target?: NoteTarget, photoUrl?: string) => {
    // A photo has already been uploaded to storage by the time this is called,
    // so it can't be queued — there would be nothing to point at offline.
    if (photoUrl) {
      return mutate('adding note', () => api.insertNote(personId, kind, body, target, photoUrl));
    }
    return queueable({
      kind: 'insertNote',
      personId,
      noteKind: kind,
      body,
      specialDayId: target?.specialDayId,
    });
  };

  const updateNote = (noteId: string, data: { kind?: string; body?: string }) => {
    if (data.body === undefined || data.kind !== undefined) {
      return mutate('updating note', () => api.updateNoteRow(noteId, data));
    }
    return queueable({ kind: 'updateNote', noteId, body: data.body });
  };

  // Optimistic, like togglePin: ticking a gift off should move it under your
  // thumb rather than after a round trip. Waiting for the server made the row
  // sit still and then jump, which reads as the app hanging.
  const setNoteDone = async (noteId: string, done: boolean) => {
    if (!user) return;

    const doneAt = done ? new Date().toISOString() : undefined;
    setPeople((prev) =>
      prev.map((p) => ({
        ...p,
        notes: p.notes?.map((n) => (n.id === noteId ? { ...n, doneAt } : n)),
      })),
    );

    try {
      await queueable({ kind: 'setNoteDone', noteId, done });
    } catch (err) {
      console.error('Error marking note done:', err);
      await refreshPeople(); // Put it back where it was
      throw err;
    }
  };

  const deleteNote = (noteId: string) => queueable({ kind: 'deleteNote', noteId });

  const saveNotebook = (personId: string, body: string, existingNoteId?: string) =>
    queueable({ kind: 'saveNotebook', personId, body, existingNoteId });

  const saveMemory = (personId: string, specialDayId: string, occurredOn: string, body: string, existingNoteId?: string) =>
    mutate('saving memory', () => api.saveMemoryRow(personId, specialDayId, occurredOn, body, existingNoteId));

  const syncNotes = (
    personId: string,
    target: NoteTarget,
    existing: Note[],
    next: { id?: string; kind: string; body: string }[],
  ) => mutate('syncing notes', () => api.syncNoteRows(personId, target, existing, next));

  // Deleting a person takes their days and notes with it, so it gets a grace
  // period. The row stays in the database until the window closes — nothing is
  // lost if the app is killed in between.
  const removePersonWithUndo = (person: Person) => {
    setHiddenIds((prev) => [...prev, person.id]);

    stage({
      message: `${person.name} deleted`,
      commit: async () => {
        try {
          await removePerson(person.id);
        } finally {
          setHiddenIds((prev) => prev.filter((id) => id !== person.id));
        }
      },
      undo: () => setHiddenIds((prev) => prev.filter((id) => id !== person.id)),
    });
  };

  const deleteNoteWithUndo = (noteId: string) => {
    setHiddenNoteIds((prev) => [...prev, noteId]);

    stage({
      message: 'Note deleted',
      commit: async () => {
        try {
          await deleteNote(noteId);
        } finally {
          setHiddenNoteIds((prev) => prev.filter((id) => id !== noteId));
        }
      },
      undo: () => setHiddenNoteIds((prev) => prev.filter((id) => id !== noteId)),
    });
  };

  // Same grace period for a single day. The screen that triggers this usually
  // navigates away, which is why the staging lives here rather than in it.
  const deleteSpecialDayWithUndo = (dayId: string, title: string) => {
    setHiddenDayIds((prev) => [...prev, dayId]);

    stage({
      message: `${title} deleted`,
      commit: async () => {
        try {
          await deleteSpecialDay(dayId);
        } finally {
          setHiddenDayIds((prev) => prev.filter((id) => id !== dayId));
        }
      },
      undo: () => setHiddenDayIds((prev) => prev.filter((id) => id !== dayId)),
    });
  };

  // Everything downstream — lists, search, notification scheduling — should
  // behave as if a staged deletion already happened.
  const visiblePeople = people
    .filter((p) => !hiddenIds.includes(p.id))
    .map((p) => {
      if (hiddenDayIds.length === 0 && hiddenNoteIds.length === 0) return p;

      const specialDays = p.specialDays
        ?.filter((d) => !hiddenDayIds.includes(d.id))
        .map((d) =>
          hiddenNoteIds.length === 0
            ? d
            : {
              ...d,
              notes: d.notes?.filter((n) => !hiddenNoteIds.includes(n.id)),
              memories: d.memories?.filter((n) => !hiddenNoteIds.includes(n.id)),
            },
        );

      // `birthday` is a view onto the birthday row, so clearing it has to take
      // the accessor with it — otherwise the card keeps rendering from a day
      // that is no longer in the list.
      const birthdayDay = specialDays?.find((d) => d.isBirthday);
      const birthday = birthdayDay
        ? { id: birthdayDay.id, date: birthdayDay.originalDate ?? '', nudges: birthdayDay.nudges ?? [] }
        : undefined;

      return {
        ...p,
        notes: p.notes?.filter((n) => !hiddenNoteIds.includes(n.id)),
        specialDays,
        birthday,
        // Deleting the day someone was counting down to has to move the
        // countdown on immediately, not at the next refresh.
        ...deriveUpcoming(p.name, p.eventTag, specialDays ?? []),
      };
    });

  const getPerson = (id: string) => visiblePeople.find((p) => p.id === id);

  const togglePin = async (id: string, isPinned: boolean) => {
    if (!user) return;
    try {
      // Optimistic: pinning should reorder the list under your thumb, not after
      // a round trip.
      setPeople((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, isPinned } : p));
        next.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (a.daysAway ?? NO_UPCOMING_DAYS) - (b.daysAway ?? NO_UPCOMING_DAYS);
        });
        return next;
      });

      await api.setPinned(id, isPinned);
    } catch (err) {
      console.error('Error toggling pin:', err);
      await refreshPeople(); // Revert on failure
      throw err;
    }
  };

  return (
    <PeopleContext.Provider
      value={{
        people: visiblePeople,
        loading,
        loadError,
        addPerson,
        importPeople,
        updatePerson,
        removePerson,
        removePersonWithUndo,
        togglePin,
        refreshPeople,
        getPerson,
        addNoteToPerson,
        saveNotebook,
        syncNotes,
        updateNote,
        setNoteDone,
        saveMemory,
        deleteNote,
        deleteNoteWithUndo,
        addSpecialDay,
        updateSpecialDay,
        deleteSpecialDay,
        deleteSpecialDayWithUndo,
        addBirthday,
        updateBirthday,
        deleteBirthday,
        pendingWrites: pending.length,
        retryPendingWrites: flushOutbox,
      }}
    >
      {children}
    </PeopleContext.Provider>
  );
}

export function usePeople() {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used within PeopleProvider');
  return ctx;
}
