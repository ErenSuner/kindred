import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  BirthdayForm,
  fromStoredDate,
  toStoredDate,
  validate,
  type BirthdayDraft,
} from '@/components/BirthdayForm';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { useBirthdays } from '@/context/BirthdaysContext';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { describeWriteError } from '@/utils/loadError';
import { leadDaysFor } from '@/utils/importance';

export default function EditBirthday() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBirthday, updateBirthday, deleteBirthdayWithUndo } = useBirthdays();

  const birthday = getBirthday(String(id));

  const [draft, setDraft] = useState<BirthdayDraft | null>(
    birthday
      ? {
          name: birthday.name,
          date: fromStoredDate(birthday.originalDate),
          importance: birthday.importance,
        }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reached by a stale link, or after the row was deleted from under this
  // screen. Nothing useful to edit, so say so rather than showing a blank form.
  if (!birthday || !draft) {
    return (
      <View style={[styles.missing, { backgroundColor: c.bg, paddingTop: insets.top + 60 }]}>
        <Txt variant="heading">{t('birthday_not_found')}</Txt>
        <Button label={t('back')} variant="quiet" onPress={() => router.back()} />
      </View>
    );
  }

  const save = async () => {
    const problem = validate(draft);
    if (problem) {
      setError(t(problem));
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await updateBirthday(birthday.id, {
        name: draft.name.trim(),
        date: toStoredDate(draft.date),
        importance: draft.importance,
      });
      router.back();
      const lead = leadDaysFor(draft.importance);
      showHeld(
        t('is_remembered', { title: draft.name.trim() }),
        lead > 0 ? t('remind_lead', { n: lead }) : t('remind_on_the_day'),
      );
    } catch (e) {
      setError(describeWriteError(e));
    } finally {
      setSaving(false);
    }
  };

  // No confirmation dialog: the undo window is the confirmation, and it does
  // not make the user answer a question about something they have not done yet.
  const remove = () => {
    deleteBirthdayWithUndo(birthday);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('back')}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        <Txt variant="title" style={styles.headerTitle}>
          {t('edit_birthday')}
        </Txt>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <BirthdayForm draft={draft} onChange={setDraft} />

          <FormError message={error} />

          <Button
            label={saving ? t('saving') : t('save')}
            onPress={save}
            disabled={saving}
            fullWidth
          />

          <Button label={t('delete')} variant="danger" icon="delete-outline" onPress={remove} fullWidth />
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
    paddingBottom: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', marginRight: 24 },
  scroll: {
    padding: spacing.containerMobile,
    gap: spacing.stackLg,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    gap: 20,
    padding: spacing.containerMobile,
  },
});
