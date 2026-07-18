import { View, StyleSheet } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import type { Note } from '@/data/mock';

type Props = {
  notes?: Note[];
  // Cards are tight on space, so only the most recent note is previewed and the
  // rest are summarised as a count.
  lines?: number;
  compact?: boolean;
};

// Shows a taste of what's written down for an occasion without letting a long
// note stretch the card. numberOfLines does the trimming, so the ellipsis lands
// wherever the text actually runs out of room at the current font size.
export function NotePreview({ notes, lines = 2, compact = false }: Props) {
  if (!notes || notes.length === 0) return null;

  const [first, ...rest] = notes;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Icon name="edit-note" size={compact ? 14 : 16} color={colors.tertiary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Txt
          variant={compact ? 'labelSm' : 'bodyMd'}
          color={colors.onSurfaceVariant}
          numberOfLines={lines}
          style={compact ? styles.compactText : styles.text}
        >
          {first.body}
        </Txt>
        {rest.length > 0 && (
          <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.more}>
            +{rest.length} more {rest.length === 1 ? 'note' : 'notes'}
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  wrapCompact: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 6,
  },
  text: { lineHeight: 20 },
  compactText: { fontWeight: 'normal', lineHeight: 17 },
  more: { fontWeight: 'normal', opacity: 0.7, marginTop: 3 },
});
