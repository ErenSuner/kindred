import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from './Txt';
import { Icon } from './Icon';

type Variant = 'primary' | 'quiet' | 'ghost' | 'danger' | 'dangerSolid';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Icon>['name'];
  iconRight?: React.ComponentProps<typeof Icon>['name'];
  style?: ViewStyle;
  fullWidth?: boolean;
  disabled?: boolean;
  small?: boolean;
};

// Pill button. One flame-filled primary per screen; everything else stays quiet.
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  style,
  fullWidth,
  disabled,
  small,
}: Props) {
  const { c } = useTheme();
  const looks: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.flame, fg: c.onFlame },
    quiet: { bg: c.surfaceAlt, fg: c.text },
    ghost: { bg: 'transparent', fg: c.muted, border: c.lineStrong },
    danger: { bg: c.dangerWash, fg: c.danger },
    dangerSolid: { bg: c.danger, fg: '#FFFFFF' },
  };
  const look = looks[variant];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        { backgroundColor: look.bg },
        look.border != null && { borderWidth: 1, borderColor: look.border },
        fullWidth && { alignSelf: 'stretch' },
        pressed && !disabled && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={small ? 17 : 20} color={look.fg} />}
      <Txt variant={small ? 'label' : 'bodySemi'} color={look.fg}>
        {label}
      </Txt>
      {iconRight && <Icon name={iconRight} size={small ? 16 : 18} color={look.fg} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: radius.full,
  },
  small: {
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
});
