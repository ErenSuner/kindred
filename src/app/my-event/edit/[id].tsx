import { describeWriteError } from '@/utils/loadError';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateFields, DateValue } from '@/components/DateFields';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { ReminderEditor } from '@/components/ReminderEditor';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { useEvents } from '@/context/EventsContext';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { TimeField } from '@/components/TimeField';
import { TimeOfDay } from '@/utils/eventTime';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

export default function EditMyEvent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEvent, updateEvent, deleteEventWithUndo } = useEvents();
  const event = getEvent(id ?? '');

  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null);
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
    setTimeOfDay(event.timeOfDay ?? null);
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
        timeOfDay,
      });
      router.back();
      showHeld(`${title.trim()} is remembered`, 'Reminders updated');
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!event) return;
    setDeleteConfirmVisible(false);
    deleteEventWithUndo(event);
    router.back();
  };

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="arrow-back" size={24} color={c.muted} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.containerMobile }}>
          <Icon name="event-busy" size={44} color={c.lineStrong} />
          <Txt variant="heading" style={{ marginTop: 16, textAlign: 'center' }}>
            Reminder not found
          </Txt>
          <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
            It may have already passed or been deleted.
          </Txt>
        </View>
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
          Edit reminder
        </Txt>
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
              <View style={{ gap: 6 }}>
                <FieldLabel>Title</FieldLabel>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Dentist, Passport renewal"
                  placeholderTextColor={c.faint}
                  style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
                />
              </View>

              <View style={{ gap: 6 }}>
                <FieldLabel>{needsYear ? 'Date · year required' : 'Date · year optional'}</FieldLabel>
                <DateFields value={date} onChange={setDate} yearMode="future" allowSkipYear={!needsYear} />
              </View>

              <RecurrencePicker value={recurrence} onChange={setRecurrence} />

              <TimeField value={timeOfDay} onChange={setTimeOfDay} />

              <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />
            </Card>
          </Animated.View>

          <FormError message={error} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button label={saving ? 'Saving…' : 'Save changes'} icon="check" onPress={handleSave} disabled={saving} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>


      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlay }]} onPress={() => setDeleteConfirmVisible(false)}>
          <Animated.View
            entering={SlideInDown.duration(250)}
            style={[styles.confirmSheet, { backgroundColor: c.surface }, floatShadow]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Txt variant="heading" style={{ marginBottom: 8 }}>
                Delete this reminder?
              </Txt>
              <Txt variant="body" color={c.muted} style={{ marginBottom: 24 }}>
                &ldquo;{event.title}&rdquo; and its nudges will be removed. You&apos;ll have a moment
                to undo it.
              </Txt>
              <View style={{ gap: 8 }}>
                <Button label="Delete" icon="delete-outline" variant="dangerSolid" fullWidth onPress={handleDelete} />
                <Button label="Keep it" variant="quiet" fullWidth onPress={() => setDeleteConfirmVisible(false)} />
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
  },
  fieldLabel: { marginLeft: 2 },
  input: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  confirmSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 48,
  },
});
