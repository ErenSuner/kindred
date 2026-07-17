import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { RecurrencePicker } from '@/components/RecurrencePicker';
import { ReminderEditor } from '@/components/ReminderEditor';
import { useEvents } from '@/context/EventsContext';
import { Nudge, serializeNudges } from '@/utils/nudges';
import { Recurrence, YEARLY } from '@/utils/recurrence';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SUGGESTIONS = ['Dentist', 'Rent Due', 'Renew Passport', 'Gym Renewal', 'Car Service'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export default function AddMyEvent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addEvent } = useEvents();

  const [title, setTitle] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(YEARLY);
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');
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

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { label: 'Skip Year', value: 1000 },
    ...Array.from({ length: 6 }, (_, i) => ({ label: String(currentYear + i), value: currentYear + i })),
  ];

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
          New Reminder
        </Txt>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { gap: spacing.stackMd }]}>
            <View style={styles.cardHeader}>
              <Txt variant="headlineMd" color={colors.onSurface}>Something for you</Txt>
              <Icon name="self-improvement" size={24} color={colors.primary} />
            </View>

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

            <View style={styles.chipWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setTitle(s)}
                  style={({ pressed }) => [styles.suggestChip, pressed && { opacity: 0.7 }]}
                >
                  <Txt variant="labelSm" color={colors.onSurfaceVariant}>{s}</Txt>
                </Pressable>
              ))}
            </View>

            <View style={{ gap: 4 }}>
              <FieldLabel>
                Date{' '}
                <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal' }}>
                  {needsYear ? '(Year required)' : '(Year optional)'}
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

            <RecurrencePicker value={recurrence} onChange={setRecurrence} />

            <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />
          </Animated.View>

          {error && (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.errorRow}>
              <Icon name="error-outline" size={16} color={colors.error} />
              <Txt variant="labelSm" color={colors.error} style={{ flex: 1 }}>{error}</Txt>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button label={saving ? 'Saving…' : 'Save Reminder'} icon="check" onPress={handleSubmit} disabled={saving} />
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
            : yearOptions
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
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
});
