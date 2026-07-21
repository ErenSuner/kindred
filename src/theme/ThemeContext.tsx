import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  light,
  dark,
  cardShadow,
  floatShadow,
  type Palette,
} from './tokens';

export type ThemePref = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

export type Theme = {
  mode: ThemeMode;
  /** The active palette. */
  c: Palette;
  cardShadow: object;
  floatShadow: object;
  /** What the user chose in settings ('system' follows the OS). */
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
};

const STORAGE_KEY = 'kindred.themePref';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPrefState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const mode: ThemeMode =
    pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;

  const value = useMemo<Theme>(
    () => ({
      mode,
      c: mode === 'dark' ? dark : light,
      cardShadow: cardShadow(mode),
      floatShadow: floatShadow(mode),
      pref,
      setPref,
    }),
    [mode, pref, setPref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Fallback lets components render outside the provider (the error boundary
// wraps everything, including ThemeProvider itself).
const fallback: Theme = {
  mode: 'light',
  c: light,
  cardShadow: cardShadow('light'),
  floatShadow: floatShadow('light'),
  pref: 'system',
  setPref: () => {},
};

export function useTheme(): Theme {
  return useContext(ThemeContext) ?? fallback;
}
