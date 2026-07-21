import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { NOTE } from '@/utils/notes';
import { useTranslation } from "react-i18next";

// Kept generous — the cap is about stopping a note from becoming an essay, not
// about being stingy. Cards only ever preview the first couple of lines.
export const NOTE_MAX_LENGTH = 280;

// A note as the editor holds it. `id` is set once it has a database row; the
// add screen works entirely with id-less drafts and writes them after the
// occasion itself is saved.
export type DraftNote = {
  key: string;
  id?: string;
  kind: string;
  body: string;
};

export function draftFromNote(note: { id: string; kind: string; body: string }): DraftNote {
  return { key: note.id, id: note.id, kind: note.kind, body: note.body };
}

type Props = {
  notes: DraftNote[];
  onChange: (next: DraftNote[]) => void;
  title?: string;
  blurb?: string;
};

export function NotesEditor({ notes, onChange, title, blurb }: Props) {
    const { t } = useTranslation();
  const heading = title ?? t('notes_title');
  const { c } = useTheme();
  const [body, setBody] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const trimmed = body.trim();
  const remaining = NOTE_MAX_LENGTH - body.length;

  const commit = () => {
    if (!trimmed) return;

    if (editingKey) {
      onChange(notes.map((n) => (n.key === editingKey ? { ...n, body: trimmed } : n)));
      setEditingKey(null);
    } else {
      onChange([...notes, { key: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, kind: NOTE, body: trimmed }]);
    }

    setBody('');
  };

  const startEdit = (note: DraftNote) => {
    setEditingKey(note.key);
    setBody(note.body);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setBody('');
  };

  const remove = (key: string) => {
    if (editingKey === key) cancelEdit();
    onChange(notes.filter((n) => n.key !== key));
  };

  return (
    <View style={[styles.box, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="edit-note" size={18} color={c.flameDeep} />
        <Txt variant="subMed">{heading}</Txt>
      </View>
      <Txt variant="sub" color={c.muted} style={{ marginTop: 4, marginBottom: 12 }}>
        {blurb ?? t('notes_blurb')}
      </Txt>

      {notes.length > 0 && (
        <View style={{ gap: 8, marginBottom: 12 }}>
          {notes.map((note) => (
            <View
              key={note.key}
              style={[
                styles.noteRow,
                { backgroundColor: c.surfaceAlt, borderColor: c.line },
                editingKey === note.key && { borderColor: c.flame },
              ]}
            >
              {/* minWidth 0 lets a long unbroken word wrap instead of pushing
                  out of the card. */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="body">{note.body}</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, paddingLeft: 8 }}>
                <Pressable onPress={() => startEdit(note)} hitSlop={8}>
                  <Icon name="edit" size={16} color={c.faint} />
                </Pressable>
                <Pressable onPress={() => remove(note.key)} hitSlop={8}>
                  <Icon name="close" size={16} color={c.muted} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <TextInput
        multiline
        value={body}
        onChangeText={setBody}
        maxLength={NOTE_MAX_LENGTH}
        placeholder={t('e_g_she_mentioned_wanting')}
        placeholderTextColor={c.faint}
        style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.line, color: c.text }]}
      />

      <View style={styles.inputFooter}>
        <Txt variant="sub" color={remaining <= 20 ? c.danger : c.faint}>
          {remaining} {t('left')}</Txt>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {editingKey && (
            <Pressable onPress={cancelEdit} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Txt variant="label" color={c.muted}>{t('cancel')}</Txt>
            </Pressable>
          )}
          <Pressable
            onPress={commit}
            disabled={!trimmed}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: c.flame },
              !trimmed && { opacity: 0.4 },
              pressed && trimmed && { opacity: 0.85 },
            ]}
          >
            <Icon name={editingKey ? 'check' : 'add'} size={16} color={c.onFlame} />
            <Txt variant="label" color={c.onFlame}>{editingKey ? t('save_note') : t('add_note')}</Txt>
          </Pressable>
        </View>
      </View>

      {notes.length === 0 && !trimmed && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Txt variant="sub" color={c.faint} style={styles.hint}>
            {t('notes_show_up_on_this')}</Txt>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    marginTop: spacing.stackSm,
  },
  input: {
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    textAlignVertical: 'top',
    fontFamily: fonts.figtreeRegular,
    fontSize: 15,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  hint: { marginTop: 10, opacity: 0.9 },
});
