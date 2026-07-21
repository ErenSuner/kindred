import { describeWriteError } from '@/utils/loadError';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { ReminderEditor } from '@/components/ReminderEditor';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { WeekdayPicker } from '@/components/WeekdayPicker';
import { useEvents } from '@/context/EventsContext';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { toISODate } from '@/utils/dates';
import { DAY_OF, Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { Weekday, weekdaysLabel } from '@/utils/routines';
import { TimeField } from '@/components/TimeField';
import { TimeOfDay } from '@/utils/eventTime';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

const SUGGESTIONS = [i18n.t('class'), i18n.t('gym'), i18n.t('therapy'), i18n.t('football'), i18n.t('language_course')];

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

// Add or edit a weekly routine. It shares the my_events table with dated
// reminders but asks a different question — which weekdays, not which date —
// so it gets its own screen rather than a mode on the reminder form.
export default function RoutineForm() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
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
      setError(t('give_routine_name'));
      return;
    }
    if (weekdays.length === 0) {
      setError(t('pick_at_least_one_day'));
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
      showHeld(t('is_remembered', { title: title.trim() }), t('weekly_every_week', { days: weekdaysLabel(weekdays) }));
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
          {id ? t('edit_routine') : t('new_routine')}
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
              <View style={styles.cardHeader}>
                <Txt variant="heading">{t('every_week')}</Txt>
                <Icon name="repeat" size={22} color={c.flameDeep} />
              </View>

              <View style={{ gap: 6 }}>
                <FieldLabel>{t('name')}</FieldLabel>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('e_g_guitar_lesson')}
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

              <WeekdayPicker value={weekdays} onChange={setWeekdays} />

              <TimeField value={timeOfDay} onChange={setTimeOfDay} />

              {/* A routine comes round weekly, so anything further out than six
                  days would fire every week and mean nothing. */}
              <ReminderEditor reminders={reminders} onChange={setReminders} maxLeadDays={6} />
            </Card>
          </Animated.View>

          <FormError message={error} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center', gap: spacing.stackMd }}>
            <Button
              label={saving ? t('saving') : id ? t('save_routine') : t('add_routine')}
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
                <Icon name="delete-outline" size={18} color={c.danger} />
                <Txt variant="label" color={c.danger}>{t('delete_routine')}</Txt>
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
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
});
