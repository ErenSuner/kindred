import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { Txt } from './Txt';
import { Icon } from './Icon';

type Variant = 'primary' | 'tonal' | 'error';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Icon>['name'];
  iconRight?: React.ComponentProps<typeof Icon>['name'];
  style?: ViewStyle;
  fullWidth?: boolean;
  disabled?: boolean;
};

const variants: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  tonal: { bg: colors.surfaceContainer, fg: colors.onSurface },
  error: { bg: colors.errorContainer, fg: colors.onErrorContainer },
};

// Large pill-shaped button — the app's primary call to action.
export function Button({ label, onPress, variant = 'primary', icon, iconRight, style, fullWidth, disabled }: Props) {
  const c = variants[variant];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: c.bg },
        fullWidth && { alignSelf: 'stretch' },
        pressed && !disabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={c.fg} />}
      <Txt variant="labelMd" color={c.fg}>
        {label}
      </Txt>
      {iconRight && <Icon name={iconRight} size={18} color={c.fg} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radius.full,
  },
});
