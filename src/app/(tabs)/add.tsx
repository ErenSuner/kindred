import { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { SearchBar } from '@/components/SearchBar';
import { FormError } from '@/components/FormError';
import { NotePreview } from '@/components/NotePreview';
import { usePeople } from '@/context/PeopleContext';
import { searchPeople } from '@/utils/search';
import type { Person } from '@/data/mock';

export default function Connections() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { people, togglePin, removePerson, loadError, refreshPeople } = usePeople();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const hits = useMemo(() => (searching ? searchPeople(people, query) : []), [people, query, searching]);

  const handleLongPress = (person: Person) => {
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

  const executeDelete = async () => {
    if (!selectedPerson) return;
    setDeleteConfirmVisible(false);
    await removePerson(selectedPerson.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Txt variant="headlineMd" color={colors.primary}>
          Connections
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: spacing.stackMd,
          paddingBottom: insets.bottom + 120,
          gap: spacing.stackMd,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Subtitle & Add Button */}
        <Animated.View entering={FadeInDown.duration(500)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ flex: 1, paddingRight: 16 }}>
            Your circle of people who matter most.
          </Txt>
          <Pressable
            onPress={() => router.push('/new-connection')}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primaryContainer,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: radius.full,
                gap: 6
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
            ]}
          >
            <Icon name="person-add" size={18} color={colors.onPrimaryContainer} />
            <Txt variant="labelSm" color={colors.onPrimaryContainer}>
              New
            </Txt>
          </Pressable>
        </Animated.View>

        <FormError message={loadError} onRetry={refreshPeople} retryLabel="Retry" />

        {/* Search — hidden until there's something to search through */}
        {people.length > 0 && (
          <SearchBar value={query} onChange={setQuery} placeholder="Search people, days, notes" />
        )}

        {/* Search results replace the list while a query is active */}
        {searching && (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: spacing.stackMd }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant}>
              {hits.length === 0
                ? 'NO MATCHES'
                : `${hits.length} ${hits.length === 1 ? 'RESULT' : 'RESULTS'}`}
            </Txt>

            {hits.length === 0 ? (
              <View style={styles.noResults}>
                <Icon name="search-off" size={32} color={colors.outlineVariant} />
                <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 12, textAlign: 'center' }}>
                  Nothing matches &ldquo;{query.trim()}&rdquo;.
                </Txt>
                <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ marginTop: 6, textAlign: 'center', fontWeight: 'normal', opacity: 0.8 }}>
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
                      onLongPress={() => handleLongPress(hit.person)}
                      style={({ pressed }) => [styles.personCard, pressed && { transform: [{ scale: 0.98 }], shadowOpacity: 0.04 }]}
                    >
                      <View style={styles.personLeft}>
                        <Avatar uri={hit.person.avatar} initials={hit.person.initials} size={52} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Txt variant="bodyLg" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                              {hit.person.name}
                            </Txt>
                            {hit.person.isPinned && <Icon name="push-pin" size={16} color={colors.primary} />}
                          </View>
                          <Chip label={hit.person.eventTag} tone="secondary" role={hit.person.eventTag} />
                        </View>
                      </View>
                      <Icon name="chevron-right" size={22} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                    </Pressable>
                  );
                }

                const { day, person } = hit;
                return (
                  <Pressable
                    key={`day-${hit.id}`}
                    onPress={() => {
                      Keyboard.dismiss();
                      if (day.isBirthday) {
                        router.push({ pathname: '/birthday/edit/[personId]', params: { personId: person.id } } as any);
                      } else {
                        router.push({ pathname: '/special-day/edit/[dayId]', params: { dayId: day.id, personId: person.id } } as any);
                      }
                    }}
                    style={({ pressed }) => [styles.dayCard, pressed && { transform: [{ scale: 0.98 }], shadowOpacity: 0.04 }]}
                  >
                    <View style={styles.dayIcon}>
                      <Icon name={day.icon as any} size={20} color={colors.onPrimaryContainer} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="bodyMd" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                        {day.title}
                      </Txt>
                      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal' }}>
                        {person.name} · {day.date}
                      </Txt>
                      {hit.matchedOn === 'note' && day.notes && day.notes.length > 0 && (
                        <View style={{ marginTop: 4 }}>
                          <NotePreview notes={day.notes} lines={1} compact />
                        </View>
                      )}
                    </View>
                    {typeof day.daysAway === 'number' && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Txt variant="bodyLg" color={colors.primary} style={{ fontFamily: 'Inter_500Medium' }}>
                          {day.daysAway === 0 ? 'Today!' : day.daysAway}
                        </Txt>
                        {day.daysAway !== 0 && (
                          <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal' }}>days</Txt>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </Animated.View>
        )}

        {/* Empty state — suppressed on a failed load, where an empty list means
            "couldn't fetch", not "you have nobody". */}
        {!searching && people.length === 0 && !loadError && (
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.emptyState}>
            <Icon name="people" size={48} color={colors.outlineVariant} />
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16, textAlign: 'center' }}>
              No connections yet
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
              Add someone special to start tracking the moments that matter.
            </Txt>
          </Animated.View>
        )}

        {/* People list */}
        {!searching && people.map((person, index) => (
          <Animated.View
            key={person.id}
            entering={FadeInDown.duration(400).delay(100 + index * 60)}
          >
            <Pressable
              onPress={() => router.push(`/person/${person.id}`)}
              onLongPress={() => handleLongPress(person)}
              style={({ pressed }) => [
                styles.personCard,
                pressed && { transform: [{ scale: 0.98 }], shadowOpacity: 0.04 },
              ]}
            >
              <View style={styles.personLeft}>
                <Avatar uri={person.avatar} initials={person.initials} size={52} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Txt variant="bodyLg" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                      {person.name}
                    </Txt>
                    {person.isPinned && <Icon name="push-pin" size={16} color={colors.primary} />}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Chip label={person.eventTag} tone="secondary" role={person.eventTag} />
                  </View>
                </View>
              </View>

              {/* Event preview */}
              <View style={styles.personRight}>
                {person.specialDays && person.specialDays.length > 0 ? (
                  <>
                    <Txt variant="headlineMd" color={colors.primary}>
                      {person.daysAway === 0 ? 'Today!' : person.daysAway}
                    </Txt>
                    {person.daysAway !== 0 && (
                      <Txt variant="labelSm" color={colors.onSurfaceVariant}>
                        days
                      </Txt>
                    )}
                  </>
                ) : (
                  <Icon name="chevron-right" size={22} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                )}
              </View>
            </Pressable>
          </Animated.View>
        ))}

      </ScrollView>

      {/* Action Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Animated.View entering={FadeInDown.duration(300)} style={styles.modalContent}>
            {selectedPerson && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 24, gap: 12 }}>
                  <Avatar uri={selectedPerson.avatar} initials={selectedPerson.initials} size={64} />
                  <Txt variant="headlineMd" color={colors.onSurface}>
                    {selectedPerson.name}
                  </Txt>
                </View>

                <View style={{ gap: 12, width: '100%' }}>
                  <Button
                    variant="tonal"
                    icon={selectedPerson.isPinned ? "push-pin" : "push-pin"}
                    label={selectedPerson.isPinned ? "Unpin from top" : "Pin to top"}
                    onPress={handleTogglePin}
                  />
                  <Button
                    variant="error"
                    icon="delete"
                    label="Delete connection"
                    onPress={handleDeletePress}
                    style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error }}
                  />
                </View>
              </>
            )}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={styles.deleteModalContent}>
            <View style={styles.modalIconWrap}>
              <Icon name="delete" size={32} color={colors.error} />
            </View>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
              Delete Connection
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Are you sure you want to remove {selectedPerson?.name} from your connections? This action cannot be undone.
            </Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label="Cancel" onPress={() => setDeleteConfirmVisible(false)} variant="tonal" style={{ flex: 1 }} />
              <Button label="Delete" onPress={executeDelete} style={{ flex: 1, backgroundColor: colors.error }} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingBottom: spacing.stackMd,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    ...softShadow,
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  personRight: {
    alignItems: 'flex-end',
    minWidth: 40,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    ...softShadow,
  },
  dayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackXl,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
    ...softShadow,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  deleteModalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...ambientShadow,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
