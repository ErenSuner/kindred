import { describeWriteError } from '@/utils/loadError';
import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Modal } from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { usePeople } from '@/context/PeopleContext';
import { buildHistory, PastOccurrence } from '@/utils/history';
import { NOTE_MAX_LENGTH } from '@/components/NotesEditor';
import type { Person } from '@/data/mock';
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

// How many entries to show before collapsing behind "Show more". A person with
// several yearly dates racks these up quickly and the section shouldn't take
// over the screen.
const COLLAPSED_COUNT = 4;

// A date that has passed is something to look back on, never a failure.
export function LookingBack({ person }: { person: Person }) {
    const { t } = useTranslation();
  const { c, cardShadow, floatShadow } = useTheme();
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
      setError(t('write_something_first'));
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
      <View style={styles.sectionHead}>
        <Txt variant="eyebrow" color={c.faint}>{t('looking_back')}</Txt>
        <View style={[styles.sectionRule, { backgroundColor: c.line }]} />
      </View>

      <View style={[styles.timeline, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
        {shown.map((entry, index) => {
          const memory = entry.memories[0];
          const last = index === shown.length - 1;

          return (
            <Pressable
              key={entry.key}
              onPress={() => openEditor(entry)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}
            >
              {/* Spine: a dot per occurrence, joined by a line. */}
              <View style={styles.spine}>
                <View
                  style={[
                    styles.dot,
                    { borderColor: c.lineStrong, backgroundColor: c.surface },
                    memory && { backgroundColor: c.flame, borderColor: c.flame },
                  ]}
                />
                {!last && <View style={[styles.line, { backgroundColor: c.line }]} />}
              </View>

              <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.stackMd }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name={entry.icon as any} size={14} color={c.muted} />
                  <Txt variant="bodyMed">{entry.title}</Txt>
                </View>

                <Txt variant="sub" color={c.muted} style={styles.meta}>
                  {entry.formattedDate} · {entry.relativeLabel}
                </Txt>

                {memory ? (
                  <View style={[styles.memory, { backgroundColor: c.surfaceAlt }]}>
                    <Txt variant="body" style={{ lineHeight: 20 }}>
                      {memory.body}
                    </Txt>
                  </View>
                ) : (
                  <View style={styles.emptyRow}>
                    <Icon name="add" size={14} color={c.flameDeep} />
                    <Txt variant="sub" color={c.flameDeep}>{t('what_happened')}</Txt>
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
          <Txt variant="label" color={c.flameDeep}>
            {expanded ? t('show_less') : t('show_more_count', { n: history.length - COLLAPSED_COUNT })}
          </Txt>
          <Icon name={expanded ? 'expand-less' : 'expand-more'} size={18} color={c.flameDeep} />
        </Pressable>
      )}

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={() => setEditing(null)}>
          <Animated.View
            entering={SlideInDown.duration(260)}
            style={[styles.sheet, { backgroundColor: c.surface }, floatShadow]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.handle, { backgroundColor: c.lineStrong }]} />
              </View>

              <Txt variant="heading">{editing?.title}</Txt>
              <Txt variant="body" color={c.muted} style={{ marginTop: 4, marginBottom: 16 }}>
                {editing?.formattedDate} · {editing?.relativeLabel}
              </Txt>

              <TextInput
                multiline
                autoFocus
                value={body}
                onChangeText={setBody}
                maxLength={NOTE_MAX_LENGTH}
                placeholder={t('what_did_you_do_what')}
                placeholderTextColor={c.faint}
                style={[
                  styles.input,
                  { backgroundColor: c.surfaceAlt, borderColor: c.line, color: c.text },
                ]}
              />

              <View style={{ marginTop: 12 }}>
                <FormError message={error} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <Button label={t('cancel')} variant="quiet" style={{ flex: 1 }} onPress={() => setEditing(null)} />
                <Button
                  label={saving ? t('saving') : t('save')}
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
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 2 },
  sectionRule: { flex: 1, height: 1 },
  timeline: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  row: { flexDirection: 'row', gap: 14 },
  spine: { alignItems: 'center', width: 12 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: 4,
  },
  line: { flex: 1, width: 2, marginTop: 4 },
  meta: { marginTop: 2 },
  memory: {
    marginTop: 8,
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
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  handle: { width: 40, height: 4, borderRadius: 2 },
  input: {
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    fontFamily: fonts.figtreeRegular,
    fontSize: 15,
  },
});
