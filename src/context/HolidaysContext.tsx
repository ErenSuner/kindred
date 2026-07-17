import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ENABLED_HOLIDAYS, HOLIDAYS, Holiday } from '@/data/holidays';
import { UpcomingHoliday, resolveHolidays } from '@/utils/holidays';

const STORAGE_KEY = '@settings_holidays';

// How far ahead the home screen starts flagging a shared occasion.
export const HOLIDAY_HORIZON_DAYS = 15;

type HolidaysContextValue = {
  enabledIds: string[];
  loading: boolean;
  isEnabled: (id: string) => boolean;
  toggleHoliday: (id: string, enabled: boolean) => Promise<void>;
  // Enabled holidays, soonest first.
  upcoming: UpcomingHoliday[];
  // The subset close enough to show on the home screen.
  imminent: UpcomingHoliday[];
};

const HolidaysContext = createContext<HolidaysContextValue | null>(null);

// Stored as a plain id list rather than per-holiday keys so the whole
// preference reads and writes in one go.
export function HolidaysProvider({ children }: { children: React.ReactNode }) {
  const [enabledIds, setEnabledIds] = useState<string[]>(DEFAULT_ENABLED_HOLIDAYS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw === null) return; // never set — keep the defaults
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Drop ids from a catalog that has since changed.
            setEnabledIds(parsed.filter((id: unknown) => typeof id === 'string' && HOLIDAYS.some((h) => h.id === id)));
          }
        } catch {
          console.warn('[Holidays] Could not parse stored selection; keeping defaults.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleHoliday = async (id: string, enabled: boolean) => {
    const next = enabled ? [...new Set([...enabledIds, id])] : enabledIds.filter((h) => h !== id);
    setEnabledIds(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('[Holidays] Could not save selection', e);
    }
  };

  const enabledHolidays: Holiday[] = useMemo(
    () => HOLIDAYS.filter((h) => enabledIds.includes(h.id)),
    [enabledIds],
  );

  const upcoming = useMemo(() => resolveHolidays(enabledHolidays), [enabledHolidays]);
  const imminent = useMemo(
    () => upcoming.filter((u) => u.daysAway >= 0 && u.daysAway <= HOLIDAY_HORIZON_DAYS),
    [upcoming],
  );

  return (
    <HolidaysContext.Provider
      value={{
        enabledIds,
        loading,
        isEnabled: (id) => enabledIds.includes(id),
        toggleHoliday,
        upcoming,
        imminent,
      }}
    >
      {children}
    </HolidaysContext.Provider>
  );
}

export function useHolidays() {
  const ctx = useContext(HolidaysContext);
  if (!ctx) throw new Error('useHolidays must be used within HolidaysProvider');
  return ctx;
}
