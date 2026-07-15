import { View, StyleSheet } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { Txt } from './Txt';

type Tone = 'secondary' | 'tertiary' | 'primary' | 'primarySolid';

const tones: Record<Tone, { bg: string; fg: string }> = {
  secondary: { bg: 'rgba(206,234,207,0.5)', fg: colors.onSecondaryContainer },
  tertiary: { bg: 'rgba(207,151,83,0.3)', fg: colors.onTertiaryContainer },
  primary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
  primarySolid: { bg: colors.primary, fg: colors.onPrimary },
};

// Pill-shaped tag used to categorize dates and relationships.
export function Chip({ label, tone = 'secondary' }: { label: string; tone?: Tone }) {
  const c = tones[tone];
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
