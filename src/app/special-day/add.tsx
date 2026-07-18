import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { ReminderEditor } from '@/components/ReminderEditor';
import { DraftNote, NotesEditor } from '@/components/NotesEditor';
import { usePeople } from '@/context/PeopleContext';
import { Recurrence, YEARLY } from '@/utils/recurrence';
import { Nudge, serializeNudges } from '@/utils/nudges';
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

export default function AddSpecialDay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { addSpecialDay } = usePeople();

  const [occasion, setOccasion] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);

  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

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
    } catch (e) {
      console.error(e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary} style={{ flex: 1, textAlign: 'center', marginRight: 24 }}>
          New Special Day
        </Txt>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={[styles.card, { gap: spacing.stackMd }]}>
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
              label={saving ? 'Saving…' : 'Save Special Day'}
              icon="check"
              onPress={handleSubmit}
              disabled={saving}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

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
});
