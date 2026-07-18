import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { DateFields, DateValue } from '@/components/DateFields';
import { FormError } from '@/components/FormError';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { ReminderEditor } from '@/components/ReminderEditor';
import { useEvents } from '@/context/EventsContext';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export default function EditMyEvent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEvent, updateEvent, deleteEvent } = useEvents();
  const event = getEvent(id ?? '');

  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);
  const [date, setDate] = useState<DateValue>({ day: null, month: null, year: null });
  const { day, month, year } = date;
  const [reminders, setReminders] = useState<Nudge[]>([]);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!event || hydrated) return;
    setTitle(event.title);
    setRecurrence(event.recurrence);
    setReminders(parseNudges(event.nudges));

    const [y, m, d] = event.originalDate.split('-').map(Number);
    setDate({ year: y, month: m, day: d });
    setHydrated(true);
  }, [event, hydrated]);

  const needsYear = recurrence.unit === 'none';
  const hasYear = year !== null && year !== 1000;

  const eventDate = (): Date | null => {
    if (!day || !month) return null;
    const y = hasYear ? (year as number) : new Date().getFullYear();
    return new Date(y, month - 1, day);
  };

  const handleSave = async () => {
    setError(null);

    if (!title.trim()) {
      setError('Give your event a title.');
      return;
    }
    if (!day || !month) {
      setError('Pick a day and a month.');
      return;
    }
    if (needsYear && !hasYear) {
      setError('A one-time event needs a year.');
      return;
    }

    const y = hasYear ? year : 1000;
    const formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setSaving(true);
    try {
      await updateEvent(id ?? '', {
        title: title.trim(),
        date: formattedDate,
        nudges: serializeNudges(reminders),
        recurrence,
      });
      router.back();
    } catch (e) {
      console.error(e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirmVisible(false);
    try {
      await deleteEvent(id ?? '');
      router.back();
    } catch (e) {
      console.error(e);
      setError('Could not delete. Try again.');
    }
  };

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.containerMobile }}>
          <Icon name="event-busy" size={48} color={colors.outlineVariant} />
          <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16, textAlign: 'center' }}>
            Reminder not found
          </Txt>
          <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
            It may have already passed or been deleted.
          </Txt>
        </View>
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
          Edit Reminder
        </Txt>
        <Pressable onPress={() => setDeleteConfirmVisible(true)} hitSlop={8}>
          <Icon name="delete-outline" size={24} color={colors.error} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { gap: spacing.stackMd }]}>
            <View style={{ gap: 4 }}>
              <FieldLabel>Title</FieldLabel>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Dentist, Passport renewal"
                placeholderTextColor={colors.outline}
                style={styles.input}
              />
            </View>

            <View style={{ gap: 4 }}>
              <FieldLabel>
                Date{' '}
                <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal' }}>
                  {needsYear ? '(Year required)' : '(Year optional)'}
                </Txt>
              </FieldLabel>
              <DateFields value={date} onChange={setDate} yearMode="future" allowSkipYear={!needsYear} />
            </View>

            <RecurrencePicker value={recurrence} onChange={setRecurrence} />

            <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />
          </Animated.View>

          <FormError message={error} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button label={saving ? 'Saving…' : 'Save Changes'} icon="check" onPress={handleSave} disabled={saving} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>


      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteConfirmVisible(false)}>
          <Animated.View entering={SlideInDown.duration(250)} style={styles.confirmSheet}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Txt variant="headlineMd" color={colors.onSurface} style={{ marginBottom: 8 }}>
                Delete this reminder?
              </Txt>
              <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: 24 }}>
                &ldquo;{event.title}&rdquo; and its nudges will be removed. This can&apos;t be undone.
              </Txt>
              <View style={{ gap: 8 }}>
                <Button label="Delete" icon="delete-outline" variant="error" fullWidth onPress={handleDelete} />
                <Button label="Keep it" variant="tonal" fullWidth onPress={() => setDeleteConfirmVisible(false)} />
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
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
  nudgeBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: 16,
    marginTop: spacing.stackSm,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  confirmSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 48,
  },
});
