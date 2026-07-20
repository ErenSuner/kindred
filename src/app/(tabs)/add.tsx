import { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SearchBar } from '@/components/SearchBar';
import { FormError } from '@/components/FormError';
import { NotePreview } from '@/components/NotePreview';
import { usePeople } from '@/context/PeopleContext';
import { searchPeople } from '@/utils/search';
import type { Person } from '@/data/mock';

export default function Connections() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { people, togglePin, removePersonWithUndo, loadError, refreshPeople } = usePeople();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const hits = useMemo(() => (searching ? searchPeople(people, query) : []), [people, query, searching]);

  // The row's ⋯ button and a long-press both land here — pin and delete must
  // be findable without knowing the gesture.
  const openActions = (person: Person) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  const handleTogglePin = async () => {
    if (!selectedPerson) return;
    setModalVisible(false);
    await togglePin(selectedPerson.id, !selectedPerson.isPinned);
  };

  const handleDeletePress = () => {
    setModalVisible(false);
    setDeleteConfirmVisible(true);
  };

  const executeDelete = () => {
    if (!selectedPerson) return;
    setDeleteConfirmVisible(false);
    removePersonWithUndo(selectedPerson);
  };

  const personRow = (person: Person) => (
    <Card
      onPress={() => router.push(`/person/${person.id}`)}
      style={styles.personCard}
    >
      <View style={styles.personLeft}>
        <Avatar uri={person.avatar} initials={person.initials} size={52} />
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt variant="bodySemi" numberOfLines={1}>{person.name}</Txt>
            {person.isPinned && <Icon name="push-pin" size={15} color={c.flameDeep} />}
          </View>
          <Chip label={person.eventTag} />
        </View>
      </View>

      <View style={styles.personRight}>
        {person.specialDays && person.specialDays.length > 0 && (
          <View
            style={[
              styles.daysChip,
              { backgroundColor: person.daysAway === 0 ? c.flameWash : c.surfaceAlt },
            ]}
          >
            <Txt
              variant="num"
              color={person.daysAway === 0 ? c.flameDeep : c.muted}
              style={{ fontSize: 13, lineHeight: 17 }}
            >
              {person.daysAway === 0
                ? 'Today'
                : person.daysAway === 1
                ? 'Tomorrow'
                : `${person.daysAway} days`}
            </Txt>
          </View>
        )}
        <Pressable
          onPress={() => openActions(person)}
          hitSlop={8}
          style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}
        >
          <Icon name="more-horiz" size={20} color={c.faint} />
        </Pressable>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 130,
          gap: spacing.stackMd,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Title row with the two ways in: importing is the faster path for
            most people, so it sits beside the manual one, quieter. */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.titleRow}>
          <Txt variant="display" style={{ flex: 1 }}>People</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/import-contacts' as any)}
              style={({ pressed }) => [
                styles.headerBtn,
                { borderWidth: 1, borderColor: c.lineStrong },
                pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Icon name="contacts" size={17} color={c.muted} />
              <Txt variant="label" color={c.muted}>Import</Txt>
            </Pressable>

            <Pressable
              onPress={() => router.push('/new-connection')}
              style={({ pressed }) => [
                styles.headerBtn,
                { backgroundColor: c.flame },
                pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Icon name="person-add" size={17} color={c.onFlame} />
              <Txt variant="label" color={c.onFlame}>New</Txt>
            </Pressable>
          </View>
        </Animated.View>

        <FormError message={loadError} onRetry={refreshPeople} retryLabel="Retry" />

        {/* Browsing birthdays by month is a view onto these same people, so its
            way in lives here rather than as a shortcut competing on Home. A
            surface row, like the person cards below — not a heavy amber bar. */}
        {people.length > 0 && (
          <Card onPress={() => router.push('/birthdays')} style={styles.birthdaysStrip}>
            <View style={[styles.birthdaysIcon, { backgroundColor: c.flameWash }]}>
              <Icon name="cake" size={18} color={c.flameDeep} />
            </View>
            <Txt variant="bodyMed" style={{ flex: 1 }}>Birthdays by month</Txt>
            <Icon name="chevron-right" size={20} color={c.faint} />
          </Card>
        )}

        {/* Search — hidden until there's something to search through */}
        {people.length > 0 && (
          <SearchBar value={query} onChange={setQuery} placeholder="Search people, days, notes" />
        )}

        {/* Search results replace the list while a query is active */}
        {searching && (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.stackSm }}>
            <Txt variant="eyebrow" color={c.faint}>
              {hits.length === 0
                ? 'No matches'
                : `${hits.length} ${hits.length === 1 ? 'result' : 'results'}`}
            </Txt>

            {hits.length === 0 ? (
              <View style={styles.noResults}>
                <Icon name="search-off" size={32} color={c.lineStrong} />
                <Txt variant="body" color={c.muted} style={{ marginTop: 12, textAlign: 'center' }}>
                  Nothing matches &ldquo;{query.trim()}&rdquo;.
                </Txt>
                <Txt variant="sub" color={c.faint} style={{ marginTop: 6, textAlign: 'center' }}>
                  Try a name, an occasion, or something you wrote in a note.
                </Txt>
              </View>
            ) : (
              hits.map((hit) => {
                if (hit.kind === 'person') {
                  return (
                    <Pressable
                      key={`person-${hit.id}`}
                      onPress={() => { Keyboard.dismiss(); router.push(`/person/${hit.id}`); }}
                      onLongPress={() => openActions(hit.person)}
                    >
                      {personRow(hit.person)}
                    </Pressable>
                  );
                }

                const { day, person } = hit;
                return (
                  <Card
                    key={`day-${hit.id}`}
                    onPress={() => {
                      Keyboard.dismiss();
                      if (day.isBirthday) {
                        router.push({ pathname: '/birthday/edit/[personId]', params: { personId: person.id } } as any);
                      } else {
                        router.push({ pathname: '/special-day/edit/[dayId]', params: { dayId: day.id, personId: person.id } } as any);
                      }
                    }}
                    style={styles.dayCard}
                  >
                    <View style={[styles.dayIcon, { backgroundColor: c.flameWash }]}>
                      <Icon name={day.icon as any} size={20} color={c.flameDeep} />
                    </View>
                    <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                      <Txt variant="bodyMed">{day.title}</Txt>
                      <Txt variant="sub" color={c.muted}>
                        {person.name} · {day.date}
                      </Txt>
                      {hit.matchedOn === 'note' && day.notes && day.notes.length > 0 && (
                        <View style={{ marginTop: 4 }}>
                          <NotePreview notes={day.notes} lines={1} compact />
                        </View>
                      )}
                    </View>
                    {typeof day.daysAway === 'number' && (
                      <View
                        style={[
                          styles.daysChip,
                          { backgroundColor: day.daysAway === 0 ? c.flameWash : c.surfaceAlt },
                        ]}
                      >
                        <Txt
                          variant="num"
                          color={day.daysAway === 0 ? c.flameDeep : c.muted}
                          style={{ fontSize: 13, lineHeight: 17 }}
                        >
                          {day.daysAway === 0 ? 'Today' : `${day.daysAway} days`}
                        </Txt>
                      </View>
                    )}
                  </Card>
                );
              })
            )}
          </Animated.View>
        )}

        {/* Empty state — suppressed on a failed load, where an empty list means
            "couldn't fetch", not "you have nobody". */}
        {!searching && people.length === 0 && !loadError && (
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.emptyState}>
            <Icon name="people" size={44} color={c.lineStrong} />
            <Txt variant="heading" style={{ marginTop: 16, textAlign: 'center' }}>
              Nobody here yet
            </Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
              Add someone you care about, or import them from your contacts.
            </Txt>
          </Animated.View>
        )}

        {/* People list */}
        {!searching && people.map((person, index) => (
          <Animated.View
            key={person.id}
            entering={FadeInDown.duration(400).delay(80 + index * 50)}
          >
            <Pressable
              onPress={() => router.push(`/person/${person.id}`)}
              onLongPress={() => openActions(person)}
            >
              {personRow(person)}
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Action sheet */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlay }]} onPress={() => setModalVisible(false)}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            {selectedPerson && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 24, gap: 12 }}>
                  <Avatar uri={selectedPerson.avatar} initials={selectedPerson.initials} size={64} />
                  <Txt variant="heading">{selectedPerson.name}</Txt>
                </View>

                <View style={{ gap: 12, width: '100%' }}>
                  <Button
                    variant="quiet"
                    icon="push-pin"
                    label={selectedPerson.isPinned ? 'Unpin from top' : 'Pin to top'}
                    onPress={handleTogglePin}
                  />
                  <Button
                    variant="danger"
                    icon="delete-outline"
                    label="Delete person"
                    onPress={handleDeletePress}
                  />
                </View>
              </>
            )}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={[styles.deleteModalOverlay, { backgroundColor: c.overlay }]}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.deleteModalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="delete-outline" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>Delete person</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              This removes {selectedPerson?.name} along with their days and notes. You&apos;ll have a
              moment to undo it.
            </Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label="Cancel" onPress={() => setDeleteConfirmVisible(false)} variant="quiet" style={{ flex: 1 }} />
              <Button label="Delete" onPress={executeDelete} variant="dangerSolid" style={{ flex: 1 }} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.stackSm,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  birthdaysStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  birthdaysIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackXl * 2,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  personRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  moreBtn: {
    padding: 4,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  dayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackXl,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  deleteModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  deleteModalContent: {
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
