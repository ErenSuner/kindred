import type { Note, Person, Relationship } from '@/data/mock';
import { cacheKey, readCache, writeCache } from '@/utils/cache';
import { describeLoadError } from '@/utils/loadError';
import { Recurrence } from '@/utils/recurrence';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useUndo } from './UndoContext';
import { NO_UPCOMING_DAYS, deriveUpcoming } from '@/utils/upcoming';
import { mapDbPersonToPerson } from '@/utils/mapPerson';
import * as api from '@/lib/peopleApi';
import type { NoteDraft, NoteTarget } from '@/lib/peopleApi';

export type { NoteDraft, NoteTarget };

type PeopleContextValue = {
  people: Person[];
  loading: boolean;
  // Set when the last load failed; `people` may still hold the previous result.
  loadError: string | null;
  // Returns the new person's id, so a caller can immediately attach a birthday
  // without waiting for the list to come back round through React state.
  addPerson: (data: { name: string; role: Relationship; avatarUrl?: string | null }) => Promise<string | undefined>;
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

  // Rows in, sorted people out. Shared by the network and the offline cache so
  // both paths produce identical state — and so countdowns are always computed
  // from today, never from whenever the cache was written.
  const applyRows = (rows: any[]) => {
    const mapped = rows.map(mapDbPersonToPerson);

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

  useEffect(() => {
    if (user) {
      setLoading(true);
      hydrateFromCache(user.id).finally(() => {
        refreshPeople().finally(() => setLoading(false));
      });
    } else {
      setPeople([]);
      setLoadError(null);
    }
  }, [user]);

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

  const addNoteToPerson = (personId: string, kind: string, body: string, target?: NoteTarget, photoUrl?: string) =>
    mutate('adding note', () => api.insertNote(personId, kind, body, target, photoUrl));

  const updateNote = (noteId: string, data: { kind?: string; body?: string }) =>
    mutate('updating note', () => api.updateNoteRow(noteId, data));

  const setNoteDone = (noteId: string, done: boolean) =>
    mutate('marking note done', () => api.setNoteDone(noteId, done));

  const deleteNote = (noteId: string) =>
    mutate('deleting note', () => api.deleteNoteRow(noteId));

  const saveNotebook = (personId: string, body: string, existingNoteId?: string) =>
    mutate('saving notebook', () => api.saveNotebookRow(personId, body, existingNoteId));

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
