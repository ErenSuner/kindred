import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { ReminderEditor } from '@/components/ReminderEditor';
import { Txt } from '@/components/Txt';
import { WeekdayPicker } from '@/components/WeekdayPicker';
import { useEvents } from '@/context/EventsContext';
import { colors, radius, softShadow, spacing } from '@/theme/tokens';
import { toISODate } from '@/utils/dates';
import { DAY_OF, Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { Weekday } from '@/utils/routines';
import { TimeField } from '@/components/TimeField';
import { TimeOfDay } from '@/utils/eventTime';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUGGESTIONS = ['Class', 'Gym', 'Therapy', 'Football', 'Language course'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

// Add or edit a weekly routine. It shares the my_events table with dated
// reminders but asks a different question — which weekdays, not which date —
// so it gets its own screen rather than a mode on the reminder form.
export default function RoutineForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addEvent, updateEvent, getEvent, deleteEventWithUndo } = useEvents();

  const existing = id ? getEvent(id) : undefined;

  const [title, setTitle] = useState('');
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null);
  const [reminders, setReminders] = useState<Nudge[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Only fills the form once — retyping the title shouldn't be undone by a
  // refresh landing underneath.
  useEffect(() => {
    if (!existing || hydrated) return;
    setTitle(existing.title);
    setWeekdays(existing.weekdays ?? []);
    setTimeOfDay(existing.timeOfDay ?? null);
    // The day-of nudge is guaranteed and shown as fixed, so it never belongs in
    // the editable list.
    setReminders(parseNudges(existing.nudges).filter((n) => n.value !== DAY_OF));
    setHydrated(true);
  }, [existing, hydrated]);

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError('Give this routine a name.');
      return;
    }
    if (weekdays.length === 0) {
      setError('Pick at least one day.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        weekdays,
        timeOfDay,
        nudges: serializeNudges(reminders),
        // Pinned, or updateEvent would re-derive an icon from the title and a
        // routine called "Dentist" would stop looking like a routine.
        icon: 'repeat',
      };

      if (id) {
        await updateEvent(id, payload);
      } else {
        await addEvent({ ...payload, date: toISODate(new Date()) });
      }
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
          {id ? 'Edit Routine' : 'New Routine'}
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
              <Txt variant="headlineMd" color={colors.onSurface}>Every week</Txt>
              <Icon name="repeat" size={24} color={colors.primary} />
            </View>

            <Txt variant="bodyMd" color={colors.onSurfaceVariant}>
              For the things that come round on the same days — a course, a class, a standing appointment.
            </Txt>

            <View style={{ gap: 4 }}>
              <FieldLabel>Name</FieldLabel>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Guitar lesson"
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

            <WeekdayPicker value={weekdays} onChange={setWeekdays} />

            <TimeField value={timeOfDay} onChange={setTimeOfDay} />

            {/* A routine comes round weekly, so anything further out than six
                days would fire every week and mean nothing. */}
            <ReminderEditor reminders={reminders} onChange={setReminders} maxLeadDays={6} />
          </Animated.View>

          <FormError message={error} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center', gap: spacing.stackMd }}>
            <Button
              label={saving ? 'Saving…' : id ? 'Save Routine' : 'Add Routine'}
              icon="check"
              onPress={handleSubmit}
              disabled={saving}
            />
            {id && existing && (
              <Pressable
                onPress={() => {
                  deleteEventWithUndo(existing);
                  router.back();
                }}
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
              >
                <Icon name="delete" size={18} color={colors.error} />
                <Txt variant="labelMd" color={colors.error}>Delete routine</Txt>
              </Pressable>
            )}
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
});
