import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { BirthdayForm, toStoredDate, validate, type BirthdayDraft } from '@/components/BirthdayForm';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { useBirthdays } from '@/context/BirthdaysContext';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { describeWriteError } from '@/utils/loadError';
import { DEFAULT_IMPORTANCE, leadDaysFor } from '@/utils/importance';

export default function AddBirthday() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { addBirthday } = useBirthdays();

  const [draft, setDraft] = useState<BirthdayDraft>({
    name: '',
    date: { day: null, month: null, year: null },
    importance: DEFAULT_IMPORTANCE,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const problem = validate(draft);
    if (problem) {
      setError(t(problem));
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await addBirthday({
        name: draft.name.trim(),
        date: toStoredDate(draft.date),
        importance: draft.importance,
      });
      router.back();
      // The reassurance is the product: say the job has been taken on, and say
      // when the reminder will arrive rather than leaving them to hope.
      const lead = leadDaysFor(draft.importance);
      showHeld(
        t('is_remembered', { title: draft.name.trim() }),
        lead > 0 ? t('remind_lead', { n: lead }) : t('remind_on_the_day'),
      );
    } catch (e) {
      // What they typed stays exactly where it is.
      setError(describeWriteError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('back')}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        <Txt variant="title" style={styles.headerTitle}>
          {t('new_birthday')}
        </Txt>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <BirthdayForm draft={draft} onChange={setDraft} autoFocus />

          <FormError message={error} />

          <Button
            label={saving ? t('saving') : t('save')}
            onPress={save}
            disabled={saving}
            fullWidth
          />
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
});
