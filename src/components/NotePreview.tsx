import { View, StyleSheet } from 'react-native';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import type { Note } from '@/data/mock';
import { useTranslation } from "react-i18next";

type Props = {
  notes?: Note[];
  // Cards are tight on space, so only the most recent note is previewed and the
  // rest are summarised as a count.
  lines?: number;
  compact?: boolean;
  /** Rendered on the dark ink card — swap to on-ink colours. */
  onInk?: boolean;
};

// Shows a taste of what's written down for an occasion without letting a long
// note stretch the card. numberOfLines does the trimming, so the ellipsis lands
// wherever the text actually runs out of room at the current font size.
export function NotePreview({ notes, lines = 2, compact = false, onInk = false }: Props) {
    const { t } = useTranslation();
  const { c } = useTheme();
  if (!notes || notes.length === 0) return null;

  const [first, ...rest] = notes;
  const fg = onInk ? c.onInkMuted : c.muted;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: onInk ? c.inkSoft : c.surfaceAlt },
        compact && styles.wrapCompact,
      ]}
    >
      <Icon name="edit-note" size={compact ? 14 : 16} color={onInk ? c.flame : c.flameDeep} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Txt
          variant={compact ? 'sub' : 'body'}
          color={fg}
          numberOfLines={lines}
          style={compact ? styles.compactText : styles.text}
        >
          {first.body}
        </Txt>
        {rest.length > 0 && (
          <Txt variant="sub" color={fg} style={styles.more}>
            {t('notes_more', { count: rest.length })}
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
  compactText: { lineHeight: 17 },
  more: { opacity: 0.7, marginTop: 3 },
});
