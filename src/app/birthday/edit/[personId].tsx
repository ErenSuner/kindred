import { describeWriteError } from '@/utils/loadError';
import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormError } from '@/components/FormError';
import { DateFields, DateValue } from '@/components/DateFields';
import { ReminderEditor } from '@/components/ReminderEditor';
import { HighlightCard, HighlightHandle } from '@/components/HighlightCard';
import { DraftNote, NotesEditor, draftFromNote } from '@/components/NotesEditor';
import { showHeld } from '@/components/HeldNotice';
import { usePeople } from '@/context/PeopleContext';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { SKIPPED_YEAR } from '@/utils/dates';
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

export default function EditBirthday() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { personId, highlight } = useLocalSearchParams<{ personId: string; highlight?: string }>();
  const { people, updateBirthday, deleteSpecialDayWithUndo, syncNotes } = usePeople();

  const person = people.find((p) => p.id === personId);
  const birthday = person?.birthday;
  // The birthday also appears in specialDays, which is where its notes live.
  const birthdayDay = person?.specialDays?.find((d) => d.isBirthday);

  const [date, setDate] = useState<DateValue>({ day: null, month: null, year: null });
  const { day, month, year } = date;

  const [reminders, setReminders] = useState<Nudge[]>([]);
  const [notes, setNotes] = useState<DraftNote[]>([]);

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set when the user arrives from the "that looks like a birthday" prompt, so
  // the card they were sent to announces itself.
  const birthdayCardRef = useRef<HighlightHandle>(null);
  useEffect(() => {
    if (highlight !== '1' || !birthday) return;
    const timer = setTimeout(() => birthdayCardRef.current?.pulse(), 420);
    return () => clearTimeout(timer);
  }, [highlight, birthday]);

  // Fill the form once — `birthday` is a fresh object after any refresh, and
  // re-running this would discard in-progress edits.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!birthday || hydratedFor.current === birthday.id) return;
    hydratedFor.current = birthday.id;

    const parts = (birthday.date || '').split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map((x) => parseInt(x, 10));
      setDate({
        year: !isNaN(y) && y !== SKIPPED_YEAR ? y : null,
        month: !isNaN(m) ? m : null,
        day: !isNaN(d) ? d : null,
      });
    }

    setReminders(parseNudges(birthday.nudges));
    setNotes((birthdayDay?.notes ?? []).map(draftFromNote));
  }, [birthday, birthdayDay]);

  const hasYear = year !== null && year !== SKIPPED_YEAR;

  const eventDate = (): Date | null => {
    if (!day || !month) return null;
    return new Date(hasYear ? (year as number) : new Date().getFullYear(), month - 1, day);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!day || !month) {
      setError(i18n.t('pick_a_day_and_a_month'));
      return;
    }
    if (!birthday) return;

    const y = hasYear ? year : SKIPPED_YEAR;
    const formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setSaving(true);
    try {
      await syncNotes(
        personId ?? '',
        { specialDayId: birthday.id },
        birthdayDay?.notes ?? [],
        notes.map((n) => ({ id: n.id, kind: n.kind, body: n.body })),
      );

      await updateBirthday(birthday.id, {
        date: formattedDate,
        nudges: serializeNudges(reminders),
      });

      router.back();
      showHeld(
        `${person?.name ?? 'Their'}'s birthday is remembered`,
        reminders.length > 0
          ? `On the day, plus ${reminders.length} earlier ${reminders.length === 1 ? 'reminder' : 'reminders'}`
          : i18n.t('we_ll_remind_you_on_the_day'),
      );
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = () => {
    if (!birthday) return;
    setDeleteConfirmVisible(false);
    // A birthday is a special day now, so it shares the same staged deletion.
    deleteSpecialDayWithUndo(birthday.id, 'Birthday');
    router.back();
  };

  if (!birthday) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <Txt variant="body" color={c.muted}>{t('loading')}</Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        <Txt variant="title" style={{ flex: 1, textAlign: 'center' }}>
          {t('edit_birthday')}</Txt>
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
          <HighlightCard ref={birthdayCardRef} style={{ marginHorizontal: -2 }}>
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
              <Card style={{ gap: spacing.stackMd }}>
                <View style={styles.cardHeader}>
                  <Txt variant="heading">{t('birthday')}</Txt>
                  <Icon name="cake" size={22} color={c.flameDeep} />
                </View>

                <View style={{ gap: 6 }}>
                  <FieldLabel>{t('date_year_optional')}</FieldLabel>
                  <DateFields value={date} onChange={setDate} yearMode="past" />
                </View>

                <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />

                <NotesEditor
                  notes={notes}
                  onChange={setNotes}
                  blurb={i18n.t('gift_ideas_plans_anything_you_')}
                />
              </Card>
            </Animated.View>
          </HighlightCard>

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
            <Txt variant="heading" style={{ marginTop: 16 }}>{t('delete_birthday')}</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {t('delete_birthday_body', { name: person?.name ?? 'their' })}</Txt>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { marginLeft: 2 },
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
