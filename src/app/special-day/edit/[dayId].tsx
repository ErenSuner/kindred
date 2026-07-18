import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { ReminderEditor } from '@/components/ReminderEditor';
import { DraftNote, NotesEditor, draftFromNote } from '@/components/NotesEditor';
import { usePeople } from '@/context/PeopleContext';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { SKIPPED_YEAR } from '@/utils/dates';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export default function EditSpecialDay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dayId, personId } = useLocalSearchParams<{ dayId: string; personId: string }>();
  const { people, updateSpecialDay, deleteSpecialDay, syncNotes } = usePeople();

  const person = people.find((p) => p.id === personId);
  const specialDay = person?.specialDays?.find((sd) => sd.id === dayId);

  const [occasion, setOccasion] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);
  const [notes, setNotes] = useState<DraftNote[]>([]);
  const [reminders, setReminders] = useState<Nudge[]>([]);

  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (y !== SKIPPED_YEAR && !isNaN(y)) setYear(y);
      if (!isNaN(m)) setMonth(m);
      if (!isNaN(d)) setDay(d);
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
      setError('Give this day a title.');
      return;
    }
    if (!day || !month) {
      setError('Pick a day and a month.');
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
    } catch (e) {
      console.error(e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteSpecialDay(dayId ?? '');
      router.back();
    } catch (e) {
      console.error(e);
      setError('Could not delete. Check your connection and try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmVisible(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary} style={{ flex: 1, textAlign: 'center' }}>
          Edit Special Day
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
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { gap: spacing.stackMd }]}>
            <View style={styles.cardHeader}>
              <Txt variant="headlineMd" color={colors.onSurface}>
                An Important Date
              </Txt>
            </View>

            <View style={{ gap: spacing.stackMd }}>
              <View style={{ gap: 4 }}>
                <FieldLabel>Title</FieldLabel>
                <TextInput
                  value={occasion}
                  onChangeText={setOccasion}
                  placeholder="e.g., Anniversary, Graduation"
                  placeholderTextColor={colors.outline}
                  style={styles.input}
                />
              </View>

              <View style={{ gap: 4 }}>
                <FieldLabel>
                  Date{' '}
                  <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal' }}>
                    (Year optional)
                  </Txt>
                </FieldLabel>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => { setPickerType('day'); setPickerVisible(true); }} style={[styles.input, styles.inputCenter, { flex: 1 }]}>
                    <Txt variant="bodyMd" color={day ? colors.onSurface : colors.outline}>{day || 'Day'}</Txt>
                  </Pressable>
                  <Pressable onPress={() => { setPickerType('month'); setPickerVisible(true); }} style={[styles.input, styles.inputCenter, { flex: 1.5 }]}>
                    <Txt variant="bodyMd" color={month ? colors.onSurface : colors.outline}>
                      {month ? MONTHS_SHORT[month - 1] : 'Month'}
                    </Txt>
                  </Pressable>
                  <Pressable onPress={() => { setPickerType('year'); setPickerVisible(true); }} style={[styles.input, styles.inputCenter, { flex: 1.2 }]}>
                    <Txt variant="bodyMd" color={hasYear ? colors.onSurface : colors.outline}>{hasYear ? year : 'Year'}</Txt>
                  </Pressable>
                </View>
              </View>
            </View>

            <RecurrencePicker value={recurrence} onChange={setRecurrence} />

            <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />

            <NotesEditor notes={notes} onChange={setNotes} />
          </Animated.View>

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
              Delete Special Day
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              Are you sure you want to delete this special day? This action cannot be undone.
            </Txt>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <Button label="Cancel" onPress={() => setDeleteConfirmVisible(false)} variant="tonal" style={{ flex: 1 }} disabled={isDeleting} />
              <Button label="Delete" onPress={executeDelete} style={{ flex: 1, backgroundColor: colors.error }} disabled={isDeleting} />
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={pickerType === 'day' ? 'Select Day' : pickerType === 'month' ? 'Select Month' : 'Select Year'}
        options={
          pickerType === 'day'
            ? Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
            : pickerType === 'month'
            ? MONTHS_FULL.map((m, i) => ({ label: m, value: i + 1 }))
            : [
                { label: 'Skip Year', value: SKIPPED_YEAR },
                ...Array.from({ length: 101 }, (_, i) => ({
                  label: String(new Date().getFullYear() - i),
                  value: new Date().getFullYear() - i,
                })),
              ]
        }
        selectedValue={
          pickerType === 'day' ? day || undefined
          : pickerType === 'month' ? month || undefined
          : year || undefined
        }
        onSelect={(val) => {
          if (pickerType === 'day') setDay(val as number);
          else if (pickerType === 'month') setMonth(val as number);
          else setYear(val as number);
          setPickerVisible(false);
        }}
      />
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
