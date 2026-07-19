import { StyleSheet, View, Pressable } from 'react-native';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from './Txt';

type Tone = 'neutral' | 'flame' | 'good' | 'ink';

// Small pill tag. Roles and metadata stay neutral; flame is reserved for the
// things that are actually near (today, this week, pinned).
export function Chip({
  label,
  tone = 'neutral',
  role: _role,
}: {
  label: string;
  tone?: Tone;
  role?: string;
}) {
  const { c } = useTheme();
  const tones: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: c.surfaceAlt, fg: c.muted },
    flame: { bg: c.flameWash, fg: c.flameDeep },
    good: { bg: c.goodWash, fg: c.good },
    ink: { bg: c.ink, fg: c.onInk },
  };
  const look = tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: look.bg }]}>
      <Txt variant="label" color={look.fg}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
});

// Choice pill for forms and filters. Active = ink, unmistakable.
export function SelectableChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  isRole?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles2.pill,
        {
          borderColor: active ? c.ink : c.lineStrong,
          backgroundColor: active ? c.ink : 'transparent',
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Txt variant="subMed" color={active ? c.onInk : c.muted}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles2 = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
