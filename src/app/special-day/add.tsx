import { describeWriteError } from '@/utils/loadError';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateFields, DateValue } from '@/components/DateFields';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { DraftNote, NotesEditor } from '@/components/NotesEditor';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { ReminderEditor } from '@/components/ReminderEditor';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { usePeople } from '@/context/PeopleContext';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { SKIPPED_YEAR } from '@/utils/dates';
import { Nudge, serializeNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

export default function AddSpecialDay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { addSpecialDay } = usePeople();

  const [occasion, setOccasion] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);

  const [date, setDate] = useState<DateValue>({ day: null, month: null, year: null });
  const { day, month, year } = date;

  const [reminders, setReminders] = useState<Nudge[]>([
    { type: 'preset', label: '1 Week Before', value: '1_week' },
    { type: 'preset', label: '1 Day Before', value: '1_day' },
  ]);
  const [notes, setNotes] = useState<DraftNote[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await addSpecialDay(personId ?? '', {
        title: occasion.trim(),
        date: formattedDate,
        nudges: serializeNudges(reminders),
        recurrence,
        notes: notes.map((n) => ({ kind: n.kind, body: n.body })),
      });
      router.back();
      showHeld(
        `${occasion.trim()} is remembered`,
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
          New special day
        </Txt>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Card style={{ gap: spacing.stackMd }}>
              <View style={{ gap: spacing.stackMd }}>
                <View style={{ gap: 6 }}>
                  <FieldLabel>Title</FieldLabel>
                  <TextInput
                    value={occasion}
                    onChangeText={setOccasion}
                    placeholder="e.g., Anniversary, Graduation"
                    placeholderTextColor={c.faint}
                    style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
                  />
                </View>

                <View style={{ gap: 6 }}>
                  <FieldLabel>Date · year optional</FieldLabel>
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
              label={saving ? 'Saving…' : 'Save special day'}
              icon="check"
              onPress={handleSubmit}
              disabled={saving}
            />
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
});
