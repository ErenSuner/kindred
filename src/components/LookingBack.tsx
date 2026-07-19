import { describeWriteError } from '@/utils/loadError';
import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Modal } from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { colors, radius, spacing, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { usePeople } from '@/context/PeopleContext';
import { buildHistory, PastOccurrence } from '@/utils/history';
import { NOTE_MAX_LENGTH } from '@/components/NotesEditor';
import type { Person } from '@/data/mock';

// How many entries to show before collapsing behind "Show more". A person with
// several yearly dates racks these up quickly and the section shouldn't take
// over the screen.
const COLLAPSED_COUNT = 4;

export function LookingBack({ person }: { person: Person }) {
  const { saveMemory } = usePeople();
  const history = useMemo(() => buildHistory(person), [person]);

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<PastOccurrence | null>(null);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (history.length === 0) return null;

  const shown = expanded ? history : history.slice(0, COLLAPSED_COUNT);

  const openEditor = (entry: PastOccurrence) => {
    setEditing(entry);
    setBody(entry.memories[0]?.body ?? '');
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Write something first.');
      return;
    }

    setSaving(true);
    try {
      await saveMemory(person.id, editing.dayId, editing.isoDate, trimmed, editing.memories[0]?.id);
      setEditing(null);
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ gap: spacing.stackMd }}>
      <View style={styles.heading}>
        <Icon name="history" size={24} color={colors.tertiary} />
        <Txt variant="headlineMd" color={colors.onSurface}>Looking back</Txt>
      </View>

      <View style={styles.timeline}>
        {shown.map((entry, index) => {
          const memory = entry.memories[0];
          const last = index === shown.length - 1;

          return (
            <Pressable
              key={entry.key}
              onPress={() => openEditor(entry)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceContainerLow }]}
            >
              {/* Spine: a dot per occurrence, joined by a line. */}
              <View style={styles.spine}>
                <View style={[styles.dot, memory && styles.dotFilled]} />
                {!last && <View style={styles.line} />}
              </View>

              <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.stackMd }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name={entry.icon as any} size={14} color={colors.onSurfaceVariant} />
                  <Txt variant="bodyMd" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                    {entry.title}
                  </Txt>
                </View>

                <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.meta}>
                  {entry.formattedDate} · {entry.relativeLabel}
                </Txt>

                {memory ? (
                  <View style={styles.memory}>
                    <Txt variant="bodyMd" color={colors.onSurface} style={{ lineHeight: 20 }}>
                      {memory.body}
                    </Txt>
                  </View>
                ) : (
                  <View style={styles.emptyRow}>
                    <Icon name="add" size={14} color={colors.primary} />
                    <Txt variant="labelSm" color={colors.primary} style={{ fontWeight: 'normal' }}>
                      What happened?
                    </Txt>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {history.length > COLLAPSED_COUNT && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.7 }]}
        >
          <Txt variant="labelMd" color={colors.primary}>
            {expanded ? 'Show less' : `Show ${history.length - COLLAPSED_COUNT} more`}
          </Txt>
          <Icon name={expanded ? 'expand-less' : 'expand-more'} size={18} color={colors.primary} />
        </Pressable>
      )}

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.overlay} onPress={() => setEditing(null)}>
          <Animated.View entering={SlideInDown.duration(260)} style={styles.sheet}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={styles.handle} />
              </View>

              <Txt variant="headlineMd" color={colors.onSurface}>
                {editing?.title}
              </Txt>
              <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4, marginBottom: 16 }}>
                {editing?.formattedDate} · {editing?.relativeLabel}
              </Txt>

              <TextInput
                multiline
                autoFocus
                value={body}
                onChangeText={setBody}
                maxLength={NOTE_MAX_LENGTH}
                placeholder="What did you do? What did you give? How did it go?"
                placeholderTextColor={colors.outline}
                style={styles.input}
              />

              <View style={{ marginTop: 12 }}>
                <FormError message={error} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <Button label="Cancel" variant="tonal" style={{ flex: 1 }} onPress={() => setEditing(null)} />
                <Button
                  label={saving ? 'Saving…' : 'Save'}
                  icon="check"
                  style={{ flex: 1 }}
                  onPress={handleSave}
                  disabled={saving}
                />
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 },
  timeline: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    ...ambientShadow,
  },
  row: { flexDirection: 'row', gap: 14 },
  spine: { alignItems: 'center', width: 12 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    marginTop: 4,
  },
  // A filled dot means there's something written for that occurrence, so the
  // spine doubles as an at-a-glance map of what's been recorded.
  dotFilled: { backgroundColor: colors.tertiary, borderColor: colors.tertiary },
  line: { flex: 1, width: 2, backgroundColor: colors.surfaceVariant, marginTop: 4 },
  meta: { fontWeight: 'normal', marginTop: 2 },
  memory: {
    marginTop: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, opacity: 0.9 },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurface,
  },
});
