import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { DateFields, DateValue } from '@/components/DateFields';
import { ReminderEditor } from '@/components/ReminderEditor';
import { HighlightCard, HighlightHandle } from '@/components/HighlightCard';
import { DraftNote, NotesEditor, draftFromNote } from '@/components/NotesEditor';
import { usePeople } from '@/context/PeopleContext';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { SKIPPED_YEAR } from '@/utils/dates';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export default function EditBirthday() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      setError('Pick a day and a month.');
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
    } catch (e) {
      console.error(e);
      setError('Could not save. Check your connection and try again.');
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Txt variant="bodyMd" color={colors.onSurfaceVariant}>Loading…</Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary} style={{ flex: 1, textAlign: 'center' }}>
          Edit Birthday
        </Txt>
        <Pressable onPress={() => setDeleteConfirmVisible(true)} hitSlop={8}>
          <Icon name="delete" size={24} color={colors.error} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <HighlightCard ref={birthdayCardRef} style={{ marginHorizontal: -2 }}>
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { gap: spacing.stackMd }]}>
              <View style={styles.cardHeader}>
                <Txt variant="headlineMd" color={colors.onSurface}>
                  Birthday
                </Txt>
                <Icon name="cake" size={24} color={colors.primary} />
              </View>

              <View style={{ gap: 4 }}>
                <FieldLabel>
                  Date{' '}
                  <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal' }}>
                    (Year optional)
                  </Txt>
                </FieldLabel>
                <DateFields value={date} onChange={setDate} yearMode="past" />
              </View>

              <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />

              <NotesEditor
                notes={notes}
                onChange={setNotes}
                blurb="Gift ideas, plans, anything you want to remember for this birthday."
              />
            </Animated.View>
          </HighlightCard>

          <FormError message={error} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button
              label={saving ? 'Saving…' : 'Save Changes'}
              icon="check"
              onPress={handleSubmit}
              disabled={saving}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={styles.deleteContent}>
            <View style={styles.deleteIconWrap}>
              <Icon name="delete" size={32} color={colors.error} />
            </View>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
              Delete Birthday
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              This removes {person?.name ?? 'their'}&apos;s birthday and any notes kept with it. You&apos;ll have a moment to undo it.
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
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    ...softShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { letterSpacing: 1, marginLeft: 2 },
  input: {
    backgroundColor: 'rgba(228,226,225,0.4)',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  inputCenter: { alignItems: 'center', justifyContent: 'center' },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deleteContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...ambientShadow,
  },
  deleteIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
