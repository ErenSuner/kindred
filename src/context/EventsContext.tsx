import type { MyEvent } from '@/data/mock';
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getNextOccurrence } from '@/utils/dates';
import { Recurrence, YEARLY, parseRecurrence, serializeRecurrence } from '@/utils/recurrence';
import { describeLoadError } from '@/utils/loadError';
import { useUndo } from './UndoContext';
import { cacheKey, readCache, writeCache } from '@/utils/cache';

type EventInput = {
  title: string;
  date: string; // YYYY-MM-DD
  nudges?: string[];
  recurrence?: Recurrence;
  icon?: string;
};

type EventsContextValue = {
  events: MyEvent[];
  loading: boolean;
  // Set when the last load failed; `events` may still hold the previous result.
  loadError: string | null;
  addEvent: (data: EventInput) => Promise<void>;
  updateEvent: (id: string, data: Partial<EventInput>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  // Hides the event immediately and offers an undo before it reaches the database.
  deleteEventWithUndo: (event: MyEvent) => void;
  refreshEvents: () => Promise<void>;
  getEvent: (id: string) => MyEvent | undefined;
};

const EventsContext = createContext<EventsContextValue | null>(null);

function iconForTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('birthday')) return 'cake';
  if (t.includes('anniversary')) return 'favorite';
  if (t.includes('flight') || t.includes('trip') || t.includes('travel')) return 'flight';
  if (t.includes('exam') || t.includes('school') || t.includes('class')) return 'school';
  if (t.includes('doctor') || t.includes('appointment') || t.includes('health')) return 'medical-services';
  if (t.includes('pay') || t.includes('rent') || t.includes('bill') || t.includes('tax')) return 'payments';
  if (t.includes('work') || t.includes('meeting') || t.includes('deadline')) return 'work';
  return 'event';
}

function mapDbEvent(row: any): MyEvent {
  const recurrence = parseRecurrence(row);
  const { formattedDate, daysAway, turningAge } = getNextOccurrence(row.date, recurrence);
  return {
    id: row.id,
    title: row.title,
    date: formattedDate,
    originalDate: row.date,
    icon: row.icon || 'event',
    accent: (row.accent || 'primary') as MyEvent['accent'],
    daysAway,
    turningAge,
    nudges: row.nudges || [],
    recurrence,
    isExpired: recurrence.unit === 'none' && daysAway < 0,
  };
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const { stage } = useUndo();
  const eventsRef = useRef<MyEvent[]>([]);

  // Rows in, sorted events out — used by both the network and the cache so
  // countdowns are always recomputed from today.
  const applyRows = (rows: any[]): string[] => {
    const mapped = rows.map(mapDbEvent);

    // One-time events that have passed are dropped, matching how special days
    // are cleaned up in PeopleContext.
    const expiredIds = mapped.filter((e) => e.isExpired).map((e) => e.id);
    const live = mapped.filter((e) => !e.isExpired);
    live.sort((a, b) => a.daysAway - b.daysAway);

    setEvents(live);
    eventsRef.current = live;
    return expiredIds;
  };

  const hydrateFromCache = async (userId: string) => {
    const cached = await readCache<any[]>(cacheKey('events', userId));
    if (!cached?.rows?.length) return;
    if (eventsRef.current.length === 0) applyRows(cached.rows);
  };

  const refreshEvents = async () => {
    if (!user) {
      setEvents([]);
      setLoadError(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('my_events')
        .select('id, title, date, icon, accent, nudges, repeat_unit, repeat_interval');

      if (error) throw error;
      if (!data) return;

      const expiredIds = applyRows(data);
      setLoadError(null);
      writeCache(cacheKey('events', user.id), data);

      if (expiredIds.length > 0) {
        const { error: delError } = await supabase.from('my_events').delete().in('id', expiredIds);
        if (delError) console.warn('Failed to delete expired one-time events', delError);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      // Previously loaded events are left in place rather than blanked out.
      setLoadError(describeLoadError(err, "Couldn't reach the server. Showing your saved copy."));
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      hydrateFromCache(user.id).finally(() => {
        refreshEvents().finally(() => setLoading(false));
      });
    } else {
      setEvents([]);
      setLoadError(null);
    }
  }, [user]);

  const addEvent = async (data: EventInput) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('my_events').insert({
        user_id: user.id,
        title: data.title,
        date: data.date,
        nudges: data.nudges || [],
        icon: data.icon || iconForTitle(data.title),
        accent: 'primary',
        ...serializeRecurrence(data.recurrence ?? YEARLY),
      });
      if (error) throw error;
      await refreshEvents();
    } catch (err) {
      console.error('Error adding event:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (id: string, data: Partial<EventInput>) => {
    if (!user) return;
    try {
      const updates: Record<string, unknown> = {};
      if (data.title !== undefined) {
        updates.title = data.title;
        updates.icon = data.icon || iconForTitle(data.title);
      } else if (data.icon !== undefined) {
        updates.icon = data.icon;
      }
      if (data.date !== undefined) updates.date = data.date;
      if (data.nudges !== undefined) updates.nudges = data.nudges;
      if (data.recurrence !== undefined) Object.assign(updates, serializeRecurrence(data.recurrence));

      const { error } = await supabase.from('my_events').update(updates).eq('id', id);
      if (error) throw error;
      await refreshEvents();
    } catch (err) {
      console.error('Error updating event:', err);
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('my_events').delete().eq('id', id);
      if (error) throw error;
      await refreshEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  };

  // Staged deletions read as gone everywhere while the undo window is open.
  const visibleEvents = events.filter((e) => !hiddenIds.includes(e.id));

  const deleteEventWithUndo = (event: MyEvent) => {
    setHiddenIds((prev) => [...prev, event.id]);
    stage({
      message: `${event.title} deleted`,
      commit: async () => {
        try {
          await deleteEvent(event.id);
        } finally {
          setHiddenIds((prev) => prev.filter((id) => id !== event.id));
        }
      },
      undo: () => setHiddenIds((prev) => prev.filter((id) => id !== event.id)),
    });
  };

  const getEvent = (id: string) => visibleEvents.find((e) => e.id === id);

  return (
    <EventsContext.Provider
      value={{ events: visibleEvents, loading, loadError, addEvent, updateEvent, deleteEvent, deleteEventWithUndo, refreshEvents, getEvent }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within EventsProvider');
  return ctx;
}
