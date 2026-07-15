import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { type as typeScale } from '@/theme/type';
import { colors } from '@/theme/tokens';

type Variant = keyof typeof typeScale;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

// Typed text component that applies the design-system type scale by name.
export function Txt({ variant = 'bodyMd', color = colors.onSurface, style, ...rest }: Props) {
  return <RNText {...rest} style={[typeScale[variant], { color }, style]} />;
}

export const textStyles = StyleSheet.create({});
