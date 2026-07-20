import { describeWriteError } from '@/utils/loadError';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateFields, DateValue } from '@/components/DateFields';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { DraftNote, NotesEditor, draftFromNote } from '@/components/NotesEditor';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { ReminderEditor } from '@/components/ReminderEditor';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { usePeople } from '@/context/PeopleContext';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { SKIPPED_YEAR } from '@/utils/dates';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

export default function EditSpecialDay() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { dayId, personId } = useLocalSearchParams<{ dayId: string; personId: string }>();
  const { people, updateSpecialDay, deleteSpecialDayWithUndo, syncNotes } = usePeople();

  const person = people.find((p) => p.id === personId);
  const specialDay = person?.specialDays?.find((sd) => sd.id === dayId);

  const [occasion, setOccasion] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);
  const [notes, setNotes] = useState<DraftNote[]>([]);
  const [reminders, setReminders] = useState<Nudge[]>([]);

  const [date, setDate] = useState<DateValue>({ day: null, month: null, year: null });
  const { day, month, year } = date;

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fill the form once. `specialDay` is a fresh object after any refresh,
  // so re-running this would throw away whatever the user is part-way through
  // typing.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!specialDay || hydratedFor.current === specialDay.id) return;
    hydratedFor.current = specialDay.id;

    setOccasion(specialDay.title);

    const parts = (specialDay.originalDate || '').split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map((p) => parseInt(p, 10));
      setDate({
        year: !isNaN(y) && y !== SKIPPED_YEAR ? y : null,
        month: !isNaN(m) ? m : null,
        day: !isNaN(d) ? d : null,
      });
    }

    setRecurrence(specialDay.recurrence ?? YEARLY);
    setReminders(parseNudges(specialDay.nudges));
    setNotes((specialDay.notes ?? []).map(draftFromNote));
  }, [specialDay]);

  const hasYear = year !== null && year !== SKIPPED_YEAR;

  const eventDate = (): Date | null => {
    if (!day || !month) return null;
    return new Date(hasYear ? (year as number) : new Date().getFullYear(), month - 1, day);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!occasion.trim()) {
      setError(i18n.t('give_this_day_a_title'));
      return;
    }
    if (!day || !month) {
      setError(i18n.t('pick_a_day_and_a_month'));
      return;
    }

    const y = hasYear ? year : SKIPPED_YEAR;
    const formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setSaving(true);
    try {
      // Notes are written first: updateSpecialDay refreshes the people list, and
      // doing it the other way round would leave the screen showing stale notes
      // for a moment before it pops.
      await syncNotes(
        personId ?? '',
        { specialDayId: dayId ?? '' },
        specialDay?.notes ?? [],
        notes.map((n) => ({ id: n.id, kind: n.kind, body: n.body })),
      );

      await updateSpecialDay(dayId ?? '', {
        title: occasion.trim(),
        date: formattedDate,
        recurrence,
        nudges: serializeNudges(reminders),
      });

      router.back();
      showHeld(t('is_remembered', { title: occasion.trim() }), i18n.t('reminders_updated'));
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = () => {
    setDeleteConfirmVisible(false);
    // Leaves immediately; the snackbar carries the undo offer back to the person
    // screen, where the day is already hidden from the list.
    deleteSpecialDayWithUndo(dayId ?? '', specialDay?.title ?? i18n.t('special_day'));
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        <Txt variant="title" style={{ flex: 1, textAlign: 'center' }}>
          {t('edit_special_day')}</Txt>
        <Pressable onPress={() => setDeleteConfirmVisible(true)} hitSlop={8}>
          <Icon name="delete-outline" size={24} color={c.danger} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Card style={{ gap: spacing.stackMd }}>
              <View style={{ gap: spacing.stackMd }}>
                <View style={{ gap: 6 }}>
                  <FieldLabel>{t('title')}</FieldLabel>
                  <TextInput
                    value={occasion}
                    onChangeText={setOccasion}
                    placeholder={t('e_g_anniversary_graduation')}
                    placeholderTextColor={c.faint}
                    style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <FieldLabel>{t('date_year_optional')}</FieldLabel>
                  <DateFields value={date} onChange={setDate} yearMode="future" />
                </View>
              </View>

              <RecurrencePicker value={recurrence} onChange={setRecurrence} />

              <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />

              <NotesEditor notes={notes} onChange={setNotes} />
            </Card>
          </Animated.View>

          <FormError message={error} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button
              label={saving ? i18n.t('saving') : i18n.t('save_changes')}
              icon="check"
              onPress={handleSubmit}
              disabled={saving}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={[styles.deleteOverlay, { backgroundColor: c.overlay }]}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.deleteContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.deleteIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="delete-outline" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>{t('delete_special_day')}</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {t('this_removes_the_day_and_1')}</Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label={t('cancel')} onPress={() => setDeleteConfirmVisible(false)} variant="quiet" style={{ flex: 1 }} />
              <Button label={t('delete')} onPress={executeDelete} variant="dangerSolid" style={{ flex: 1 }} />
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
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
  },
  fieldLabel: { marginLeft: 2 },
  input: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
  },
  deleteOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deleteContent: {
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
