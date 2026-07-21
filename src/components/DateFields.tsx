import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { SKIPPED_YEAR } from '@/utils/dates';
import { useTranslation } from 'react-i18next';


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
  const { t } = useTranslation();
  const { c } = useTheme();
  const monthShort = (m: number) => t(`month_sh_${m}`);
  const monthFull = (m: number) => t(`month_${m}`);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');
  // Set when a choice was quietly moved forward, so the change is at least
  // admitted to rather than just happening.
  const [nudgedTo, setNudgedTo] = useState<string | null>(null);

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

  const yearOptions = allowSkipYear ? [{ label: t('skip_year'), value: SKIPPED_YEAR }, ...years] : years;

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

  const noticeFor = (m: number, d: number) => t('moved_to', { date: `${monthShort(m - 1)} ${d}` });

  const handleSelect = (val: string | number) => {
    const n = val as number;
    setNudgedTo(null);

    if (pickerType === 'day') {
      onChange({ ...value, day: n });
    } else if (pickerType === 'month') {
      // Changing to a shorter month would otherwise leave an impossible day behind.
      const maxDay = new Date(hasYear ? (year as number) : 2024, n, 0).getDate();
      let nextDay = day && day > maxDay ? maxDay : day;
      // Moving onto the current month can strand a day that has already been.
      if (blocksPast && n === today.getMonth() + 1 && nextDay && nextDay < today.getDate()) {
        nextDay = today.getDate();
        setNudgedTo(noticeFor(n, nextDay));
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
          setNudgedTo(noticeFor(nextMonth, nextDay));
        } else if (nextMonth === today.getMonth() + 1 && nextDay && nextDay < today.getDate()) {
          nextDay = today.getDate();
          setNudgedTo(noticeFor(nextMonth, nextDay));
        }
      }
      onChange({ ...value, year: n, month: nextMonth, day: nextDay });
    }
    setPickerVisible(false);
  };

  const field = { backgroundColor: c.surfaceAlt };

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => open('day')} style={[styles.input, styles.center, field, { flex: 1 }]}>
          <Txt variant="body" color={day ? c.text : c.faint}>{day || t('day')}</Txt>
        </Pressable>
        <Pressable onPress={() => open('month')} style={[styles.input, styles.center, field, { flex: 1.5 }]}>
          <Txt variant="body" color={month ? c.text : c.faint}>
            {month ? monthShort(month - 1) : t('month')}
          </Txt>
        </Pressable>
        <Pressable onPress={() => open('year')} style={[styles.input, styles.center, field, { flex: 1.2 }]}>
          <Txt variant="body" color={hasYear ? c.text : c.faint}>{hasYear ? year : t('year')}</Txt>
        </Pressable>
      </View>

      {nudgedTo && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.notice}>
          <Icon name="info" size={13} color={c.muted} />
          <Txt variant="sub" color={c.muted} style={styles.noticeText}>
            {nudgedTo}
          </Txt>
        </Animated.View>
      )}

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={pickerType === 'day' ? t('select_day') : pickerType === 'month' ? t('select_month') : t('select_year')}
        options={
          pickerType === 'day'
            ? Array.from({ length: daysInMonth - firstDay + 1 }, (_, i) => ({
                label: String(i + firstDay),
                value: i + firstDay,
              }))
            : pickerType === 'month'
            ? Array.from({ length: 12 - (firstMonth - 1) }, (_, i) => ({ label: monthFull(firstMonth - 1 + i), value: firstMonth + i }))
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
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 2,
  },
  noticeText: { opacity: 0.85, flex: 1 },
});
