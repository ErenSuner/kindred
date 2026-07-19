import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut, FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, spacing, radius, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { usePeople } from '@/context/PeopleContext';
import { InlineBirthdayCard } from '@/components/InlineBirthdayCard';
import { NotePreview } from '@/components/NotePreview';
import { LookingBack } from '@/components/LookingBack';
import { PhotoViewer } from '@/components/PhotoViewer';
import { AboutPerson } from '@/components/AboutPerson';
import { openInContacts } from '@/utils/contacts';
import type { SpecialDay } from '@/data/mock';

const accentMap = {
  primary: { bg: 'rgba(217,142,142,0.3)', fg: colors.primary },
  tertiary: { bg: 'rgba(207,151,83,0.3)', fg: colors.tertiary },
  secondary: { bg: 'rgba(206,234,207,0.5)', fg: colors.secondary },
};

function SpecialDayRow({ day, personId, onLongPress }: { day: SpecialDay, personId: string, onLongPress?: () => void }) {
  const router = useRouter();
  const a = accentMap[day.accent as keyof typeof accentMap] || accentMap.primary;
  return (
    <Pressable 
      style={({ pressed }) => [styles.dayRow, pressed && { backgroundColor: colors.surfaceContainerLow }]}
      onLongPress={onLongPress}
      onPress={() => {
        if ((day as any).isBirthday) {
          router.push({ pathname: '/birthday/edit/[personId]', params: { personId } } as any);
        } else {
          router.push({ pathname: '/special-day/edit/[dayId]', params: { dayId: day.id, personId } } as any);
        }
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
        <View style={[styles.dayIcon, { backgroundColor: a.bg }]}>
          <Icon name={day.icon as any} size={22} color={a.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyMd" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
            {day.title}{day.turningAge ? ` (Turning ${day.turningAge})` : ''}
          </Txt>
          <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontFamily: 'Inter_400Regular' }}>
            {day.date}
          </Txt>
          {day.notes && day.notes.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <NotePreview notes={day.notes} lines={2} compact />
            </View>
          )}
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
  const { getPerson, removePersonWithUndo, deleteNoteWithUndo, deleteSpecialDayWithUndo } = usePeople();

  const person = getPerson(id ?? '');

  // Delete state
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [dayActionVisible, setDayActionVisible] = useState(false);
  const [dayConfirmVisible, setDayConfirmVisible] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const [photoVisible, setPhotoVisible] = useState(false);

  const [openingContact, setOpeningContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deleteNoteConfirmVisible, setDeleteNoteConfirmVisible] = useState(false);

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

  const executeDelete = () => {
    setDeleteConfirmVisible(false);
    removePersonWithUndo(person);
    router.back();
  };

  const handleOpenContact = async () => {
    if (!person?.contactId || openingContact) return;
    setContactError(null);
    setOpeningContact(true);
    try {
      const opened = await openInContacts(person.contactId);
      // A contact id only means something on the phone it came from, so a
      // restored backup will have ids that resolve to nothing.
      if (!opened) setContactError("They're no longer in this phone's contacts.");
    } finally {
      setOpeningContact(false);
    }
  };

  const confirmDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteNoteConfirmVisible(true);
  };

  const executeDeleteNote = () => {
    if (!noteToDelete) return;
    deleteNoteWithUndo(noteToDelete);
    setDeleteNoteConfirmVisible(false);
    setNoteToDelete(null);
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
            // Tapping opens the original, uncropped — the circle here hides how
            // the photo was actually framed.
            <Pressable
              onPress={() => setPhotoVisible(true)}
              style={({ pressed }) => pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }}
            >
              <Image source={{ uri: person.avatar }} style={styles.bigAvatar} contentFit="cover" />
            </Pressable>
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
              <Chip key={t} label={t} tone={t === 'Local' ? 'tertiary' : 'primary'} role={t} />
            ))}
          </View>

          {/* Kindred holds no way to reach anyone. This hands the phone back its
              own contact id so calling and messaging happen where they already
              live. Only appears for someone imported from the address book. */}
          {person.contactId && Platform.OS !== 'web' && (
            <Pressable
              onPress={handleOpenContact}
              disabled={openingContact}
              style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.8 }]}
            >
              <Icon name="person-search" size={18} color={colors.primary} />
              <Txt variant="labelMd" color={colors.primary}>
                {openingContact ? 'Opening…' : 'Open in Contacts'}
              </Txt>
            </Pressable>
          )}

          {contactError && (
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.contactError}>
              {contactError}
            </Txt>
          )}
        </Animated.View>

        {/* Countdown */}
        {person.countdown && (
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.countdownCard}>
            <View style={[styles.blur, { pointerEvents: 'none' } as any]} />
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="celebration" size={24} color={colors.primary} />
                <Txt variant="headlineMd" color={colors.onSurface}>
                  Next Big Day
                </Txt>
              </View>
              <Chip label={person.countdown.tag} tone="primarySolid" />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 16 }}>
              <Txt style={styles.bigNumber} color={colors.primary}>
                {person.countdown.days === 0 ? 'Today!' : person.countdown.days}
              </Txt>
              {person.countdown.days !== 0 && (
                <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginBottom: 8 }}>
                  days away
                </Txt>
              )}
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
          </Animated.View>
        )}

        {/* Birthday Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(140)} style={{ gap: spacing.stackMd }}>
          <View style={[styles.cardHeaderRow, styles.sectionHeading]}>
            <Txt variant="headlineMd" color={colors.onSurface}>
              Birthday
            </Txt>
          </View>
          <InlineBirthdayCard person={person as any} />
        </Animated.View>

        {/* Special Days */}
        <Animated.View entering={FadeInDown.duration(500).delay(180)} style={{ gap: spacing.stackMd }}>
          <View style={[styles.cardHeaderRow, styles.sectionHeading]}>
            <Txt variant="headlineMd" color={colors.onSurface}>
              Special Days
            </Txt>
          </View>
          
          {person.specialDays && person.specialDays.filter((d: any) => !d.isBirthday).length > 0 ? (
            <View style={{ gap: 8 }}>
              {person.specialDays.filter((d: any) => !d.isBirthday).map((d) => (
                <SpecialDayRow 
                  key={d.id} 
                  day={d} 
                  personId={person.id} 
                  onLongPress={() => {
                    setSelectedDayId(d.id);
                    setDayActionVisible(true);
                  }}
                />
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

        {/* What already happened — renders nothing until there is a past to show */}
        <LookingBack person={person} />

        {/* Everything about them that isn't a date */}
        <Animated.View entering={FadeInDown.duration(500).delay(260)}>
          <AboutPerson person={person} onDeleteNote={confirmDeleteNote} />
        </Animated.View>

      </ScrollView>

      {/* Special Day Action Sheet */}
      <Modal visible={dayActionVisible} transparent animationType="none" onRequestClose={() => setDayActionVisible(false)}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDayActionVisible(false)} />
          <Animated.View entering={SlideInDown.duration(300).springify()} exiting={SlideOutDown.duration(200)} style={[styles.modalContent, { marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginBottom: 24 }}>
              Options
            </Txt>
            <Button 
              label="Delete Special Day" 
              variant="error" 
              icon="delete" 
              fullWidth 
              style={{ marginBottom: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error }}
              onPress={() => {
                setDayActionVisible(false);
                setDayConfirmVisible(true);
              }}
            />
            <Button 
              label="Cancel" 
              variant="tonal" 
              fullWidth 
              onPress={() => setDayActionVisible(false)}
            />
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Special Day Delete Confirm Modal */}
      <Modal visible={dayConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Icon name="delete" size={32} color={colors.error} />
            </View>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
              Delete Special Day
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Are you sure you want to delete this special day? This action cannot be undone.
            </Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label="Cancel" onPress={() => setDayConfirmVisible(false)} variant="tonal" style={{ flex: 1 }} />
              <Button 
                label="Delete" 
               
                onPress={() => {
                  if (!selectedDayId) return;
                  {
                    const day = person.specialDays?.find((d) => d.id === selectedDayId);
                    deleteSpecialDayWithUndo(selectedDayId, day?.title ?? 'Special day');
                    setDayConfirmVisible(false);
                    setSelectedDayId(null);
                  }
                }} 
                style={{ flex: 1, backgroundColor: colors.error }} 
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

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

      {/* Note Delete Confirm Modal */}
      <Modal visible={deleteNoteConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Icon name="delete" size={32} color={colors.error} />
            </View>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
              Delete Note
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label="Cancel" onPress={() => setDeleteNoteConfirmVisible(false)} variant="tonal" style={{ flex: 1 }} />
              <Button 
                label="Delete" 
                onPress={executeDeleteNote} 
                style={{ flex: 1, backgroundColor: colors.error }} 
               
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      <PhotoViewer
        visible={photoVisible}
        onClose={() => setPhotoVisible(false)}
        uri={person.avatar}
        title={person.name}
      />
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
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  contactError: { fontWeight: 'normal', opacity: 0.8, marginTop: 8, textAlign: 'center' },
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
  saveEditBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
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
