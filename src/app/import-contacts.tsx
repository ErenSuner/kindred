import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { SearchBar } from '@/components/SearchBar';
import { showHeld } from '@/components/HeldNotice';
import { useAuth } from '@/context/AuthContext';
import { usePeople } from '@/context/PeopleContext';
import { ImportableContact, loadContacts, readContactPhoto } from '@/utils/contacts';
import type { ImportEntry } from '@/lib/peopleApi';
import { uploadPhoto } from '@/utils/avatars';
import { formatOccurrenceDate } from '@/utils/dates';
import { serializeNudges } from '@/utils/nudges';
import { normalize } from '@/utils/search';
import type { Relationship } from '@/data/mock';

// What an imported person gets until the user says otherwise. Every other
// relationship is a guess Kindred has no business making.
const DEFAULT_ROLE: Relationship = 'Friend';

// How many contact photos to read and upload at once. Enough to stop fifty
// contacts taking fifty round trips, small enough not to swamp a phone
// connection.
const PHOTO_BATCH = 5;

// Imported birthdays get the same two reminders a hand-added one does.
const DEFAULT_NUDGES = [
  { type: 'preset' as const, label: '1 week before', value: '1_week' },
  { type: 'preset' as const, label: '1 day before', value: '1_day' },
];

function birthdayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const formatted = formatOccurrenceDate(new Date(y, m - 1, d));
  // A contact with no birth year still has a day worth knowing; drop the
  // placeholder year rather than claiming they were born in the year 1000.
  return y <= 1000 ? formatted.replace(/,\s*\d+$/, '') : formatted;
}

export default function ImportContacts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useAuth();
  const { people, importPeople } = usePeople();

  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [contacts, setContacts] = useState<ImportableContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Someone already in Kindred shouldn't be offered again — importing them
  // twice is the most obvious way to end up with a duplicate.
  const existingNames = useMemo(
    () => new Set(people.map((p) => normalize(p.name))),
    [people],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await loadContacts();
        if (cancelled) return;

        if (result.status === 'denied') {
          setDenied(true);
        } else {
          setContacts(result.contacts);
        }
      } catch (e) {
        console.error('Could not read contacts', e);
        if (!cancelled) setError("Couldn't read your contacts. Try again in a moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = normalize(query);
    return contacts.filter((contact) => {
      if (existingNames.has(normalize(contact.name))) return false;
      return !q || normalize(contact.name).includes(q);
    });
  }, [contacts, query, existingNames]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const withBirthdays = visible.filter((contact) => contact.birthday);
  const selectAllWithBirthdays = () => {
    setSelected(new Set(withBirthdays.map((contact) => contact.id)));
  };

  const handleImport = async () => {
    if (!user || selected.size === 0) return;
    setError(null);
    setImporting(true);
    setProgress(0);

    const chosen = contacts.filter((contact) => selected.has(contact.id));
    const nudges = serializeNudges(DEFAULT_NUDGES);

    try {
      // Photos are the slow part and each one is independent, so they go up a
      // few at a time. A photo that fails costs a picture, not the person.
      const entries: ImportEntry[] = [];

      for (let i = 0; i < chosen.length; i += PHOTO_BATCH) {
        const batch = chosen.slice(i, i + PHOTO_BATCH);
        const uploaded = await Promise.all(
          batch.map(async (contact) => {
            let avatarUrl: string | null = null;
            try {
              if (contact.imageUri) {
                const base64 = await readContactPhoto(contact.imageUri);
                if (base64) {
                  avatarUrl = await uploadPhoto(user.id, base64, 'image/jpeg', `contact-${contact.id}`);
                }
              }
            } catch (e) {
              console.warn(`Could not upload photo for ${contact.name}`, e);
            }

            return {
              name: contact.name,
              role: DEFAULT_ROLE,
              avatarUrl,
              contactId: contact.id,
              birthday: contact.birthday,
              birthdayNudges: contact.birthday ? nudges : undefined,
            };
          }),
        );

        entries.push(...uploaded);
        setProgress(entries.length);
      }

      // One insert for everyone, one for their birthdays, one reload. Doing it
      // person by person cost two full reloads each.
      const count = await importPeople(entries);
      router.back();
      showHeld(
        `${count} ${count === 1 ? 'person' : 'people'} in your circle`,
        'Their birthdays are remembered — reminders are set',
      );
    } catch (e) {
      console.error('Import failed', e);
      setError("Couldn't add them. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Icon name="arrow-back" size={24} color={c.muted} />
      </Pressable>
      <Txt variant="title" style={{ flex: 1, textAlign: 'center', marginRight: 24 }}>
        From Contacts
      </Txt>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {header}
        <View style={styles.centered}>
          <Icon name="contacts" size={40} color={c.lineStrong} />
          <Txt variant="body" color={c.muted} style={styles.centeredText}>
            Contacts are only available in the Kindred app on your phone.
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.flame} />
          <Txt variant="body" color={c.muted} style={styles.centeredText}>
            Reading your contacts…
          </Txt>
        </View>
      ) : denied ? (
        <View style={styles.centered}>
          <Icon name="lock" size={40} color={c.lineStrong} />
          <Txt variant="heading" style={{ marginTop: 16 }}>
            No access to contacts
          </Txt>
          <Txt variant="body" color={c.muted} style={styles.centeredText}>
            Kindred can&apos;t read your address book. You can allow it in your phone&apos;s settings, or
            add people by hand instead.
          </Txt>
          <Button
            label="Add someone by hand"
            variant="quiet"
            style={{ marginTop: 24 }}
            onPress={() => router.replace('/new-connection' as any)}
          />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: spacing.containerMobile, gap: spacing.stackSm }}>
            <SearchBar value={query} onChange={setQuery} placeholder="Search contacts" />

            <View style={styles.summaryRow}>
              <Txt variant="sub" color={c.muted}>
                {selected.size > 0
                  ? `${selected.size} selected`
                  : `${visible.length} ${visible.length === 1 ? 'contact' : 'contacts'}`}
              </Txt>

              {withBirthdays.length > 0 && selected.size === 0 && (
                <Pressable onPress={selectAllWithBirthdays} hitSlop={8}>
                  <Txt variant="label" color={c.flameDeep}>
                    Select all {withBirthdays.length} with birthdays
                  </Txt>
                </Pressable>
              )}

              {selected.size > 0 && (
                <Pressable onPress={() => setSelected(new Set())} hitSlop={8}>
                  <Txt variant="label" color={c.flameDeep}>Clear</Txt>
                </Pressable>
              )}
            </View>
          </View>

          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: spacing.containerMobile,
              paddingTop: spacing.stackSm,
              paddingBottom: insets.bottom + 140,
              gap: 8,
            }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Txt variant="body" color={c.muted} style={styles.emptyList}>
                {query
                  ? 'No contacts match that.'
                  : 'Everyone in your address book is already in Kindred.'}
              </Txt>
            }
            renderItem={({ item }) => {
              const on = selected.has(item.id);
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  disabled={importing}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: c.surface, borderColor: c.line },
                    on && { borderColor: c.flame, backgroundColor: c.flameWash },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={[styles.avatar, { backgroundColor: c.surfaceAlt }]} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: c.surfaceAlt }]}>
                      <Txt variant="subMed" color={c.muted}>{item.initials}</Txt>
                    </View>
                  )}

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="bodyMed">{item.name}</Txt>
                    {item.birthday ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Icon name="cake" size={12} color={c.flameDeep} />
                        <Txt variant="sub" color={c.muted}>
                          {birthdayLabel(item.birthday)}
                        </Txt>
                      </View>
                    ) : (
                      <Txt variant="sub" color={c.faint} style={styles.noBirthday}>
                        No birthday saved
                      </Txt>
                    )}
                  </View>

                  <Icon
                    name={on ? 'check-circle' : 'radio-button-unchecked'}
                    size={22}
                    color={on ? c.flameDeep : c.lineStrong}
                  />
                </Pressable>
              );
            }}
          />

          {selected.size > 0 && (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={[
                styles.footer,
                { backgroundColor: c.bg, borderTopColor: c.line, paddingBottom: insets.bottom + 16 },
              ]}
            >
              <FormError message={error} />
              <Button
                label={
                  importing
                    ? progress < selected.size
                      ? `Preparing ${progress} of ${selected.size}…`
                      : 'Adding…'
                    : `Add ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`
                }
                icon="person-add"
                fullWidth
                disabled={importing}
                onPress={handleImport}
              />
              <Txt variant="sub" color={c.faint} style={styles.footerNote}>
                Names, photos and birthdays only. Phone numbers are never read.
              </Txt>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  centeredText: { textAlign: 'center', marginTop: 12, maxWidth: 300, lineHeight: 22 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBirthday: { opacity: 0.7, marginTop: 2 },
  emptyList: { textAlign: 'center', marginTop: 40, fontStyle: 'italic', opacity: 0.8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.containerMobile,
    paddingTop: 16,
    gap: 8,
    borderTopWidth: 1,
  },
  footerNote: { textAlign: 'center', opacity: 0.8 },
});
