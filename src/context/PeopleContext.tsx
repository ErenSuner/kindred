import type { Note, Person, Relationship } from '@/data/mock';
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { syncNotifications } from '@/utils/notifications';

type PeopleContextValue = {
  people: Person[];
  loading: boolean;
  addPerson: (data: {
    name: string;
    role: Relationship;
  }) => Promise<void>;
  updatePerson: (id: string, data: {
    name: string;
    role: Relationship;
  }) => Promise<void>;
  addSpecialDay: (personId: string, data: {
    title: string;
    date: string;
    nudges?: string[];
    isAnnual?: boolean;
  }) => Promise<void>;
  updateSpecialDay: (dayId: string, data: {
    title?: string;
    date?: string;
    nudges?: string[];
    isAnnual?: boolean;
  }) => Promise<void>;
  deleteSpecialDay: (dayId: string) => Promise<void>;
  addBirthday: (personId: string, data: { date: string; nudges?: string[] }) => Promise<void>;
  updateBirthday: (birthdayId: string, data: { date?: string; nudges?: string[] }) => Promise<void>;
  deleteBirthday: (birthdayId: string) => Promise<void>;
  addNoteToPerson: (personId: string, kind: string, body: string) => Promise<void>;
  updateNote: (noteId: string, data: { kind?: string; body?: string }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  togglePin: (id: string, isPinned: boolean) => Promise<void>;
  refreshPeople: () => Promise<void>;
  getPerson: (id: string) => Person | undefined;
};

const PeopleContext = createContext<PeopleContextValue | null>(null);

function getOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getNextOccurrence(dateStr: string, isAnnual: boolean = true): { date: Date; daysAway: number; formattedDate: string; turningAge?: number } {
  // dateStr is 'YYYY-MM-DD'
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const birthYear = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let targetYear = isAnnual ? now.getFullYear() : birthYear;
  let target = new Date(targetYear, month - 1, day);

  if (isAnnual && target.getTime() < now.getTime()) {
    targetYear += 1;
    target = new Date(targetYear, month - 1, day);
  }

  const diffTime = target.getTime() - now.getTime();
  const daysAway = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formattedDate = `${months[month - 1]} ${getOrdinal(day)}, ${targetYear}`;

  let turningAge: number | undefined = undefined;
  if (birthYear > 1000 && !isNaN(birthYear)) {
    turningAge = targetYear - birthYear;
  }

  return { date: target, daysAway, formattedDate, turningAge };
}

export function mapDbPersonToPerson(dbPerson: any): Person {
  const specialDays: any[] = (dbPerson.special_days || []).map((sd: any) => {
    const isAnnual = sd.is_annual ?? true;
    const { formattedDate, daysAway, turningAge } = getNextOccurrence(sd.date, isAnnual);
    return {
      id: sd.id,
      title: sd.title,
      date: formattedDate,
      icon: sd.icon || 'event',
      accent: sd.accent || 'primary',
      originalDate: sd.date,
      daysAway,
      turningAge,
      isAnnual,
      isExpired: !isAnnual && daysAway < 0,
    };
  });

  let birthday: any = undefined;
  if (dbPerson.birthdays) {
    const bd = Array.isArray(dbPerson.birthdays) ? dbPerson.birthdays[0] : dbPerson.birthdays;
    if (bd) {
    const { formattedDate, daysAway, turningAge } = getNextOccurrence(bd.date);
    birthday = {
      id: bd.id,
      date: bd.date,
      nudges: bd.nudges || [],
    };
    specialDays.push({
      id: bd.id,
      title: 'Birthday',
      date: formattedDate,
      icon: 'cake',
      accent: 'tertiary',
      originalDate: bd.date,
      daysAway,
      turningAge,
      isBirthday: true,
    });
    }
  }

  const notes: Note[] = (dbPerson.notes || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((n: any) => {
      const created = new Date(n.created_at);
      const diffMs = Date.now() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      let when = 'Just now';
      if (diffDays > 0) {
        when = diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
      } else if (diffHours > 0) {
        when = `${diffHours} hours ago`;
      } else if (diffMins > 0) {
        when = `${diffMins} mins ago`;
      }
      return {
        id: n.id,
        kind: n.kind,
        when,
        body: n.body,
      };
    });

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
    notes,
    isPinned: dbPerson.is_pinned || false,
  };
}

export function PeopleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshPeople = async () => {
    if (!user) {
      setPeople([]);
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
          special_days (id, title, date, icon, accent),
          birthdays (id, date, nudges),
          notes (id, kind, body, created_at)
        `);

      if (error) throw error;

      if (data) {
        const mapped = data.map(mapDbPersonToPerson);
        
        const expiredDayIds: string[] = [];
        mapped.forEach(p => {
          if (p.specialDays) {
            p.specialDays = p.specialDays.filter(sd => {
              if (sd.isExpired) {
                expiredDayIds.push(sd.id);
                return false;
              }
              return true;
            });
          }
        });

        // Sort people: pinned first, then closest event first
        mapped.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (a.daysAway ?? 9999) - (b.daysAway ?? 9999);
        });
        
        setPeople(mapped);
        
        if (expiredDayIds.length > 0) {
          supabase.from('special_days').delete().in('id', expiredDayIds).then(({ error: delError }) => {
            if (delError) console.warn('Failed to delete expired one-time events', delError);
          });
        }
      }
    } catch (err) {
      console.error('Error fetching people:', err);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshPeople().finally(() => setLoading(false));
    } else {
      setPeople([]);
    }
  }, [user]);

  useEffect(() => {
    // Re-calculate and schedule notifications whenever data changes
    syncNotifications(people);
  }, [people]);

  const addPerson = async (data: {
    name: string;
    role: Relationship;
  }) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: personData, error: personError } = await supabase
        .from('people')
        .insert({
          user_id: user.id,
          name: data.name,
          role: data.role,
        })
        .select()
        .single();

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
  }) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error: personError } = await supabase
        .from('people')
        .update({
          name: data.name,
          role: data.role,
        })
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
    isAnnual?: boolean;
  }) => {
    try {
      if (!user) throw new Error('Not logged in');
      const { error } = await supabase
        .from('special_days')
        .insert({
          person_id: personId,
          title: data.title,
          date: data.date,
          nudges: data.nudges || [],
          icon: data.title.toLowerCase().includes('birthday') ? 'cake' : 'event',
          accent: 'primary',
          is_annual: data.isAnnual ?? true,
        });
      if (error) throw error;
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
    isAnnual?: boolean;
  }) => {
    try {
      const updates: any = {};
      if (data.title) {
        updates.title = data.title;
        updates.icon = data.title.toLowerCase().includes('birthday') ? 'cake' : 'event';
      }
      if (data.date) updates.date = data.date;
      if (data.nudges) updates.nudges = data.nudges;
      if (data.isAnnual !== undefined) updates.is_annual = data.isAnnual;
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

  const addBirthday = async (personId: string, data: { date: string; nudges?: string[] }) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('birthdays')
        .insert({
          person_id: personId,
          date: data.date,
          nudges: data.nudges || [],
        });
      if (error) throw error;
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
        .from('birthdays')
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
        .from('birthdays')
        .delete()
        .eq('id', birthdayId);
      if (error) throw error;
      await refreshPeople();
    } catch (err) {
      console.error('Error deleting birthday:', err);
      throw err;
    }
  };

  const addNoteToPerson = async (personId: string, kind: string, body: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          person_id: personId,
          kind,
          body,
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

  const getPerson = (id: string) => {
    return people.find((p) => p.id === id);
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
        people,
        loading,
        addPerson,
        updatePerson,
        removePerson,
        togglePin,
        refreshPeople,
        getPerson,
        addNoteToPerson,
        updateNote,
        deleteNote,
        addSpecialDay,
        updateSpecialDay,
        deleteSpecialDay,
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
