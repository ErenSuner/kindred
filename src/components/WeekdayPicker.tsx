import { View, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { WEEKDAYS, Weekday, sortWeekdays, weekdaysLabel } from '@/utils/routines';

type Props = {
  value: Weekday[];
  onChange: (next: Weekday[]) => void;
};

// The days a routine falls on. Monday first, so it reads like a timetable.
export function WeekdayPicker({ value, onChange }: Props) {
  const selected = new Set(value);

  const toggle = (day: Weekday) => {
    const next = selected.has(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(sortWeekdays(next));
  };

  return (
    <View style={styles.box}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="repeat" size={16} color={colors.primary} />
        <Txt variant="labelMd" color={colors.onSurface}>Which days</Txt>
      </View>
      <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4, marginBottom: 12 }}>
        {value.length === 0 ? 'Pick the days this happens on.' : `${weekdaysLabel(value)}, every week.`}
      </Txt>

      <View style={styles.row}>
        {WEEKDAYS.map((day) => {
          const on = selected.has(day.value);
          return (
            <Pressable
              key={day.value}
              onPress={() => toggle(day.value)}
              style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && { opacity: 0.8 }]}
            >
              <Txt variant="labelSm" color={on ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
                {day.short.charAt(0)}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: 16,
    marginTop: spacing.stackSm,
  },
  row: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  dayOn: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
});
