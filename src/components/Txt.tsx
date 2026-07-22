import { Text as RNText, TextProps } from 'react-native';
import { type as typeScale, type TypeVariant } from '@/theme/type';
import { useTheme } from '@/theme/ThemeContext';
import { upperCase } from '@/utils/text';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
};

// Typed text component that applies the design-system type scale by name.
// Colour defaults to the theme's text colour; eyebrows uppercase themselves.
export function Txt({ variant = 'body', color, style, children, ...rest }: Props) {
  const { c } = useTheme();

  // CSS `text-transform: uppercase` doesn't know about Turkish: it turns the
  // dotted i of "bildirimler" into a dotless I. Uppercasing the string here
  // instead goes through the language's own rules, so it reads BİLDİRİMLER.
  const content =
    variant === 'eyebrow' && typeof children === 'string' ? upperCase(children) : children;

  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color: color ?? c.text }, style]}
    >
      {content}
    </RNText>
  );
}
