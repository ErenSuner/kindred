import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/theme/tokens';

type Props = {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  size?: number;
  color?: string;
  style?: React.ComponentProps<typeof MaterialIcons>['style'];
};

// Thin wrapper so screens read like the source markup (Material Symbols names,
// hyphenated for @expo/vector-icons).
export function Icon({ name, size = 24, color = colors.onSurface, style }: Props) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}
