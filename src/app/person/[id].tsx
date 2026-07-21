import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut, FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CelebrationBg } from '@/components/CelebrationBg';
import { Avatar } from '@/components/Avatar';
import { usePeople } from '@/context/PeopleContext';
import { InlineBirthdayCard } from '@/components/InlineBirthdayCard';
import { NotePreview } from '@/components/NotePreview';
import { LookingBack } from '@/components/LookingBack';
import { PhotoViewer } from '@/components/PhotoViewer';
import { AboutPerson } from '@/components/AboutPerson';
import { openInContacts } from '@/utils/contacts';
import { relationshipLabel } from '@/utils/relationshipLabel';
import { daysLongLabel } from '@/utils/countdownLabel';
import type { SpecialDay } from '@/data/mock';
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

function SpecialDayRow({ day, personId, onLongPress, onMore }: { day: SpecialDay; personId: string; onLongPress?: () => void; onMore?: () => void }) {
  const router = useRouter();
  const { c } = useTheme();
  return (
    <Card
      onPress={() => {
        if ((day as any).isBirthday) {
          router.push({ pathname: '/birthday/person/[personId]', params: { personId } } as any);
        } else {
          router.push({ pathname: '/special-day/edit/[dayId]', params: { dayId: day.id, personId } } as any);
        }
      }}
      onLongPress={onLongPress}
      style={styles.dayRow}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        <View style={[styles.dayIcon, { backgroundColor: c.flameWash }]}>
          <Icon name={day.icon as any} size={22} color={c.flameDeep} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="bodyMed">
            {day.title}{day.turningAge ? i18n.t('turning_age', { age: day.turningAge }) : ''}
          </Txt>
          <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
            {day.date}
          </Txt>
          {day.notes && day.notes.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <NotePreview notes={day.notes} lines={2} compact />
            </View>
          )}
        </View>
      </View>
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={8} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.6 }]}>
          <Icon name="more-horiz" size={20} color={c.faint} />
        </Pressable>
      ) : (
        <Icon name="chevron-right" size={22} color={c.faint} />
      )}
    </Card>
  );
}

export default function PersonDetail() {
    const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow, cardShadow } = useTheme();
  const { getPerson, removePersonWithUndo, deleteNoteWithUndo, deleteSpecialDayWithUndo } = usePeople();

  const person = getPerson(id ?? '');

  // Person-level actions all live in one overflow sheet, so the destructive one
  // isn't a bare icon in the top chrome next to Back.
  const [personActionsVisible, setPersonActionsVisible] = useState(false);
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
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.header, { paddingTop: insets.top + 8, position: 'absolute', top: 0, left: 0, right: 0 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="arrow-back" size={24} color={c.muted} />
          </Pressable>
          <View style={{ width: 24 }} />
        </View>
        <Icon name="person-off" size={44} color={c.lineStrong} />
        <Txt variant="heading" style={{ marginTop: 16 }}>
          {t('person_not_found')}</Txt>
        <Txt variant="body" color={c.muted} style={{ marginTop: 8 }}>
          {t('they_may_have_been_removed')}</Txt>
      </View>
    );
  }

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
      if (!opened) setContactError(t('contact_gone'));
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        {/* One overflow entry, so a destructive action isn't top-chrome next to
            Back. Edit, Open in Contacts and Delete all live inside it. */}
        <Pressable onPress={() => setPersonActionsVisible(true)} hitSlop={8}>
          <Icon name="more-horiz" size={24} color={c.muted} />
        </Pressable>
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
              <Image
                source={{ uri: person.avatar }}
                style={[styles.bigAvatar, { borderColor: c.surface }, cardShadow]}
                contentFit="cover"
              />
            </Pressable>
          ) : (
            <View style={[styles.bigAvatar, styles.bigInitials, { backgroundColor: c.flameWash, borderColor: c.surface }]}>
              <Txt color={c.flameDeep} style={{ fontFamily: fonts.frauncesSemiBold, fontSize: 44, lineHeight: 54 }}>
                {person.initials}
              </Txt>
            </View>
          )}
          <Txt variant="display" style={{ marginTop: 16, textAlign: 'center' }}>
            {person.name}
          </Txt>
          {/* tags already carries the role, so filter it out — otherwise the
              relationship shows up as two identical chips. */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip label={relationshipLabel(person.role)} />
            {person.tags.filter((t) => t !== person.role).map((t) => (
              <Chip key={t} label={t} />
            ))}
          </View>

          {/* Opening in Contacts now lives in the overflow sheet; only its
              failure needs to surface here, where the tap happened. */}
          {contactError && (
            <Txt variant="sub" color={c.muted} style={styles.contactError}>
              {contactError}
            </Txt>
          )}
        </Animated.View>

        {/* Countdown — the one dark card on this screen. */}
        {person.countdown && (
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Card ink style={{ overflow: 'hidden' }}>
              {person.countdown.isBirthday && <CelebrationBg />}
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {person.countdown.isBirthday ? (
                    <Icon name="cake" size={15} color={c.flame} />
                  ) : (
                    <View style={[styles.flameDot, { backgroundColor: c.flame }]} />
                  )}
                  <Txt variant="eyebrow" color={c.flame}>{t('next_big_day')}</Txt>
                </View>
                <Chip label={person.countdown.tag} tone="ink" />
              </View>

              <Txt
                color={c.flame}
                style={{ fontFamily: fonts.frauncesSemiBold, fontSize: 34, lineHeight: 42, marginTop: 14 }}
              >
{daysLongLabel(person.countdown.days)}
              </Txt>

              <View style={{ marginTop: 6 }}>
                <Txt variant="bodyMed" color={c.onInk}>
                  {person.countdown.title}
                </Txt>
                <Txt variant="sub" color={c.onInkMuted} style={{ marginTop: 3 }}>
                  {person.countdown.date}
                </Txt>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: c.inkSoft }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: c.flame, width: `${person.countdown.progress * 100}%` },
                  ]}
                />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Birthday */}
        <Animated.View entering={FadeInDown.duration(500).delay(140)} style={{ gap: spacing.stackMd }}>
          <View style={styles.sectionHead}>
            <Txt variant="eyebrow" color={c.faint}>{t('birthday')}</Txt>
            <View style={[styles.sectionRule, { backgroundColor: c.line }]} />
          </View>
          <InlineBirthdayCard person={person as any} />
        </Animated.View>

        {/* Special days */}
        <Animated.View entering={FadeInDown.duration(500).delay(180)} style={{ gap: spacing.stackMd }}>
          <View style={styles.sectionHead}>
            <Txt variant="eyebrow" color={c.faint}>{t('special_days')}</Txt>
            <View style={[styles.sectionRule, { backgroundColor: c.line }]} />
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
                  onMore={() => {
                    setSelectedDayId(d.id);
                    setDayActionVisible(true);
                  }}
                />
              ))}
            </View>
          ) : (
            <Card style={{ alignItems: 'center' }}>
              <Txt variant="body" color={c.muted}>
                {t('anniversaries_graduations_memo')}</Txt>
            </Card>
          )}

          <Button
            label={t('add_special_day')}
            icon="add"
            variant="quiet"
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

      {/* Person overflow: edit, open in contacts, delete — all in one place. */}
      <Modal visible={personActionsVisible} transparent animationType="none" onRequestClose={() => setPersonActionsVisible(false)}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPersonActionsVisible(false)} />
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
              floatShadow,
            ]}
          >
            <View style={{ alignItems: 'center', marginBottom: 20, gap: 10 }}>
              <Avatar uri={person.avatar} initials={person.initials} size={56} />
              <Txt variant="heading">{person.name}</Txt>
            </View>

            <View style={{ gap: 12, width: '100%' }}>
              <Button
                variant="quiet"
                icon="edit"
                label={t('edit_person_action')}
                fullWidth
                onPress={() => {
                  setPersonActionsVisible(false);
                  router.push(('/edit/' + person.id) as any);
                }}
              />
              {person.contactId && Platform.OS !== 'web' && (
                <Button
                  variant="quiet"
                  icon="person-search"
                  label={openingContact ? t('opening') : t('open_in_contacts')}
                  fullWidth
                  disabled={openingContact}
                  onPress={() => {
                    setPersonActionsVisible(false);
                    handleOpenContact();
                  }}
                />
              )}
              <Button
                variant="danger"
                icon="delete-outline"
                label={t('delete_person')}
                fullWidth
                onPress={() => {
                  setPersonActionsVisible(false);
                  setDeleteConfirmVisible(true);
                }}
              />
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Special day action sheet */}
      <Modal visible={dayActionVisible} transparent animationType="none" onRequestClose={() => setDayActionVisible(false)}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDayActionVisible(false)} />
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
            style={[
              styles.modalContent,
              { backgroundColor: c.surface, marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
              floatShadow,
            ]}
          >
            <Txt variant="heading" style={{ marginBottom: 24 }}>{t('options')}</Txt>
            <Button
              label={t('delete_special_day')}
              variant="danger"
              icon="delete-outline"
              fullWidth
              style={{ marginBottom: 12 }}
              onPress={() => {
                setDayActionVisible(false);
                setDayConfirmVisible(true);
              }}
            />
            <Button label={t('cancel')} variant="quiet" fullWidth onPress={() => setDayActionVisible(false)} />
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Special day delete confirm */}
      <Modal visible={dayConfirmVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="delete-outline" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>{t('delete_special_day')}</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {t('this_removes_the_day_and')}</Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label={t('cancel')} onPress={() => setDayConfirmVisible(false)} variant="quiet" style={{ flex: 1 }} />
              <Button
                label={t('delete')}
                variant="dangerSolid"
                onPress={() => {
                  if (!selectedDayId) return;
                  {
                    const day = person.specialDays?.find((d) => d.id === selectedDayId);
                    deleteSpecialDayWithUndo(selectedDayId, day?.title ?? i18n.t('special_day'));
                    setDayConfirmVisible(false);
                    setSelectedDayId(null);
                  }
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Person delete confirm */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="delete-outline" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>{t('delete_person')}</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {t('delete_person_body', { name: person.name })}</Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label={t('cancel')} onPress={() => setDeleteConfirmVisible(false)} variant="quiet" style={{ flex: 1 }} />
              <Button label={t('delete')} onPress={executeDelete} variant="dangerSolid" style={{ flex: 1 }} />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Note delete confirm */}
      <Modal visible={deleteNoteConfirmVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="delete-outline" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>{t('delete_note')}</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {t('the_note_disappears_right_away')}</Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label={t('cancel')} onPress={() => setDeleteNoteConfirmVisible(false)} variant="quiet" style={{ flex: 1 }} />
              <Button label={t('delete')} onPress={executeDeleteNote} variant="dangerSolid" style={{ flex: 1 }} />
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
  },
  bigAvatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 4,
  },
  bigInitials: { alignItems: 'center', justifyContent: 'center' },
  contactError: { opacity: 0.8, marginTop: 8, textAlign: 'center' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flameDot: { width: 8, height: 8, borderRadius: 4 },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 2 },
  sectionRule: { flex: 1, height: 1 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  modalContent: {
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
