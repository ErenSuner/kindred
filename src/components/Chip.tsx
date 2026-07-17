import { colors, radius } from '@/theme/tokens';
import { StyleSheet, View, Pressable } from 'react-native';
import { Txt } from './Txt';

type Tone = 'secondary' | 'tertiary' | 'primary' | 'primarySolid';

const tones: Record<Tone, { bg: string; fg: string }> = {
  secondary: { bg: 'rgba(206,234,207,0.5)', fg: colors.onSecondaryContainer },
  tertiary: { bg: 'rgba(207,151,83,0.3)', fg: colors.onTertiaryContainer },
  primary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
  primarySolid: { bg: colors.primary, fg: colors.onPrimary },
};

// Consistent colors for each relationship role across the whole app.
const roleColors: Record<string, { bg: string; fg: string }> = {
  Family: { bg: 'rgba(217,142,142,0.25)', fg: colors.primary },
  Friend: { bg: 'rgba(206,234,207,0.5)', fg: colors.secondary },
  Partner: { bg: 'rgba(207,151,83,0.25)', fg: colors.tertiary },
  Colleague: { bg: 'rgba(139,76,77,0.12)', fg: colors.onSurfaceVariant },
  Acquaintance: { bg: 'rgba(228,226,225,0.6)', fg: colors.outline },
};

// Pill-shaped tag used to categorize dates and relationships.
export function Chip({ label, tone = 'secondary', role }: { label: string; tone?: Tone; role?: string }) {
  // Role-based color takes priority when provided
  const c = role && roleColors[role] ? roleColors[role] : tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Txt variant="labelSm" color={c.fg}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
});

export function SelectableChip({ 
  label, 
  active, 
  onPress,
  isRole = false 
}: { 
  label: string; 
  active: boolean; 
  onPress: () => void;
  isRole?: boolean;
}) {
  let activeBg: string = 'rgba(217,142,142,0.2)'; // soft rose fallback
  let activeBorder: string = colors.primary;
  let activeFg: string = colors.primary;

  if (isRole && roleColors[label]) {
    activeBg = roleColors[label].bg;
    activeBorder = roleColors[label].fg;
    activeFg = roleColors[label].fg;
  }

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? activeBorder : colors.outlineVariant,
        backgroundColor: active ? activeBg : 'transparent',
      }}
    >
      <Txt variant="labelMd" color={active ? activeFg : colors.onSurfaceVariant}>
        {label}
      </Txt>
    </Pressable>
  );
}
