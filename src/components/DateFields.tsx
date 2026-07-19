import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { SKIPPED_YEAR } from '@/utils/dates';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PAST_YEARS = 101; // far enough back for any birthday
const FUTURE_YEARS = 6;

export type DateValue = {
  day: number | null;
  month: number | null;
  year: number | null;
};

type Props = {
  value: DateValue;
  onChange: (next: DateValue) => void;
  // Birthdays and past milestones look backwards; personal reminders look ahead.
  yearMode?: 'past' | 'future';
  // When false the year is mandatory, so the "Skip Year" option is withheld.
  allowSkipYear?: boolean;
};

const now = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// The day/month/year triple used by every screen that captures a date. Each
// field opens the shared scroll picker rather than a keyboard, which keeps the
// input impossible to get into an invalid state.
export function DateFields({ value, onChange, yearMode = 'past', allowSkipYear = true }: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

  const { day, month, year } = value;
  const hasYear = year !== null && year !== SKIPPED_YEAR;

  const open = (type: 'day' | 'month' | 'year') => {
    setPickerType(type);
    setPickerVisible(true);
  };

  const currentYear = new Date().getFullYear();
  const years =
    yearMode === 'future'
      ? Array.from({ length: FUTURE_YEARS }, (_, i) => ({ label: String(currentYear + i), value: currentYear + i }))
      : Array.from({ length: PAST_YEARS }, (_, i) => ({ label: String(currentYear - i), value: currentYear - i }));

  const yearOptions = allowSkipYear ? [{ label: 'Skip Year', value: SKIPPED_YEAR }, ...years] : years;

  // Days are capped to the selected month so February can't offer the 31st.
  // Without a year, February allows 29 — the picker shouldn't rule out a leap
  // day for a date whose year isn't known yet.
  const daysInMonth = month
    ? new Date(hasYear ? (year as number) : 2024, month, 0).getDate()
    : 31;

  // A date the user pinned to a real year has to be in the future — the year
  // picker already refuses last year, so offering last March was inconsistent.
  // A skipped year means "every year", where any month is still ahead of you.
  const today = now();
  const blocksPast = yearMode === 'future' && hasYear && year === currentYear;
  const firstMonth = blocksPast ? today.getMonth() + 1 : 1;
  const firstDay = blocksPast && month === today.getMonth() + 1 ? today.getDate() : 1;

  const handleSelect = (val: string | number) => {
    const n = val as number;
    if (pickerType === 'day') {
      onChange({ ...value, day: n });
    } else if (pickerType === 'month') {
      // Changing to a shorter month would otherwise leave an impossible day behind.
      const maxDay = new Date(hasYear ? (year as number) : 2024, n, 0).getDate();
      let nextDay = day && day > maxDay ? maxDay : day;
      // Moving onto the current month can strand a day that has already been.
      if (blocksPast && n === today.getMonth() + 1 && nextDay && nextDay < today.getDate()) {
        nextDay = today.getDate();
      }
      onChange({ ...value, month: n, day: nextDay });
    } else {
      // Same guard for Feb 29 when a non-leap year is chosen.
      const maxDay = month ? new Date(n === SKIPPED_YEAR ? 2024 : n, month, 0).getDate() : 31;
      let nextMonth = month;
      let nextDay = day && day > maxDay ? maxDay : day;
      // Pinning a year to today's can leave an already-passed month behind it.
      if (yearMode === 'future' && n === currentYear) {
        if (nextMonth && nextMonth < today.getMonth() + 1) {
          nextMonth = today.getMonth() + 1;
          nextDay = today.getDate();
        } else if (nextMonth === today.getMonth() + 1 && nextDay && nextDay < today.getDate()) {
          nextDay = today.getDate();
        }
      }
      onChange({ ...value, year: n, month: nextMonth, day: nextDay });
    }
    setPickerVisible(false);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => open('day')} style={[styles.input, styles.center, { flex: 1 }]}>
          <Txt variant="bodyMd" color={day ? colors.onSurface : colors.outline}>{day || 'Day'}</Txt>
        </Pressable>
        <Pressable onPress={() => open('month')} style={[styles.input, styles.center, { flex: 1.5 }]}>
          <Txt variant="bodyMd" color={month ? colors.onSurface : colors.outline}>
            {month ? MONTHS_SHORT[month - 1] : 'Month'}
          </Txt>
        </Pressable>
        <Pressable onPress={() => open('year')} style={[styles.input, styles.center, { flex: 1.2 }]}>
          <Txt variant="bodyMd" color={hasYear ? colors.onSurface : colors.outline}>{hasYear ? year : 'Year'}</Txt>
        </Pressable>
      </View>

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={pickerType === 'day' ? 'Select Day' : pickerType === 'month' ? 'Select Month' : 'Select Year'}
        options={
          pickerType === 'day'
            ? Array.from({ length: daysInMonth - firstDay + 1 }, (_, i) => ({
                label: String(i + firstDay),
                value: i + firstDay,
              }))
            : pickerType === 'month'
            ? MONTHS_FULL.slice(firstMonth - 1).map((m, i) => ({ label: m, value: i + firstMonth }))
            : yearOptions
        }
        selectedValue={
          pickerType === 'day' ? day || undefined
          : pickerType === 'month' ? month || undefined
          : year || undefined
        }
        onSelect={handleSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(228,226,225,0.4)',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
});
