// Kindred design tokens — mirrors DESIGN.md (Material 3 warm-minimalist palette).
import { Platform } from 'react-native';

export const colors = {
  error: '#ba1a1a',
  onSurfaceVariant: '#524343',
  inverseSurface: '#303030',
  surfaceDim: '#dcd9d9',
  tertiaryFixedDim: '#f8bb73',
  onPrimaryFixed: '#380b0f',
  onPrimary: '#ffffff',
  primaryContainer: '#d98e8e',
  background: '#fcf9f8',
  tertiaryContainer: '#cf9753',
  surfaceContainer: '#f0eded',
  onErrorContainer: '#93000a',
  inverseOnSurface: '#f3f0f0',
  onSurface: '#1b1c1c',
  outlineVariant: '#d7c1c1',
  secondary: '#4c644f',
  onPrimaryFixedVariant: '#6f3637',
  onTertiaryFixed: '#2b1700',
  surfaceTint: '#8b4c4d',
  tertiary: '#825516',
  surfaceContainerHigh: '#eae7e7',
  onSecondaryFixedVariant: '#354c39',
  secondaryFixedDim: '#b3cdb4',
  errorContainer: '#ffdad6',
  surfaceBright: '#fcf9f8',
  primaryFixed: '#ffdad9',
  onSecondaryFixed: '#092010',
  onSecondary: '#ffffff',
  secondaryContainer: '#ceeacf',
  surfaceContainerLowest: '#ffffff',
  onTertiary: '#ffffff',
  onPrimaryContainer: '#5d2829',
  outline: '#857372',
  surfaceContainerLow: '#f6f3f2',
  primaryFixedDim: '#ffb3b2',
  onSecondaryContainer: '#526a55',
  surface: '#fcf9f8',
  tertiaryFixed: '#ffddb9',
  primary: '#8b4c4d',
  onError: '#ffffff',
  onTertiaryFixedVariant: '#663e00',
  inversePrimary: '#ffb3b2',
  onBackground: '#1b1c1c',
  surfaceContainerHighest: '#e4e2e1',
  onTertiaryContainer: '#523100',
  secondaryFixed: '#ceeacf',
  surfaceVariant: '#e4e2e1',
} as const;

// 8px base unit spacing scale.
export const spacing = {
  unit: 8,
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  stackXl: 48,
  gutter: 16,
  containerMobile: 24,
} as const;

export const radius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Soft, diffused ambient shadow with a blush tint (approximated for RN).
export const ambientShadow = Platform.select({
  web: {
    boxShadow: '0 4px 20px -2px rgba(139, 76, 77, 0.08), 0 0 3px rgba(139, 76, 77, 0.02)',
  },
  default: {
    shadowColor: '#8b4c4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
}) as any;

export const softShadow = Platform.select({
  web: {
    boxShadow: '0 2px 10px rgba(139, 76, 77, 0.06)',
  },
  default: {
    shadowColor: '#8b4c4d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
}) as any;
