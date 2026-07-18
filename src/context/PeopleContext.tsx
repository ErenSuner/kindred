import type { Note, Person, Relationship } from '@/data/mock';
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getNextOccurrence } from '@/utils/dates';
import { Recurrence, YEARLY, parseRecurrence, serializeRecurrence } from '@/utils/recurrence';
import { distributeNotes, mapDbNote } from '@/utils/notes';
import { describeLoadError } from '@/utils/loadError';
import { useUndo } from './UndoContext';
import { cacheKey, readCache, writeCache } from '@/utils/cache';

type PeopleContextValue = {
  people: Person[];
  loading: boolean;
  // Set when the last load failed; `people` may still hold the previous result.
  loadError: string | null;
  addPerson: (data: {
    name: string;
    role: Relationship;
    avatarUrl?: string | null;
  }) => Promise<void>;
  updatePerson: (id: string, data: {
    name: string;
    role: Relationship;
    avatarUrl?: string | null;
  }) => Promise<void>;
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
  addNoteToPerson: (personId: string, kind: string, body: string, target?: NoteTarget) => Promise<void>;
  syncNotes: (
    personId: string,
    target: NoteTarget,
    existing: Note[],
    next: { id?: string; kind: string; body: string }[],
  ) => Promise<void>;
  updateNote: (noteId: string, data: { kind?: string; body?: string }) => Promise<void>;
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

// Which occasion a note hangs off, if any. Omitting it writes a general note
// about the person. Birthdays are special days now, so they use the same target.
export type NoteTarget = { specialDayId: string };

// A note supplied alongside the occasion it belongs to, before that occasion
// has an id of its own.
export type NoteDraft = { kind: string; body: string };


export function mapDbPersonToPerson(dbPerson: any): Person {
  // Birthdays live in special_days alongside everything else, flagged by
  // is_birthday. A birthday is yearly by definition, so its stored recurrence is
  // ignored in favour of YEARLY — nothing in the UI lets you change it.
  const specialDays: any[] = (dbPerson.special_days || []).map((sd: any) => {
    const isBirthday = sd.is_birthday === true;
    const recurrence = isBirthday ? YEARLY : parseRecurrence(sd);
    const { formattedDate, daysAway, turningAge } = getNextOccurrence(sd.date, recurrence);
    return {
      id: sd.id,
      title: isBirthday ? 'Birthday' : sd.title,
      date: formattedDate,
      icon: isBirthday ? 'cake' : sd.icon || 'event',
      accent: isBirthday ? 'tertiary' : sd.accent || 'primary',
      originalDate: sd.date,
      daysAway,
      turningAge,
      nudges: sd.nudges || [],
      recurrence,
      isBirthday,
      // A birthday never expires; only a one-off date can.
      isExpired: !isBirthday && recurrence.unit === 'none' && daysAway < 0,
    };
  });

  // Screens still reach for `person.birthday`, so keep it as a view onto the
  // birthday row rather than a separate record.
  const birthdayDay = specialDays.find((d) => d.isBirthday);
  const birthday = birthdayDay
    ? { id: birthdayDay.id, date: birthdayDay.originalDate, nudges: birthdayDay.nudges }
    : undefined;

  const notes: Note[] = (dbPerson.notes || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((n: any) => mapDbNote(n));

  // Hand each note to the occasion it belongs to; the rest are general notes
  // about the person.
  const { byDay, general: generalNotes } = distributeNotes(notes, specialDays);
  for (const day of specialDays) {
    day.notes = byDay.get(day.id) ?? [];
  }

  // Calculate upcoming event properties
  let eventTitle = 'No upcoming events';
  let eventTag = dbPerson.role as Relationship;
  let daysAway = 9999;
  let eventDate = 'No date set';
  let countdown: Person['countdown'] = undefined;

  if (specialDays.length > 0) {
    const sortedDays = [...specialDays].sort((a: any, b: any) => {
      const aDays = a.daysAway ?? 9999;
      const bDays = b.daysAway ?? 9999;
      return aDays - bDays;
    });
    const upcoming = sortedDays[0];
    const upcomingDays = upcoming.daysAway ?? 0;

    const ageStr = upcoming.turningAge ? ` (Turning ${upcoming.turningAge})` : '';

    eventTitle = `${dbPerson.name}'s ${upcoming.title}${ageStr}`;
    eventTag = dbPerson.role as Relationship;
    daysAway = upcomingDays;
    eventDate = upcoming.date;
    countdown = {
      tag: upcoming.title,
      days: upcomingDays,
      title: `${dbPerson.name}'s ${upcoming.title}${ageStr}`,
      date: upcoming.date,
      progress: Math.max(0, Math.min(1, 1 - upcomingDays / 365)),
    };
  } else {
    // Return empty sortedDays or just empty specialDays
  }

  const returnedSpecialDays = specialDays.length > 0 ? [...specialDays].sort((a: any, b: any) => {
    return (a.daysAway ?? 9999) - (b.daysAway ?? 9999);
  }) : specialDays;

  return {
    id: dbPerson.id,
    name: dbPerson.name,
    role: dbPerson.role,
    avatar: dbPerson.avatar_url || undefined,
    initials: dbPerson.name.charAt(0).toUpperCase(),
    tags: [dbPerson.role],
    eventTitle,
    eventTag,
    daysAway,
    eventDate,
    countdown,
    specialDays: returnedSpecialDays,
    birthday,
    notes: generalNotes,
    isPinned: dbPerson.is_pinned || false,
  };
}

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
  const applyRows = (rows: any[]): string[] => {
    const mapped = rows.map(mapDbPersonToPerson);

    const expiredDayIds: string[] = [];
    mapped.forEach((p) => {
      if (p.specialDays) {
        p.specialDays = p.specialDays.filter((sd) => {
          if (sd.isExpired) {
            expiredDayIds.push(sd.id);
            return false;
          }
          return true;
        });
      }
    });

    // Pinned first, then closest event first.
    mapped.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.daysAway ?? 9999) - (b.daysAway ?? 9999);
    });

    setPeople(mapped);
    peopleRef.current = mapped;
    return expiredDayIds;
  };

  const refreshPeople = async () => {
    if (!user) {
      setPeople([]);
      setLoadError(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('people')
        .select(`
          id,
          name,
          role,
          avatar_url,
          is_pinned,
          special_days (id, title, date, icon, accent, nudges, repeat_unit, repeat_interval, is_birthday),
          notes (id, kind, body, created_at, special_day_id)
        `);

      if (error) throw error;

      if (data) {
        const expiredDayIds = applyRows(data);
        setLoadError(null);
        writeCache(cacheKey('people', user.id), data);

        if (expiredDayIds.length > 0) {
          supabase.from('special_days').delete().in('id', expiredDayIds).then(({ error: delError }) => {
            if (delError) console.warn('Failed to delete expired one-time events', delError);
          });
        }
      }
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

  const addPerson = async (data: {
    name: string;
    role: Relationship;
    avatarUrl?: string | null;
  }) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error: personError } = await supabase
        .from('people')
        .insert({
          user_id: user.id,
          name: data.name,
          role: data.role,
          avatar_url: data.avatarUrl ?? null,
        });

      if (personError) throw personError;

      await refreshPeople();
    } catch (err) {
      console.error('Error adding person:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePerson = async (id: string, data: {
    name: string;
    role: Relationship;
    avatarUrl?: string | null;
  }) => {
    if (!user) return;
    setLoading(true);
    try {
      const updates: Record<string, unknown> = {
        name: data.name,
        role: data.role,
      };
      // Left untouched unless the caller actually supplied one, so saving the
      // name doesn't wipe an existing picture.
      if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

      const { error: personError } = await supabase
        .from('people')
        .update(updates)
        .eq('id', id);

      if (personError) throw personError;

      await refreshPeople();
    } catch (err) {
      console.error('Error updating person:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addSpecialDay = async (personId: string, data: {
    title: string;
    date: string;
    nudges?: string[];
    recurrence?: Recurrence;
    notes?: NoteDraft[];
  }) => {
    try {
      if (!user) throw new Error('Not logged in');
      const { data: inserted, error } = await supabase
        .from('special_days')
        .insert({
          person_id: personId,
          title: data.title,
          date: data.date,
          nudges: data.nudges || [],
          icon: data.title.toLowerCase().includes('birthday') ? 'cake' : 'event',
          accent: 'primary',
          ...serializeRecurrence(data.recurrence ?? YEARLY),
        })
        .select('id')
        .single();
      if (error) throw error;

      // Notes are written against the row that was just created, so they can
      // only go in once its id exists.
      if (data.notes?.length && inserted) {
        const { error: notesError } = await supabase.from('notes').insert(
          data.notes.map((n) => ({
            person_id: personId,
            special_day_id: inserted.id,
            kind: n.kind,
            body: n.body,
          })),
        );
        // The day itself saved fine; losing the notes shouldn't read as a
        // failed save, so this is reported rather than thrown.
        if (notesError) console.error('Special day saved, but its notes failed:', notesError);
      }

      await refreshPeople();
    } catch (err) {
      console.error('Error adding special day:', err);
      throw err;
    }
  };

  const updateSpecialDay = async (dayId: string, data: {
    title?: string;
    date?: string;
    nudges?: string[];
    recurrence?: Recurrence;
  }) => {
    try {
      const updates: any = {};
      if (data.title) {
        updates.title = data.title;
        updates.icon = data.title.toLowerCase().includes('birthday') ? 'cake' : 'event';
      }
      if (data.date) updates.date = data.date;
      if (data.nudges) updates.nudges = data.nudges;
      if (data.recurrence !== undefined) Object.assign(updates, serializeRecurrence(data.recurrence));
      const { error } = await supabase
        .from('special_days')
        .update(updates)
        .eq('id', dayId);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error updating special day:', err);
      throw err;
    }
  };

  const deleteSpecialDay = async (dayId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('special_days')
        .delete()
        .eq('id', dayId);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error deleting special day:', err);
      throw err;
    }
  };

  // A birthday is a special day with its title, icon and cycle fixed. The
  // one-per-person rule is enforced by a partial unique index on the table.
  const addBirthday = async (personId: string, data: { date: string; nudges?: string[]; notes?: NoteDraft[] }) => {
    if (!user) return;
    try {
      const { data: inserted, error } = await supabase
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
        .single();
      if (error) throw error;

      if (data.notes?.length && inserted) {
        const { error: notesError } = await supabase.from('notes').insert(
          data.notes.map((n) => ({
            person_id: personId,
            special_day_id: inserted.id,
            kind: n.kind,
            body: n.body,
          })),
        );
        if (notesError) console.error('Birthday saved, but its notes failed:', notesError);
      }

      await refreshPeople();
    } catch (err) {
      console.error('Error adding birthday:', err);
      throw err;
    }
  };

  const updateBirthday = async (birthdayId: string, data: { date?: string; nudges?: string[] }) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('special_days')
        .update(data)
        .eq('id', birthdayId);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error updating birthday:', err);
      throw err;
    }
  };

  const deleteBirthday = async (birthdayId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('special_days')
        .delete()
        .eq('id', birthdayId);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error deleting birthday:', err);
      throw err;
    }
  };

  const addNoteToPerson = async (personId: string, kind: string, body: string, target?: NoteTarget) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          person_id: personId,
          kind,
          body,
          special_day_id: target?.specialDayId ?? null,
        });
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error adding note:', err);
      throw err;
    }
  };

  const updateNote = async (noteId: string, data: { kind?: string; body?: string }) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notes')
        .update(data)
        .eq('id', noteId);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error updating note:', err);
      throw err;
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error deleting note:', err);
      throw err;
    }
  };

  // Reconciles the notes attached to one occasion against what the editor is
  // holding: anything gone from `next` is deleted, anything with an id is
  // updated if its text changed, and the rest are created.
  const syncNotes = async (
    personId: string,
    target: NoteTarget,
    existing: Note[],
    next: { id?: string; kind: string; body: string }[],
  ) => {
    if (!user) return;

    const keptIds = new Set(next.map((n) => n.id).filter(Boolean) as string[]);
    const removedIds = existing.filter((n) => !keptIds.has(n.id)).map((n) => n.id);

    const toInsert = next.filter((n) => !n.id);
    const toUpdate = next.filter((n) => {
      if (!n.id) return false;
      const before = existing.find((e) => e.id === n.id);
      return before && (before.body !== n.body || before.kind !== n.kind);
    });

    try {
      if (removedIds.length > 0) {
        const { error } = await supabase.from('notes').delete().in('id', removedIds);
        if (error) throw error;
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('notes').insert(
          toInsert.map((n) => ({
            person_id: personId,
            special_day_id: target.specialDayId,
            kind: n.kind,
            body: n.body,
          })),
        );
        if (error) throw error;
      }

      for (const n of toUpdate) {
        const { error } = await supabase
          .from('notes')
          .update({ kind: n.kind, body: n.body })
          .eq('id', n.id as string);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error syncing notes:', err);
      throw err;
    }
  };

  const removePerson = async (id: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error removing person:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
      return {
        ...p,
        notes: p.notes?.filter((n) => !hiddenNoteIds.includes(n.id)),
        specialDays: p.specialDays
          ?.filter((d) => !hiddenDayIds.includes(d.id))
          .map((d) =>
            hiddenNoteIds.length === 0
              ? d
              : { ...d, notes: d.notes?.filter((n) => !hiddenNoteIds.includes(n.id)) },
          ),
      };
    });

  const getPerson = (id: string) => {
    return visiblePeople.find((p) => p.id === id);
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    if (!user) return;
    try {
      // Optimistic UI update
      setPeople((prev) => {
        const next = prev.map(p => p.id === id ? { ...p, isPinned } : p);
        next.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (a.daysAway ?? 9999) - (b.daysAway ?? 9999);
        });
        return next;
      });

      const { error } = await supabase
        .from('people')
        .update({ is_pinned: isPinned })
        .eq('id', id);

      if (error) throw error;
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
        syncNotes,
        updateNote,
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
