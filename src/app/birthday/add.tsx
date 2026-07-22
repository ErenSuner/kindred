import { describeWriteError } from '@/utils/loadError';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateFields, DateValue } from '@/components/DateFields';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { ReminderEditor } from '@/components/ReminderEditor';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { useBirthdays, DEFAULT_BIRTHDAY_EMOJI, EMOJI_CHOICES } from '@/context/BirthdaysContext';
import { usePeople } from '@/context/PeopleContext';
import { normalize } from '@/utils/search';
import type { Person } from '@/data/mock';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Nudge, serializeNudges } from '@/utils/nudges';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>
      {children}
    </Txt>
  );
}

export default function AddBirthday() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { addBirthday } = useBirthdays();
  const { people } = usePeople();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_BIRTHDAY_EMOJI);
  const [date, setDate] = useState<DateValue>({ day: null, month: null, year: null });
  const { day, month, year } = date;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A person in the circle carrying the same name, if there is one.
  const [personMatch, setPersonMatch] = useState<Person | null>(null);

  const [reminders, setReminders] = useState<Nudge[]>([
    { type: 'preset', label: '1 Week Before', value: '1_week' },
    { type: 'preset', label: '1 Day Before', value: '1_day' },
  ]);

  const hasYear = year !== null && year !== 1000;

  const eventDate = (): Date | null => {
    if (!day || !month) return null;
    const y = hasYear ? (year as number) : new Date().getFullYear();
    return new Date(y, month - 1, day);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError(i18n.t('give_the_birthday_a_name'));
      return;
    }
    if (!day || !month) {
      setError(i18n.t('pick_a_day_and_a_month'));
      return;
    }

    // Someone already in the circle under this name almost certainly is this
    // person. A loose birthday beside their card would mean two reminders and
    // two places to edit, so the offer is to set it on the card instead.
    const match = people.find((p) => normalize(p.name) === normalize(name.trim()));
    if (match) {
      setPersonMatch(match);
      return;
    }

    await save();
  };

  const save = async () => {
    // A skipped year is stored as 1000 — the birthday still cycles yearly, it
    // just carries no age.
    const y = hasYear ? year : 1000;
    const formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    setSaving(true);
    try {
      await addBirthday({
        name: name.trim(),
        date: formattedDate,
        emoji,
        nudges: serializeNudges(reminders),
      });
      router.back();
      showHeld(
        t('is_remembered', { title: name.trim() }),
        reminders.length > 0
          ? t('on_the_day_plus_reminders', { count: reminders.length })
          : i18n.t('we_ll_remind_you_on_the_day'),
      );
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
          {t('new_birthday')}</Txt>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Card style={{ gap: spacing.stackMd }}>
              <View style={{ gap: 6 }}>
                <FieldLabel>{t('name')}</FieldLabel>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('e_g_aunt_ayse')}
                  placeholderTextColor={c.faint}
                  style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
                />
              </View>

              <View style={{ gap: 6 }}>
                <FieldLabel>{t('emoji')}</FieldLabel>
                <View style={styles.chipWrap}>
                  {EMOJI_CHOICES.map((e) => {
                    const active = emoji === e;
                    return (
                      <Pressable
                        key={e}
                        onPress={() => setEmoji(e)}
                        style={[
                          styles.emojiChip,
                          {
                            backgroundColor: active ? c.flameWash : c.surfaceAlt,
                            borderColor: active ? c.flame : 'transparent',
                          },
                        ]}
                      >
                        <Txt style={{ fontSize: 22, lineHeight: 28 }}>{e}</Txt>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <FieldLabel>{t('date_year_optional')}</FieldLabel>
                <DateFields value={date} onChange={setDate} yearMode="past" allowSkipYear />
              </View>

              <ReminderEditor reminders={reminders} onChange={setReminders} eventDate={eventDate()} />
            </Card>
          </Animated.View>

          <FormError message={error} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button label={saving ? t('saving') : t('save_birthday')} icon="check" onPress={handleSubmit} disabled={saving} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Same name already in the circle */}
      <Modal visible={personMatch !== null} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.flameWash }]}>
              <Icon name="person" size={30} color={c.flameDeep} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>{t('already_in_your_people')}</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {t('set_their_birthday_q', { name: personMatch?.name })}
            </Txt>

            <View style={{ width: '100%', gap: 12, marginTop: 24 }}>
              <Button
                label={t('go_to_their_card')}
                icon="arrow-forward"
                onPress={() => {
                  const personId = personMatch?.id;
                  setPersonMatch(null);
                  if (personId) {
                    router.replace({
                      pathname: '/birthday/person/[personId]',
                      params: { personId },
                    } as any);
                  }
                }}
                fullWidth
              />
              <Button
                label={t('no_someone_else')}
                variant="quiet"
                onPress={() => {
                  setPersonMatch(null);
                  save();
                }}
                disabled={saving}
                fullWidth
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
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
  fieldLabel: { marginLeft: 2 },
  input: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  modalContent: {
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
