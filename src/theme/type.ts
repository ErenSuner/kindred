import { TextStyle } from 'react-native';

// Font family keys map to loaded @expo-google-fonts assets (see _layout.tsx).
// Fraunces carries the voice (warm, bookish); Figtree does the quiet work.
export const fonts = {
  frauncesMedium: 'Fraunces_500Medium',
  frauncesSemiBold: 'Fraunces_600SemiBold',
  figtreeRegular: 'Figtree_400Regular',
  figtreeMedium: 'Figtree_500Medium',
  figtreeSemiBold: 'Figtree_600SemiBold',
  figtreeBold: 'Figtree_700Bold',
} as const;

export const type = {
  /** Screen titles. */
  display: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  /** Hero moments — a name on a dark card, a welcome line. */
  title: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.25,
  },
  /** Section and card headings. */
  heading: {
    fontFamily: fonts.frauncesMedium,
    fontSize: 20,
    lineHeight: 26,
  },
  /** Countdown numerals and dates that deserve warmth. */
  num: {
    fontFamily: fonts.frauncesSemiBold,
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
    lineHeight: 23,
  },
  bodyMed: {
    fontFamily: fonts.figtreeMedium,
    fontSize: 16,
    lineHeight: 23,
  },
  bodySemi: {
    fontFamily: fonts.figtreeSemiBold,
    fontSize: 16,
    lineHeight: 23,
  },
  sub: {
    fontFamily: fonts.figtreeRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  subMed: {
    fontFamily: fonts.figtreeMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Buttons, chips, tab labels. */
  label: {
    fontFamily: fonts.figtreeSemiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  /** Tiny uppercase wayfinding. Pair with textTransform in Txt. */
  eyebrow: {
    fontFamily: fonts.figtreeBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
  },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
