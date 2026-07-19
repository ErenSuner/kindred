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
import { Nudge, serializeNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { TimeField } from '@/components/TimeField';
import { TimeOfDay } from '@/utils/eventTime';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUGGESTIONS = ['Dentist', 'Rent Due', 'Renew Passport', 'Gym Renewal', 'Car Service'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

export default function AddMyEvent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { addEvent } = useEvents();

  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null);
  const [date, setDate] = useState<DateValue>({ day: null, month: null, year: null });
  const { day, month, year } = date;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reminders, setReminders] = useState<Nudge[]>([
    { type: 'preset', label: '1 Week Before', value: '1_week' },
    { type: 'preset', label: '1 Day Before', value: '1_day' },
  ]);

  // A one-time event needs a real year; a repeating one can cycle from any year.
  const needsYear = recurrence.unit === 'none';
  const hasYear = year !== null && year !== 1000;

  const eventDate = (): Date | null => {
    if (!day || !month) return null;
    const y = hasYear ? (year as number) : new Date().getFullYear();
    return new Date(y, month - 1, day);
  };

  const handleSubmit = async () => {
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
      await addEvent({
        title: title.trim(),
        date: formattedDate,
        nudges: serializeNudges(reminders),
        recurrence,
        timeOfDay,
      });
      router.back();
      // The reassurance is the product: say the job has been taken on.
      showHeld(
        `${title.trim()} is remembered`,
        reminders.length > 0
          ? `On the day, plus ${reminders.length} earlier ${reminders.length === 1 ? 'reminder' : 'reminders'}`
          : "We'll remind you on the day",
      );
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        <Txt variant="title" style={{ flex: 1, textAlign: 'center', marginRight: 24 }}>
          New reminder
        </Txt>
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

              <View style={styles.chipWrap}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setTitle(s)}
                    style={({ pressed }) => [
                      styles.suggestChip,
                      { borderColor: c.lineStrong },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Txt variant="sub" color={c.muted}>{s}</Txt>
                  </Pressable>
                ))}
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
            <Button label={saving ? 'Saving…' : 'Save reminder'} icon="check" onPress={handleSubmit} disabled={saving} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
