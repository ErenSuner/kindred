import { View, StyleSheet, Pressable } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { WEEKDAYS, Weekday, sortWeekdays, weekdaysLabel } from '@/utils/routines';
import { useTranslation } from "react-i18next";

type Props = {
  value: Weekday[];
  onChange: (next: Weekday[]) => void;
};

// The days a routine falls on. Monday first, so it reads like a timetable.
export function WeekdayPicker({ value, onChange }: Props) {
    const { t } = useTranslation();
  const { c } = useTheme();
  const selected = new Set(value);

  const toggle = (day: Weekday) => {
    const next = selected.has(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(sortWeekdays(next));
  };

  return (
    <View style={[styles.box, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="repeat" size={16} color={c.flameDeep} />
        <Txt variant="subMed">{t('which_days')}</Txt>
      </View>
      <Txt variant="sub" color={c.muted} style={{ marginTop: 4, marginBottom: 12 }}>
        {value.length === 0 ? t('pick_days') : t('days_every_week', { days: weekdaysLabel(value) })}
      </Txt>

      <View style={styles.row}>
        {WEEKDAYS.map((day) => {
          const on = selected.has(day.value);
          return (
            <Pressable
              key={day.value}
              onPress={() => toggle(day.value)}
              style={({ pressed }) => [
                styles.day,
                {
                  backgroundColor: on ? c.ink : c.surfaceAlt,
                  borderColor: on ? c.ink : c.line,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Txt variant="label" color={on ? c.onInk : c.muted}>
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
    borderRadius: radius.lg,
    borderWidth: 1,
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
  },
});
