// Kindred "Lamplight" tokens — spruce ink, candle flame, linen paper.
// Both themes are first-class; every colour is semantic and swaps at runtime
// via the ThemeProvider (src/theme/ThemeContext.tsx).
import { Platform } from 'react-native';

export type Palette = {
  /** Screen background. */
  bg: string;
  /** Card background. */
  surface: string;
  /** Inset wells, input fields, collapsed areas. */
  surfaceAlt: string;
  /** Hairline separation. */
  line: string;
  /** Emphasised hairline (selected outlines, dividers that must read). */
  lineStrong: string;

  /** The dark anchor surface — tab bar, hero card. */
  ink: string;
  /** Raised element sitting on ink. */
  inkSoft: string;
  onInk: string;
  onInkMuted: string;
  onInkFaint: string;

  text: string;
  muted: string;
  faint: string;

  /** Candle amber — fills, active states. Pair with onFlame text. */
  flame: string;
  /** Amber legible as text/icon on bg/surface. */
  flameDeep: string;
  /** Soft amber wash for chips and highlights. */
  flameWash: string;
  onFlame: string;

  good: string;
  goodWash: string;
  danger: string;
  dangerWash: string;

  overlay: string;
};

export const light: Palette = {
  bg: '#F6F3EA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBDF',
  line: '#E4DFD0',
  lineStrong: '#CCC6B4',

  ink: '#1F2921',
  inkSoft: '#2D392F',
  onInk: '#F5F2E8',
  onInkMuted: '#B7BFB1',
  onInkFaint: '#828C80',

  text: '#242B24',
  muted: '#5C635A',
  faint: '#8B9187',

  flame: '#EDA33D',
  flameDeep: '#95600E',
  flameWash: '#F7E8C9',
  onFlame: '#2A1F0C',

  good: '#4A6B46',
  goodWash: '#E3EAD8',
  danger: '#B23A2C',
  dangerWash: '#F6DFD7',

  overlay: 'rgba(23, 28, 23, 0.55)',
};

export const dark: Palette = {
  bg: '#141A15',
  surface: '#1D241E',
  surfaceAlt: '#272F27',
  line: '#313A31',
  lineStrong: '#45503F',

  ink: '#28322A',
  inkSoft: '#344036',
  onInk: '#F0EDE1',
  onInkMuted: '#AEB8AA',
  onInkFaint: '#7C867A',

  text: '#EBE8DC',
  muted: '#A6AD9F',
  faint: '#78806F',

  flame: '#F0B054',
  flameDeep: '#F2BC6F',
  flameWash: '#372C15',
  onFlame: '#231A08',

  good: '#9CBB90',
  goodWash: '#22301F',
  danger: '#E07B6B',
  dangerWash: '#3B2019',

  overlay: 'rgba(0, 0, 0, 0.6)',
};

// 8px base unit spacing scale.
export const spacing = {
  unit: 8,
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  stackXl: 48,
  gutter: 16,
  containerMobile: 20,
} as const;

// Generous shape language — separation comes from value steps and hairlines,
// not from shadow strength.
export const radius = {
  sm: 10,
  DEFAULT: 14,
  md: 16,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

/** Soft grounding shadow for light mode; dark mode relies on value steps. */
export function cardShadow(mode: 'light' | 'dark') {
  if (mode === 'dark') return {};
  return Platform.select({
    web: { boxShadow: '0 2px 12px rgba(31, 41, 33, 0.07)' },
    default: {
      shadowColor: '#1F2921',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 2,
    },
  }) as object;
}

/** Stronger lift for floating elements (tab bar, snackbars, sheets). */
export function floatShadow(mode: 'light' | 'dark') {
  return Platform.select({
    web: {
      boxShadow:
        mode === 'dark'
          ? '0 6px 24px rgba(0, 0, 0, 0.45)'
          : '0 6px 24px rgba(31, 41, 33, 0.18)',
    },
    default: {
      shadowColor: mode === 'dark' ? '#000000' : '#1F2921',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: mode === 'dark' ? 0.45 : 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
  }) as object;
}
