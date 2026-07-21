import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { PhotoViewer } from '@/components/PhotoViewer';
import { useAuth } from '@/context/AuthContext';
import { usePeople } from '@/context/PeopleContext';
import { pickPhoto, uploadPhoto } from '@/utils/avatars';
import { GIFT_IDEA, MEMORY, NOTEBOOK } from '@/utils/notes';
import type { Note, Person } from '@/data/mock';
import { useTranslation } from "react-i18next";

// A gift idea is a line, not an essay — the cap is what keeps the list
// scannable.
const GIFT_MAX_LENGTH = 120;

// Shared by every container a gift row can move through, so the row and the
// space it leaves behind travel at the same speed.
const ROW_MOTION = LinearTransition.duration(240);

type Props = {
  person: Person;
  onDeleteNote: (noteId: string) => void;
};

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: spacing.stackSm }}>
      <View style={[styles.sectionHead, { borderBottomColor: c.line }]}>
        <Icon name={icon as any} size={15} color={c.flameDeep} />
        <Txt variant="eyebrow" color={c.faint}>{title}</Txt>
      </View>
      {children}
    </View>
  );
}

// Everything the app knows about a person that isn't a date: short gift ideas,
// photos, and one free-form notebook. All three are open at once — they're
// short, and hiding two thirds of what you know about someone behind a tab was
// more chrome than the content deserved.
export function AboutPerson({ person, onDeleteNote }: Props) {
    const { t } = useTranslation();
  const { c, cardShadow } = useTheme();
  const notes = person.notes ?? [];
  const gifts = notes.filter((n) => !n.photoUrl && n.kind === GIFT_IDEA);
  const photos = notes.filter((n) => !!n.photoUrl);
  const notebookNote = notes.find((n) => n.kind === NOTEBOOK);

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
      <View style={[styles.headerRow, { borderBottomColor: c.line }]}>
        <Icon name="auto-stories" size={22} color={c.flameDeep} />
        <Txt variant="heading">{t('about_person', { name: person.name })}</Txt>
      </View>

      <View style={{ gap: spacing.stackLg }}>
        <Section icon="card-giftcard" title={t('gift_ideas')}>
          <GiftIdeas person={person} gifts={gifts} onDelete={onDeleteNote} />
        </Section>

        <Section icon="photo-library" title={t('memories')}>
          <Memories person={person} photos={photos} onDelete={onDeleteNote} />
        </Section>

        <Section icon="menu-book" title={t('notebook')}>
          <Notebook person={person} note={notebookNote} />
        </Section>
      </View>
    </View>
  );
}

// --- Gift ideas --------------------------------------------------------------

function GiftIdeas({ person, gifts, onDelete }: { person: Person; gifts: Note[]; onDelete: (id: string) => void }) {
    const { t } = useTranslation();
  const { c } = useTheme();
  const { addNoteToPerson } = usePeople();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showBought, setShowBought] = useState(false);

  const trimmed = body.trim();

  const add = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await addNoteToPerson(person.id, GIFT_IDEA, trimmed);
      setBody('');
    } catch (e) {
      console.error('Failed to add gift idea:', e);
    } finally {
      setBusy(false);
    }
  };

  // Bought ideas leave the list rather than sitting in it forever, but they
  // aren't deleted — "what did I get them last year" is worth being able to
  // answer.
  const open = gifts.filter((g) => !g.doneAt);
  const bought = gifts.filter((g) => !!g.doneAt);

  return (
    // Every container a row can move between animates its own layout, so a gift
    // crossing from the open list to the bought one pushes its neighbours aside
    // instead of everything below it snapping to a new position.
    <Animated.View layout={ROW_MOTION} style={{ gap: spacing.stackSm }}>
      {open.length === 0 ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.emptyWrap}>
          <Txt variant="sub" color={c.muted} style={styles.empty}>
            {bought.length > 0
              ? t('all_bought')
              : t('jot_here')}
          </Txt>
        </Animated.View>
      ) : (
        <Animated.View layout={ROW_MOTION} style={{ gap: 8 }}>
          {open.map((gift) => (
            <GiftRow key={gift.id} gift={gift} onDelete={onDelete} />
          ))}
        </Animated.View>
      )}

      {/* The input only appears while adding — an always-on text field made the
          section look like a form even when you were only reading. */}
      {adding ? (
        <Animated.View entering={FadeIn.duration(140)} style={styles.giftInputRow}>
          <TextInput
            autoFocus
            value={body}
            onChangeText={setBody}
            maxLength={GIFT_MAX_LENGTH}
            placeholder={t('e_g_that_camera_lens')}
            placeholderTextColor={c.faint}
            style={[styles.giftInput, { backgroundColor: c.surfaceAlt, color: c.text }]}
            returnKeyType="done"
            onSubmitEditing={add}
            onBlur={() => { if (!trimmed) setAdding(false); }}
            editable={!busy}
          />
          <Pressable
            onPress={add}
            disabled={!trimmed || busy}
            style={({ pressed }) => [
              styles.giftAddBtn,
              { backgroundColor: c.flame },
              (!trimmed || busy) && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="add" size={20} color={c.onFlame} />
          </Pressable>
        </Animated.View>
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.addInline, pressed && { opacity: 0.6 }]}
        >
          <Icon name="add" size={17} color={c.flameDeep} />
          <Txt variant="label" color={c.flameDeep}>{t('add_idea')}</Txt>
        </Pressable>
      )}

      {bought.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          layout={ROW_MOTION}
          style={{ gap: 8, marginTop: 4 }}
        >
          <Pressable
            onPress={() => setShowBought((v) => !v)}
            style={({ pressed }) => [styles.boughtToggle, pressed && { opacity: 0.7 }]}
          >
            <Icon name={showBought ? 'expand-less' : 'expand-more'} size={16} color={c.muted} />
            <Txt variant="eyebrow" color={c.faint}>
              {t('bought_count', { count: bought.length })}
            </Txt>
          </Pressable>

          {showBought &&
            bought.map((gift) => <GiftRow key={gift.id} gift={gift} onDelete={onDelete} />)}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// One row of the gift list. Ticking the box is the whole interaction — it moves
// between the open list and the bought one, and untick puts it back.
function GiftRow({ gift, onDelete }: { gift: Note; onDelete: (id: string) => void }) {
  const { c } = useTheme();
  const { setNoteDone } = usePeople();
  const [busy, setBusy] = useState(false);
  const done = !!gift.doneAt;

  // Driven off `done` rather than a separate flag, so the row settles into its
  // new look as one movement instead of stepping through it.
  const progress = useDerivedValue(() => withTiming(done ? 1 : 0, { duration: 220 }), [done]);

  const rowStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value * 0.4 }));
  const textStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value * 0.25 }));

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setNoteDone(gift.id, !done);
    } catch (e) {
      console.error('Failed to update gift idea:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(200).springify().damping(18)}
      exiting={FadeOut.duration(140)}
      layout={ROW_MOTION}
      style={[styles.giftRow, { backgroundColor: c.surfaceAlt, borderColor: c.line }, rowStyle]}
    >
      <Pressable onPress={toggle} disabled={busy} hitSlop={8} style={{ marginTop: 1 }}>
        {/* Swapping the icon outright is the one hard cut left, so it gets a
            fade of its own rather than blinking between two glyphs. */}
        <Animated.View key={done ? 'on' : 'off'} entering={FadeIn.duration(180)}>
          <Icon
            name={done ? 'check-circle' : 'radio-button-unchecked'}
            size={20}
            color={done ? c.good : c.faint}
          />
        </Animated.View>
      </Pressable>

      {/* minWidth 0 is what actually lets the row shrink — without it a single
          long unbroken word pushes straight out of the card. */}
      <Animated.View style={[{ flex: 1, minWidth: 0 }, textStyle]}>
        <Txt
          variant="body"
          color={done ? c.muted : c.text}
          style={done ? styles.giftTextDone : undefined}
        >
          {gift.body}
        </Txt>
      </Animated.View>

      <Pressable onPress={() => onDelete(gift.id)} hitSlop={8}>
        <Icon name="close" size={16} color={c.faint} />
      </Pressable>
    </Animated.View>
  );
}

// --- Memories ----------------------------------------------------------------

function Memories({ person, photos, onDelete }: { person: Person; photos: Note[]; onDelete: (id: string) => void }) {
    const { t } = useTranslation();
  const { c } = useTheme();
  const { user } = useAuth();
  const { addNoteToPerson } = usePeople();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Note | null>(null);

  const addPhoto = async () => {
    if (busy) return;
    if (!user) {
      setError(t('need_sign_in_photo'));
      return;
    }
    setError(null);

    try {
      const picked = await pickPhoto();
      if (picked.status === 'denied') {
        setError(t('photos_access_memory'));
        return;
      }
      if (picked.status === 'cancelled') return;

      setBusy(true);
      const url = await uploadPhoto(user.id, picked.base64, picked.mimeType, `memory-${person.id}`);
      // The body stays empty: a memory here is the picture, nothing else.
      await addNoteToPerson(person.id, MEMORY, '', undefined, url);
    } catch (e) {
      console.error('Failed to add memory:', e);
      setError(t('photo_upload_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.stackSm }}>
      {photos.length === 0 ? (
        <Txt variant="sub" color={c.muted} style={styles.empty}>
          {t('pictures_of_the_two_of')}</Txt>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.thumbWrap}>
              {/* The Pressable has to fill the wrapper, or the image inside it
                  has no height to be 100% of and collapses to nothing. */}
              <Pressable
                onPress={() => setViewing(photo)}
                style={({ pressed }) => [StyleSheet.absoluteFill, pressed && { opacity: 0.85 }]}
              >
                <Image
                  source={{ uri: photo.photoUrl }}
                  style={[styles.thumb, { backgroundColor: c.surfaceAlt }]}
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>
              <Pressable onPress={() => onDelete(photo.id)} hitSlop={6} style={styles.thumbDelete}>
                <Icon name="close" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {error && (
        <Txt variant="sub" color={c.danger}>{error}</Txt>
      )}

      <Pressable
        onPress={addPhoto}
        disabled={busy}
        style={({ pressed }) => [
          styles.dashedBtn,
          { borderColor: c.lineStrong, backgroundColor: c.surfaceAlt },
          pressed && { opacity: 0.8 },
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={c.flameDeep} />
        ) : (
          <>
            <Icon name="add-a-photo" size={18} color={c.flameDeep} />
            <Txt variant="label" color={c.flameDeep}>{t('add_a_photo')}</Txt>
          </>
        )}
      </Pressable>

      <PhotoViewer
        visible={!!viewing}
        onClose={() => setViewing(null)}
        uri={viewing?.photoUrl}
        title={person.name}
      />
    </View>
  );
}

// --- Notebook ----------------------------------------------------------------

function Notebook({ person, note }: { person: Person; note?: Note }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { saveNotebook } = usePeople();
  const savedBody = note?.body ?? '';
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(savedBody);
  const [saving, setSaving] = useState(false);

  // Keep the draft in step with the server whenever we're not mid-edit.
  useEffect(() => {
    if (!editing) setBody(savedBody);
  }, [savedBody, editing]);

  const dirty = body !== savedBody;

  const startEditing = () => {
    setBody(savedBody);
    setEditing(true);
  };

  const cancel = () => {
    setBody(savedBody);
    setEditing(false);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveNotebook(person.id, body, note?.id);
      setEditing(false);
    } catch (e) {
      console.error('Failed to save notebook:', e);
    } finally {
      setSaving(false);
    }
  };

  // Editing: a real textarea with save/cancel. This is the only time the
  // notebook looks like an input.
  if (editing) {
    return (
      <View style={{ gap: spacing.stackSm }}>
        <TextInput
          autoFocus
          multiline
          value={body}
          onChangeText={setBody}
          placeholder={t('notebook_placeholder', { name: person.name })}
          placeholderTextColor={c.faint}
          style={[styles.notebook, { backgroundColor: c.surfaceAlt, color: c.text }]}
          textAlignVertical="top"
        />
        <View style={styles.notebookFooter}>
          <Pressable onPress={cancel} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Txt variant="label" color={c.muted}>{t('cancel')}</Txt>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={!dirty || saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: c.flame },
              (!dirty || saving) && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="check" size={16} color={c.onFlame} />
            <Txt variant="label" color={c.onFlame}>{saving ? t('saving') : t('save')}</Txt>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty: a quiet invitation, no input box sitting there.
  if (!savedBody) {
    return (
      <Pressable
        onPress={startEditing}
        hitSlop={8}
        style={({ pressed }) => [styles.addInline, pressed && { opacity: 0.6 }]}
      >
        <Icon name="add" size={17} color={c.flameDeep} />
        <Txt variant="label" color={c.flameDeep}>{t('add_a_note')}</Txt>
      </Pressable>
    );
  }

  // Has content: read it as text. Tapping anywhere opens the editor.
  return (
    <Pressable onPress={startEditing} style={({ pressed }) => pressed && { opacity: 0.85 }}>
      <View style={{ gap: spacing.stackSm }}>
        <Txt variant="body" color={c.text} style={{ lineHeight: 24 }}>{savedBody}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="edit" size={13} color={c.faint} />
          <Txt variant="sub" color={c.faint}>{t('tap_to_edit')}</Txt>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  empty: { paddingVertical: 2 },

  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  giftTextDone: { textDecorationLine: 'line-through' },
  addInline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, alignSelf: 'flex-start' },
  emptyWrap: { paddingVertical: 4 },
  boughtToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  giftInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  giftInput: {
    flex: 1,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: fonts.figtreeRegular,
    fontSize: 15,
  },
  giftAddBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { width: '31.5%', aspectRatio: 1 },
  thumb: { width: '100%', height: '100%', borderRadius: radius.DEFAULT },
  thumbDelete: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  dashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderStyle: 'dashed',
  },

  notebook: {
    borderRadius: radius.DEFAULT,
    padding: 14,
    minHeight: 140,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  notebookFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
});
