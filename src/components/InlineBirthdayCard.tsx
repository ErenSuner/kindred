import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { DateFields, DateValue } from '@/components/DateFields';
import { ReminderEditor } from '@/components/ReminderEditor';
import { usePeople } from '@/context/PeopleContext';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { SKIPPED_YEAR } from '@/utils/dates';
import type { Person } from '@/data/mock';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export type InlineBirthdayCardProps = {
  person: Person;
};

export function InlineBirthdayCard({ person }: InlineBirthdayCardProps) {
  const { addBirthday, updateBirthday } = usePeople();
  const birthday = person.birthday;
  const bdayEvent = person.specialDays?.find((d: any) => d.isBirthday);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState<DateValue>({ day: null, month: null, year: null });
  const { day, month, year } = date;

  const [reminders, setReminders] = useState<Nudge[]>([]);

  // Fill the form once per birthday — this card stays mounted while the person
  // list refreshes, and re-running would discard in-progress edits.
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
  }, [birthday]);

  const hasYear = year !== null && year !== SKIPPED_YEAR;

  const eventDate = (): Date | null => {
    if (!day || !month) return null;
    return new Date(hasYear ? (year as number) : new Date().getFullYear(), month - 1, day);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setError(null);

    if (!day || !month) {
      setError('Pick a day and a month.');
      return;
    }

    setIsSaving(true);
    try {
      const y = hasYear ? year : SKIPPED_YEAR;
      const formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const nudges = serializeNudges(reminders);

      if (birthday) {
        await updateBirthday(birthday.id, { date: formattedDate, nudges });
      } else {
        await addBirthday(person.id, { date: formattedDate, nudges });
      }
      setIsExpanded(false);
    } catch (e) {
      console.error(e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Animated.View layout={Layout.springify().damping(16).stiffness(150)}>
      {!isExpanded ? (
        !birthday ? (
          <Pressable
            onPress={() => setIsExpanded(true)}
            style={({ pressed }) => [styles.collapsedCard, pressed && { backgroundColor: colors.surfaceContainerLow }]}
          >
            <Icon name="add-circle-outline" size={24} color={colors.primary} />
            <Txt variant="bodyLg" color={colors.primary} style={{ fontFamily: 'Inter_500Medium' }}>
              Add Birthday
            </Txt>
          </Pressable>
        ) : (
          <View style={styles.savedCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
              <View style={[styles.dayIcon, { backgroundColor: 'rgba(207,151,83,0.3)' }]}>
                <Icon name="cake" size={22} color={colors.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyMd" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                  Birthday{bdayEvent?.turningAge ? ` (Turning ${bdayEvent.turningAge})` : ''}
                </Txt>
                <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontFamily: 'Inter_400Regular' }}>
                  {bdayEvent?.date}
                </Txt>

                {reminders.length > 0 && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {reminders.map((r, i) => (
                      <View key={`${r.value}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name={r.type === 'custom' ? 'calendar-today' : 'schedule'} size={12} color={colors.primary} />
                        <Txt variant="labelSm" color={colors.outline}>{r.label}</Txt>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
            <Pressable onPress={() => setIsExpanded(true)} hitSlop={8} style={{ padding: 8, alignSelf: 'flex-start' }}>
              <Icon name="edit" size={22} color={colors.primary} />
            </Pressable>
          </View>
        )
      ) : (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.expandedCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="cake" size={24} color={colors.primary} />
              <Txt variant="headlineMd" color={colors.onSurface}>{birthday ? 'Edit Birthday' : 'Add Birthday'}</Txt>
            </View>
            <Pressable onPress={() => setIsExpanded(false)} hitSlop={8}>
              <Icon name="close" size={24} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={{ gap: spacing.stackMd }}>
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

            <FormError message={error} />

            <Button
              label={isSaving ? 'Saving…' : 'Save Birthday'}
              icon="check"
              onPress={handleSave}
              disabled={isSaving}
              style={{ marginTop: 8 }}
            />
          </View>
        </Animated.View>
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  collapsedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 16,
    ...softShadow,
  },
  expandedCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    gap: spacing.stackMd,
    ...softShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
});
