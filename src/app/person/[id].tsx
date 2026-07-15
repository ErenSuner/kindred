import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { colors, spacing, radius, ambientShadow, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { usePeople } from '@/context/PeopleContext';
import type { SpecialDay } from '@/data/mock';

const accentMap = {
  primary: { bg: 'rgba(217,142,142,0.3)', fg: colors.primary },
  tertiary: { bg: 'rgba(207,151,83,0.3)', fg: colors.tertiary },
  secondary: { bg: 'rgba(206,234,207,0.5)', fg: colors.secondary },
};

const NOTE_KINDS = ['Gift Idea', 'Memory', 'Reminder', 'Other'];

function SpecialDayRow({ day, personId }: { day: SpecialDay, personId: string }) {
  const router = useRouter();
  const a = accentMap[day.accent as keyof typeof accentMap] || accentMap.primary;
  return (
    <Pressable 
      style={({ pressed }) => [styles.dayRow, pressed && { backgroundColor: colors.surfaceContainerLow }]}
      onPress={() => router.push({ pathname: '/special-day/edit/[dayId]', params: { dayId: day.id, personId } } as any)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
        <View style={[styles.dayIcon, { backgroundColor: a.bg }]}>
          <Icon name={day.icon as any} size={22} color={a.fg} />
        </View>
        <View>
          <Txt variant="bodyMd" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
            {day.title}{day.turningAge ? ` (Turning ${day.turningAge})` : ''}
          </Txt>
          <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontFamily: 'Inter_400Regular' }}>
            {day.date}
          </Txt>
        </View>
      </View>
      <Icon name="chevron-right" size={22} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
    </Pressable>
  );
}

export default function PersonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getPerson, removePerson, addNoteToPerson } = usePeople();
  
  const person = getPerson(id ?? '');

  // Add Note state
  const [noteBody, setNoteBody] = useState('');
  const [noteKind, setNoteKind] = useState('Gift Idea');
  const [loadingNote, setLoadingNote] = useState(false);

  // Delete state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  if (!person) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.header, { paddingTop: insets.top + 8, position: 'absolute', top: 0, left: 0, right: 0 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="arrow-back" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
          <Txt variant="headlineMd" color={colors.primary}>
            Kindred
          </Txt>
          <View style={{ width: 24 }} />
        </View>
        <Icon name="person-off" size={48} color={colors.outlineVariant} />
        <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
          Person not found
        </Txt>
        <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8 }}>
          This connection may have been removed.
        </Txt>
      </View>
    );
  }

  const handleDelete = () => {
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    try {
      await removePerson(person.id);
      router.back();
    } catch (e) {
      console.error('Failed to delete person:', e);
    }
  };

  const handleAddNote = async () => {
    if (!noteBody.trim()) return;
    setLoadingNote(true);
    try {
      await addNoteToPerson(person.id, noteKind, noteBody.trim());
      setNoteBody('');
    } catch (e) {
      console.error('Failed to add note:', e);
    } finally {
      setLoadingNote(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={colors.onSurfaceVariant} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary}>
          Kindred
        </Txt>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Icon name="delete" size={24} color={colors.error} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => router.push(('/edit/' + person.id) as any)}>
            <Icon name="edit" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: spacing.stackMd,
          paddingBottom: insets.bottom + spacing.stackXl,
          gap: spacing.stackLg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile header */}
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
          {person.avatar ? (
            <Image source={{ uri: person.avatar }} style={styles.bigAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.bigAvatar, styles.bigInitials]}>
              <Txt variant="headlineXl" color={colors.onPrimaryContainer}>
                {person.initials}
              </Txt>
            </View>
          )}
          <Txt variant="headlineXl" color={colors.onSurface} style={{ marginTop: 16 }}>
            {person.name}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Icon name="favorite" size={20} color={colors.secondary} />
            <Txt variant="bodyLg" color={colors.onSurfaceVariant}>
              {person.role}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {person.tags.map((t) => (
              <Chip key={t} label={t} tone={t === 'Local' ? 'tertiary' : 'primary'} />
            ))}
          </View>
        </Animated.View>

        {/* Countdown */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.countdownCard}>
          <View style={[styles.blur, { pointerEvents: 'none' } as any]} />
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="celebration" size={24} color={colors.primary} />
              <Txt variant="headlineMd" color={colors.onSurface}>
                Next Big Day
              </Txt>
            </View>
            {person.countdown && <Chip label={person.countdown.tag} tone="primarySolid" />}
          </View>
          
          {person.countdown ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 16 }}>
                <Txt style={styles.bigNumber} color={colors.primary}>
                  {person.countdown.days}
                </Txt>
                <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginBottom: 8 }}>
                  days away
                </Txt>
              </View>
              <View style={{ marginTop: 8 }}>
                <Txt variant="bodyMd" color={colors.onSurface}>
                  {person.countdown.title}
                </Txt>
                <Txt variant="labelMd" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
                  {person.countdown.date}
                </Txt>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${person.countdown.progress * 100}%` }]} />
              </View>
            </>
          ) : (
            <View style={{ marginTop: 24, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: radius.md }}>
              <Txt variant="bodyLg" color={colors.onSurfaceVariant}>
                No upcoming events
              </Txt>
              <Txt variant="labelMd" color={colors.outline} style={{ marginTop: 4 }}>
                Add a special day to see the countdown
              </Txt>
            </View>
          )}
        </Animated.View>

        {/* Special Days */}
        <Animated.View entering={FadeInDown.duration(500).delay(180)} style={{ gap: spacing.stackMd }}>
          <View style={[styles.cardHeaderRow, styles.sectionHeading]}>
            <Txt variant="headlineMd" color={colors.onSurface}>
              Special Days
            </Txt>
          </View>
          
          {person.specialDays && person.specialDays.length > 0 ? (
            <View style={{ gap: spacing.stackSm }}>
              {person.specialDays.map((d) => (
                <SpecialDayRow key={d.id} day={d} personId={person.id} />
              ))}
            </View>
          ) : (
            <View style={{ padding: 20, alignItems: 'center', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, ...ambientShadow }}>
              <Txt variant="bodyMd" color={colors.onSurfaceVariant}>
                No special days added yet.
              </Txt>
            </View>
          )}

          <Button
            label="Add Special Day"
            icon="add"
            variant="tonal"
            onPress={() => router.push({ pathname: '/special-day/add', params: { personId: person.id } } as any)}
            style={{ marginTop: spacing.stackSm }}
          />
        </Animated.View>

        {/* Notes & Ideas */}
        <Animated.View entering={FadeInDown.duration(500).delay(260)} style={styles.notesCard}>
          <View style={[styles.cardHeaderRow, styles.notesHeader]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="edit-note" size={24} color={colors.tertiary} />
              <Txt variant="headlineMd" color={colors.onSurface}>
                Notes &amp; Ideas
              </Txt>
            </View>
          </View>

          {/* Existing notes list */}
          {person.notes && person.notes.length > 0 ? (
            <View style={{ gap: spacing.stackMd, marginBottom: 20 }}>
              {person.notes.map((n) => (
                <View key={n.id} style={styles.note}>
                  <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontFamily: 'Inter_400Regular', marginBottom: 8 }}>
                    {n.kind} • {n.when}
                  </Txt>
                  <Txt variant="bodyMd" color={colors.onSurface}>
                    {n.body}
                  </Txt>
                </View>
              ))}
            </View>
          ) : (
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: 20, fontStyle: 'italic' }}>
              No notes written down yet. Jot down gift ideas or memories!
            </Txt>
          )}

          {/* Note Input and Form */}
          <View style={{ gap: spacing.stackSm, borderTopWidth: 1, borderTopColor: colors.surfaceVariant, paddingTop: 16 }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ letterSpacing: 1 }}>
              ADD NEW NOTE
            </Txt>
            
            <View style={styles.chipWrap}>
              {NOTE_KINDS.map((k) => {
                const active = noteKind === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setNoteKind(k)}
                    style={[styles.selectChip, active && styles.selectChipActive]}
                  >
                    <Txt variant="labelSm" color={active ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
                      {k}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              placeholder="Jot down a thought..."
              placeholderTextColor={colors.outline}
              multiline
              value={noteBody}
              onChangeText={setNoteBody}
              style={styles.noteInput}
              editable={!loadingNote}
            />

            <Pressable
              onPress={handleAddNote}
              disabled={loadingNote || !noteBody.trim()}
              style={[styles.addNoteBtn, (!noteBody.trim() || loadingNote) && { opacity: 0.5 }]}
            >
              <Icon name="add" size={18} color={colors.primary} />
              <Txt variant="labelMd" color={colors.primary}>
                {loadingNote ? 'Adding...' : 'Add Note'}
              </Txt>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Icon name="delete" size={32} color={colors.error} />
            </View>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
              Delete Connection
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Are you sure you want to remove {person.name} from your connections? This action cannot be undone.
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
    backgroundColor: colors.background,
  },
  bigAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: colors.surfaceContainerLowest,
    ...ambientShadow,
  },
  bigInitials: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  countdownCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
    padding: 24,
    overflow: 'hidden',
    ...ambientShadow,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigNumber: { fontFamily: 'Literata_600SemiBold', fontSize: 64, lineHeight: 64 },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.full,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  blur: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(217,142,142,0.2)',
  },
  sectionHeading: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    paddingBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    ...ambientShadow,
  },
  dayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 24,
    ...ambientShadow,
  },
  notesHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    paddingBottom: 12,
    marginBottom: 24,
  },
  note: {
    backgroundColor: colors.inverseOnSurface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(215,193,193,0.3)',
  },
  noteInput: {
    marginTop: 12,
    backgroundColor: 'rgba(228,226,225,0.3)',
    borderRadius: radius.DEFAULT,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  selectChipActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  modalContent: {
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
