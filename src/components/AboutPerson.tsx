import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { PhotoViewer } from '@/components/PhotoViewer';
import { useAuth } from '@/context/AuthContext';
import { usePeople } from '@/context/PeopleContext';
import { pickPhoto, uploadPhoto } from '@/utils/avatars';
import { GIFT_IDEA, MEMORY, NOTEBOOK, isLegacyNote } from '@/utils/notes';
import type { Note, Person } from '@/data/mock';

// A gift idea is a line, not an essay — the cap is what keeps the list
// scannable.
const GIFT_MAX_LENGTH = 120;

type Props = {
  person: Person;
  onDeleteNote: (noteId: string) => void;
};

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.stackSm }}>
      <View style={styles.sectionHead}>
        <Icon name={icon as any} size={16} color={colors.tertiary} />
        <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ letterSpacing: 1 }}>
          {title.toUpperCase()}
        </Txt>
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
  const notes = person.notes ?? [];
  const gifts = notes.filter((n) => !n.photoUrl && n.kind === GIFT_IDEA);
  const photos = notes.filter((n) => !!n.photoUrl);
  const notebookNote = notes.find((n) => n.kind === NOTEBOOK);
  const legacy = notes.filter(isLegacyNote).filter((n) => n.kind !== GIFT_IDEA);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Icon name="auto-stories" size={24} color={colors.tertiary} />
        <Txt variant="headlineMd" color={colors.onSurface}>About {person.name}</Txt>
      </View>

      <View style={{ gap: spacing.stackLg }}>
        <Section icon="card-giftcard" title="Gift Ideas">
          <GiftIdeas person={person} gifts={gifts} onDelete={onDeleteNote} />
        </Section>

        <Section icon="photo-library" title="Memories">
          <Memories person={person} photos={photos} onDelete={onDeleteNote} />
        </Section>

        <Section icon="menu-book" title="Notebook">
          <Notebook person={person} note={notebookNote} legacy={legacy} onDeleteLegacy={onDeleteNote} />
        </Section>
      </View>
    </View>
  );
}

// --- Gift ideas --------------------------------------------------------------

function GiftIdeas({ person, gifts, onDelete }: { person: Person; gifts: Note[]; onDelete: (id: string) => void }) {
  const { addNoteToPerson } = usePeople();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <View style={{ gap: spacing.stackSm }}>
      {gifts.length === 0 ? (
        <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={styles.empty}>
          Nothing yet. Anything they mention wanting, jot it here — a line is enough.
        </Txt>
      ) : (
        <View style={{ gap: 8 }}>
          {gifts.map((gift) => (
            <View key={gift.id} style={styles.giftRow}>
              <Icon name="card-giftcard" size={16} color={colors.tertiary} style={{ marginTop: 2 }} />
              {/* minWidth 0 is what actually lets the row shrink — without it a
                  single long unbroken word pushes straight out of the card. */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="bodyMd" color={colors.onSurface}>{gift.body}</Txt>
              </View>
              <Pressable onPress={() => onDelete(gift.id)} hitSlop={8}>
                <Icon name="close" size={16} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.giftInputRow}>
        <TextInput
          value={body}
          onChangeText={setBody}
          maxLength={GIFT_MAX_LENGTH}
          placeholder="e.g., that camera lens she mentioned"
          placeholderTextColor={colors.outline}
          style={styles.giftInput}
          returnKeyType="done"
          onSubmitEditing={add}
          editable={!busy}
        />
        <Pressable
          onPress={add}
          disabled={!trimmed || busy}
          style={({ pressed }) => [styles.giftAddBtn, (!trimmed || busy) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
        >
          <Icon name="add" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

// --- Memories ----------------------------------------------------------------

function Memories({ person, photos, onDelete }: { person: Person; photos: Note[]; onDelete: (id: string) => void }) {
  const { user } = useAuth();
  const { addNoteToPerson } = usePeople();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Note | null>(null);

  const addPhoto = async () => {
    if (busy) return;
    if (!user) {
      setError('You need to be signed in to add a photo.');
      return;
    }
    setError(null);

    try {
      const picked = await pickPhoto();
      if (picked.status === 'denied') {
        setError('Kindred needs access to your photos to add a memory.');
        return;
      }
      if (picked.status === 'cancelled') return;

      setBusy(true);
      const url = await uploadPhoto(user.id, picked.base64, picked.mimeType, `memory-${person.id}`);
      // The body stays empty: a memory here is the picture, nothing else.
      await addNoteToPerson(person.id, MEMORY, '', undefined, url);
    } catch (e) {
      console.error('Failed to add memory:', e);
      setError('Could not upload that photo. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.stackSm }}>
      {photos.length === 0 ? (
        <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={styles.empty}>
          No photos yet. Pictures of the two of you, things you did together.
        </Txt>
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
                <Image source={{ uri: photo.photoUrl }} style={styles.thumb} contentFit="cover" transition={150} />
              </Pressable>
              <Pressable onPress={() => onDelete(photo.id)} hitSlop={6} style={styles.thumbDelete}>
                <Icon name="close" size={14} color={colors.onPrimary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {error && (
        <Txt variant="labelSm" color={colors.error} style={{ fontWeight: 'normal' }}>{error}</Txt>
      )}

      <Pressable
        onPress={addPhoto}
        disabled={busy}
        style={({ pressed }) => [styles.dashedBtn, pressed && { opacity: 0.8 }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Icon name="add-a-photo" size={18} color={colors.primary} />
            <Txt variant="labelMd" color={colors.primary}>Add a photo</Txt>
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

function Notebook({
  person,
  note,
  legacy,
  onDeleteLegacy,
}: {
  person: Person;
  note?: Note;
  legacy: Note[];
  onDeleteLegacy: (id: string) => void;
}) {
  const { saveNotebook } = usePeople();
  const [body, setBody] = useState(note?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Pull in whatever the server has whenever it changes underneath — but not
  // while the user is mid-edit, which is what the dirty check protects.
  useEffect(() => {
    setBody((current) => (current === '' ? note?.body ?? '' : current));
  }, [note?.body]);

  const dirty = body !== (note?.body ?? '');

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await saveNotebook(person.id, body, note?.id);
      setSavedAt(Date.now());
    } catch (e) {
      console.error('Failed to save notebook:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: spacing.stackSm }}>
      <TextInput
        multiline
        value={body}
        onChangeText={setBody}
        placeholder={`Anything about ${person.name} — sizes, allergies, what they love, what they said last time.`}
        placeholderTextColor={colors.outline}
        style={styles.notebook}
        textAlignVertical="top"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal', opacity: 0.8 }}>
          {dirty ? 'Unsaved changes' : savedAt ? 'Saved' : 'Your notebook for them'}
        </Txt>
        <Pressable
          onPress={save}
          disabled={!dirty || saving}
          style={({ pressed }) => [styles.saveBtn, (!dirty || saving) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
        >
          <Icon name="check" size={16} color={colors.onPrimary} />
          <Txt variant="labelMd" color={colors.onPrimary}>{saving ? 'Saving…' : 'Save'}</Txt>
        </Pressable>
      </View>

      {/* Notes written under the old tagged-note system. Nothing is migrated
          automatically — they're shown here so they can be copied across or
          cleared out deliberately. */}
      {legacy.length > 0 && (
        <View style={{ marginTop: spacing.stackMd, gap: 8 }}>
          <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ letterSpacing: 1 }}>
            EARLIER NOTES
          </Txt>
          {legacy.map((n) => (
            <View key={n.id} style={styles.legacyRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal', opacity: 0.7 }}>
                  {n.when}
                </Txt>
                <Txt variant="bodyMd" color={colors.onSurface}>{n.body}</Txt>
              </View>
              <Pressable onPress={() => onDeleteLegacy(n.id)} hitSlop={8}>
                <Icon name="delete-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 24,
    ...ambientShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    paddingBottom: 12,
    marginBottom: 16,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    paddingBottom: 6,
  },
  empty: { fontStyle: 'italic', opacity: 0.9, paddingVertical: 4 },

  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.inverseOnSurface,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(215,193,193,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  giftInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  giftInput: {
    flex: 1,
    backgroundColor: 'rgba(228,226,225,0.35)',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurface,
  },
  giftAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { width: '31.5%', aspectRatio: 1 },
  thumb: { width: '100%', height: '100%', borderRadius: radius.DEFAULT, backgroundColor: colors.surfaceContainerHigh },
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
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },

  notebook: {
    backgroundColor: 'rgba(228,226,225,0.3)',
    borderRadius: radius.DEFAULT,
    padding: 14,
    minHeight: 200,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurface,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  legacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.inverseOnSurface,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(215,193,193,0.3)',
    padding: 12,
  },
});
