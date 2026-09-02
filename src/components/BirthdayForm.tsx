import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DateFields, type DateValue } from '@/components/DateFields';
import { ImportanceSlider } from '@/components/ImportanceSlider';
import { Txt } from '@/components/Txt';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { SKIPPED_YEAR } from '@/utils/dates';
import type { Importance } from '@/utils/importance';

export type BirthdayDraft = {
  name: string;
  date: DateValue;
  importance: Importance;
};

// The whole of what a birthday is: three fields, shared by the add and edit
// screens so the two can never drift apart.
export function BirthdayForm({
  draft,
  onChange,
  autoFocus,
}: {
  draft: BirthdayDraft;
  onChange: (next: BirthdayDraft) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const { c } = useTheme();

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <FieldLabel>{t('name')}</FieldLabel>
        <TextInput
          value={draft.name}
          onChangeText={(name) => onChange({ ...draft, name })}
          placeholder={t('who_is_it')}
          placeholderTextColor={c.faint}
          autoFocus={autoFocus}
          autoCapitalize="words"
          returnKeyType="done"
          style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
        />
      </View>

      <View style={styles.field}>
        <FieldLabel>{t('date')}</FieldLabel>
        <DateFields value={draft.date} onChange={(date) => onChange({ ...draft, date })} />
      </View>

      <View style={styles.field}>
        <FieldLabel>{t('importance')}</FieldLabel>
        <ImportanceSlider
          value={draft.importance}
          onChange={(importance) => onChange({ ...draft, importance })}
        />
      </View>
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

// What the form says is wrong, or null when it is ready to save. Returned as a
// translation key so the caller decides when to show it — validating on every
// keystroke would tell the user their empty form is empty.
export function validate(draft: BirthdayDraft): string | null {
  if (!draft.name.trim()) return 'give_the_birthday_a_name';
  if (!draft.date.day || !draft.date.month) return 'pick_a_day_and_a_month';
  return null;
}

// 'YYYY-MM-DD', with a skipped year stored as 1000. The birthday still cycles
// yearly; it just carries no age.
export function toStoredDate(date: DateValue): string {
  const year = date.year && date.year !== SKIPPED_YEAR ? date.year : SKIPPED_YEAR;
  return `${year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

export function fromStoredDate(stored: string): DateValue {
  const [year, month, day] = stored.split('-').map(Number);
  return { day, month, year };
}

const styles = StyleSheet.create({
  form: { gap: spacing.stackLg },
  field: { gap: 10 },
  fieldLabel: { marginLeft: 2 },
  input: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
  },
});
