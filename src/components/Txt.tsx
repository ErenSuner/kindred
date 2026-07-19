import { Text as RNText, TextProps } from 'react-native';
import { type as typeScale, type TypeVariant } from '@/theme/type';
import { useTheme } from '@/theme/ThemeContext';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
};

// Typed text component that applies the design-system type scale by name.
// Colour defaults to the theme's text colour; eyebrows uppercase themselves.
export function Txt({ variant = 'body', color, style, ...rest }: Props) {
  const { c } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: color ?? c.text },
        variant === 'eyebrow' && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
