import type { SimpleBirthday } from '@/data/mock';
import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getNextOccurrence } from '@/utils/dates';
import { YEARLY } from '@/utils/recurrence';
import { describeLoadError } from '@/utils/loadError';
import { useUndo } from './UndoContext';
import { cacheKey, readCache, writeCache } from '@/utils/cache';

// The default emoji when the user doesn't pick one — a birthday cake reads
// clearly at avatar size.
export const DEFAULT_BIRTHDAY_EMOJI = '🎂';

// A short spread of faces to stand in for the person. The cake leads because
// it's the safe default; the rest cover the common "who is this" at a glance.
export const EMOJI_CHOICES = ['🎂', '🎈', '🎉', '🌸', '⭐', '❤️', '🐣', '🦋', '🍰', '🎁'];

type BirthdayInput = {
  name: string;
  date: string; // YYYY-MM-DD (year 1000 = skipped)
  emoji?: string;
  nudges?: string[];
};

type BirthdaysContextValue = {
  birthdays: SimpleBirthday[];
  loading: boolean;
  loadError: string | null;
  addBirthday: (data: BirthdayInput) => Promise<void>;
  updateBirthday: (id: string, data: Partial<BirthdayInput>) => Promise<void>;
  deleteBirthday: (id: string) => Promise<void>;
  // Hides the birthday immediately and offers an undo before it reaches the database.
  deleteBirthdayWithUndo: (birthday: SimpleBirthday) => void;
  refreshBirthdays: () => Promise<void>;
  getBirthday: (id: string) => SimpleBirthday | undefined;
};

const BirthdaysContext = createContext<BirthdaysContextValue | null>(null);

// A birthday is a yearly cycle that counts an age — the same maths people's
// birthdays already use, just without a Person around it.
function mapRow(row: any): SimpleBirthday {
  const { formattedDate, daysAway, turningAge } = getNextOccurrence(row.date, YEARLY, true);
  return {
    id: row.id,
    name: row.name,
    originalDate: row.date,
    emoji: row.emoji || DEFAULT_BIRTHDAY_EMOJI,
    nudges: row.nudges || [],
    date: formattedDate,
    daysAway,
    turningAge,
  };
}

export function BirthdaysProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState<SimpleBirthday[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const { stage } = useUndo();
  const birthdaysRef = useRef<SimpleBirthday[]>([]);

  // Rows in, sorted birthdays out — used by both the network and the cache so
  // countdowns are always recomputed from today.
  const applyRows = (rows: any[]) => {
    const mapped = rows.map(mapRow).sort((a, b) => a.daysAway - b.daysAway);
    setBirthdays(mapped);
    birthdaysRef.current = mapped;
  };

  const hydrateFromCache = async (userId: string) => {
    const cached = await readCache<any[]>(cacheKey('simple_birthdays', userId));
    if (!cached?.rows?.length) return;
    if (birthdaysRef.current.length === 0) applyRows(cached.rows);
  };

  const refreshBirthdays = async () => {
    if (!user) {
      setBirthdays([]);
      setLoadError(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('simple_birthdays')
        .select('id, name, date, emoji, nudges');

      if (error) throw error;
      if (!data) return;

      applyRows(data);
      setLoadError(null);
      writeCache(cacheKey('simple_birthdays', user.id), data);
    } catch (err) {
      console.error('Error fetching birthdays:', err);
      setLoadError(describeLoadError(err, "Couldn't reach the server. Showing your saved copy."));
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      hydrateFromCache(user.id).finally(() => {
        refreshBirthdays().finally(() => setLoading(false));
      });
    } else {
      setBirthdays([]);
      setLoadError(null);
    }
  }, [user]);

  const addBirthday = async (data: BirthdayInput) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('simple_birthdays').insert({
        user_id: user.id,
        name: data.name,
        date: data.date,
        emoji: data.emoji || DEFAULT_BIRTHDAY_EMOJI,
        nudges: data.nudges || [],
      });
      if (error) throw error;
      await refreshBirthdays();
    } catch (err) {
      console.error('Error adding birthday:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateBirthday = async (id: string, data: Partial<BirthdayInput>) => {
    if (!user) return;
    try {
      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.date !== undefined) updates.date = data.date;
      if (data.emoji !== undefined) updates.emoji = data.emoji;
      if (data.nudges !== undefined) updates.nudges = data.nudges;

      const { error } = await supabase.from('simple_birthdays').update(updates).eq('id', id);
      if (error) throw error;
      await refreshBirthdays();
    } catch (err) {
      console.error('Error updating birthday:', err);
      throw err;
    }
  };

  const deleteBirthday = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('simple_birthdays').delete().eq('id', id);
      if (error) throw error;
      await refreshBirthdays();
    } catch (err) {
      console.error('Error deleting birthday:', err);
      throw err;
    }
  };

  // Staged deletions read as gone everywhere while the undo window is open.
  const visibleBirthdays = birthdays.filter((b) => !hiddenIds.includes(b.id));

  const deleteBirthdayWithUndo = (birthday: SimpleBirthday) => {
    setHiddenIds((prev) => [...prev, birthday.id]);
    stage({
      message: `${birthday.name} deleted`,
      commit: async () => {
        try {
          await deleteBirthday(birthday.id);
        } finally {
          setHiddenIds((prev) => prev.filter((id) => id !== birthday.id));
        }
      },
      undo: () => setHiddenIds((prev) => prev.filter((id) => id !== birthday.id)),
    });
  };

  const getBirthday = (id: string) => visibleBirthdays.find((b) => b.id === id);

  return (
    <BirthdaysContext.Provider
      value={{
        birthdays: visibleBirthdays,
        loading,
        loadError,
        addBirthday,
        updateBirthday,
        deleteBirthday,
        deleteBirthdayWithUndo,
        refreshBirthdays,
        getBirthday,
      }}
    >
      {children}
    </BirthdaysContext.Provider>
  );
}

export function useBirthdays() {
  const ctx = useContext(BirthdaysContext);
  if (!ctx) throw new Error('useBirthdays must be used within BirthdaysProvider');
  return ctx;
}
