import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '@/theme/ThemeContext';

type Props = {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  size?: number;
  color?: string;
  style?: React.ComponentProps<typeof MaterialIcons>['style'];
};

// Thin wrapper so screens read like the source markup (Material Symbols names,
// hyphenated for @expo/vector-icons).
export function Icon({ name, size = 24, color, style }: Props) {
  const { c } = useTheme();
  return <MaterialIcons name={name} size={size} color={color ?? c.text} style={style} />;
}
