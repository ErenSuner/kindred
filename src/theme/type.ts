import { TextStyle } from 'react-native';

// Font family keys map to loaded @expo-google-fonts assets (see _layout.tsx).
export const fonts = {
  literataMedium: 'Literata_500Medium',
  literataSemiBold: 'Literata_600SemiBold',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
} as const;

// Typographic scale from DESIGN.md. Serif (Literata) for headlines, Inter for UI/body.
export const type = {
  headlineXl: {
    fontFamily: fonts.literataSemiBold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  headlineLg: {
    fontFamily: fonts.literataSemiBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  headlineLgMobile: {
    fontFamily: fonts.literataSemiBold,
    fontSize: 28,
    lineHeight: 36,
  },
  headlineMd: {
    fontFamily: fonts.literataMedium,
    fontSize: 24,
    lineHeight: 32,
  },
  bodyLg: {
    fontFamily: fonts.interRegular,
    fontSize: 18,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: fonts.interRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  labelMd: {
    fontFamily: fonts.interMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  labelSm: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.36,
  },
} satisfies Record<string, TextStyle>;
