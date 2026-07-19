import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { showHeld } from '@/components/HeldNotice';
import { DateFields, DateValue } from '@/components/DateFields';
import { ReminderEditor } from '@/components/ReminderEditor';
import { usePeople } from '@/context/PeopleContext';
import { Nudge, parseNudges, serializeNudges } from '@/utils/nudges';
import { SKIPPED_YEAR } from '@/utils/dates';
import type { Person } from '@/data/mock';

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

export type InlineBirthdayCardProps = {
  person: Person;
};

export function InlineBirthdayCard({ person }: InlineBirthdayCardProps) {
  const { c, cardShadow } = useTheme();
  const { addBirthday, updateBirthday, deleteSpecialDayWithUndo } = usePeople();
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
      // The reassurance is the product: say the job has been taken on.
      showHeld(
        `${person.name}'s birthday is remembered`,
        reminders.length > 0
          ? `On the day, plus ${reminders.length} earlier ${reminders.length === 1 ? 'reminder' : 'reminders'}`
          : "We'll remind you on the day",
      );
    } catch (e) {
      console.error(e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Clearing a birthday goes through the same staged deletion as any other day,
  // so it lands in the undo snackbar rather than vanishing for good.
  const handleClear = () => {
    if (!birthday) return;
    setIsExpanded(false);
    // The form is filled once per birthday id; letting it re-hydrate means a new
    // birthday added after this one starts from a clean slate.
    hydratedFor.current = null;
    setDate({ day: null, month: null, year: null });
    setReminders([]);
    deleteSpecialDayWithUndo(birthday.id, 'Birthday');
  };

  return (
    <Animated.View layout={Layout.springify().damping(16).stiffness(150)}>
      {!isExpanded ? (
        !birthday ? (
          <Pressable
            onPress={() => setIsExpanded(true)}
            style={({ pressed }) => [
              styles.collapsedCard,
              { borderColor: c.lineStrong, backgroundColor: c.surface },
              pressed && { backgroundColor: c.surfaceAlt },
            ]}
          >
            <Icon name="add-circle-outline" size={22} color={c.flameDeep} />
            <Txt variant="bodyMed" color={c.flameDeep}>Add birthday</Txt>
          </Pressable>
        ) : (
          <View style={[styles.savedCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
              <View style={[styles.dayIcon, { backgroundColor: c.flameWash }]}>
                <Icon name="cake" size={22} color={c.flameDeep} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="bodyMed">
                  Birthday{bdayEvent?.turningAge ? ` (Turning ${bdayEvent.turningAge})` : ''}
                </Txt>
                <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
                  {bdayEvent?.date}
                </Txt>

                {/* The mechanism, quietly visible: which reminders are armed. */}
                {reminders.length > 0 && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {reminders.map((r, i) => (
                      <View key={`${r.value}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name={r.type === 'date' ? 'notifications-none' : 'schedule'} size={12} color={c.flameDeep} />
                        <Txt variant="sub" color={c.faint}>{r.label}</Txt>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
            <Pressable onPress={() => setIsExpanded(true)} hitSlop={8} style={{ padding: 8, alignSelf: 'flex-start' }}>
              <Icon name="edit" size={22} color={c.muted} />
            </Pressable>
          </View>
        )
      ) : (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.expandedCard, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}
        >
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="cake" size={22} color={c.flameDeep} />
              <Txt variant="heading">{birthday ? 'Edit birthday' : 'Add birthday'}</Txt>
            </View>
            <Pressable onPress={() => setIsExpanded(false)} hitSlop={8}>
              <Icon name="close" size={24} color={c.muted} />
            </Pressable>
          </View>

          <View style={{ gap: spacing.stackMd }}>
            <View style={{ gap: 4 }}>
              <FieldLabel>Date · year optional</FieldLabel>
              <DateFields value={date} onChange={setDate} yearMode="past" />
            </View>

            <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />

            <FormError message={error} />

            <Button
              label={isSaving ? 'Saving…' : 'Save birthday'}
              icon="check"
              onPress={handleSave}
              disabled={isSaving}
              style={{ marginTop: 8 }}
            />

            {/* Only offered once there is one to clear. */}
            {birthday && (
              <Pressable
                onPress={handleClear}
                disabled={isSaving}
                style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
              >
                <Icon name="delete-outline" size={16} color={c.danger} />
                <Txt variant="label" color={c.danger}>Clear birthday</Txt>
              </Pressable>
            )}
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
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  expandedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.stackMd,
    gap: spacing.stackMd,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { marginLeft: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
});
