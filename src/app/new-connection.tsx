import { describeWriteError } from '@/utils/loadError';
import { AvatarPicker } from '@/components/AvatarPicker';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SelectableChip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { showHeld } from '@/components/HeldNotice';
import { usePeople } from '@/context/PeopleContext';
import type { Relationship } from '@/data/mock';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import { relationshipLabel } from '@/utils/relationshipLabel';

const RELATIONSHIPS: Relationship[] = ['Family', 'Friend', 'Partner', 'Colleague', 'Acquaintance'];

export default function NewConnection() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { addPerson, people } = usePeople();

  // Form state
  const [relationship, setRelationship] = useState<Relationship>('Friend');
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // The person has no id yet, so uploads are filed under a one-off key.
  const [draftId] = useState(() => `draft-${Date.now()}`);

  // Validation
  const [nameError, setNameError] = useState('');
  const [duplicateAlertVisible, setDuplicateAlertVisible] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('please_enter_name'));
      return;
    }

    const nameExists = people.some(
      (p) => p.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      setNameError(t('name_already_here'));
      setDuplicateAlertVisible(true);
      return;
    }

    try {
      await addPerson({
        name: trimmedName,
        role: relationship,
        avatarUrl,
      });
      router.back();
      showHeld(t('in_your_circle_named', { name: trimmedName }), t('birthday_takes_from_here'));
    } catch (e) {
      console.error(e);
      setNameError(describeWriteError(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="close" size={26} color={c.muted} />
        </Pressable>
        <Txt variant="heading">{t('someone_new')}</Txt>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            paddingTop: spacing.stackLg,
            paddingBottom: insets.bottom + 140,
            gap: spacing.stackLg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The faster path in, offered up top for anyone who'd rather pull a
              name straight from their phone than type it. */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <Pressable
              onPress={() => router.push('/import-contacts' as any)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Card style={styles.importRow}>
                <View style={[styles.importIcon, { backgroundColor: c.flameWash }]}>
                  <Icon name="contacts" size={20} color={c.flameDeep} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="bodyMed">{t('import_from_contacts')}</Txt>
                  <Txt variant="sub" color={c.muted} numberOfLines={1} style={{ marginTop: 1 }}>
                    {t('import_from_contacts_sub')}
                  </Txt>
                </View>
                <Icon name="chevron-right" size={20} color={c.faint} />
              </Card>
            </Pressable>
          </Animated.View>

          {/* The face first — it's the content. */}
          <Animated.View entering={FadeInDown.duration(500).delay(50)} style={{ alignItems: 'center' }}>
            <AvatarPicker
              uri={avatarUrl}
              initials={name.trim().charAt(0).toUpperCase() || undefined}
              subjectId={draftId}
              onUploaded={setAvatarUrl}
              onError={setNameError}
            />
          </Animated.View>

          {/* Basics */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Card style={{ gap: spacing.stackMd }}>
              <View style={{ gap: 6 }}>
                <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('their_name')}</Txt>
                <TextInput
                  value={name}
                  onChangeText={(t) => { setName(t); setNameError(''); }}
                  placeholder={t('e_g_eleanor')}
                  placeholderTextColor={c.faint}
                  style={[
                    styles.input,
                    { backgroundColor: c.surfaceAlt, color: c.text },
                    !!nameError && { borderWidth: 1, borderColor: c.danger },
                  ]}
                />
                {!!nameError && (
                  <Txt variant="sub" color={c.danger} style={{ marginTop: 4, marginLeft: 2 }}>
                    {nameError}
                  </Txt>
                )}
              </View>
              <View style={{ gap: 8 }}>
                <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('relationship')}</Txt>
                <View style={styles.chipWrap}>
                  {RELATIONSHIPS.map((r) => (
                    <SelectableChip
                      key={r}
                      label={relationshipLabel(r)}
                      active={relationship === r}
                      onPress={() => setRelationship(r)}
                    />
                  ))}
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button label={t('add_to_kindred')} icon="person-add" onPress={handleSubmit} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Duplicate name alert */}
      <Modal visible={duplicateAlertVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="error-outline" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>{t('already_here')}</Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center' }}>
              {t('duplicate_name_body', { name: name.trim() })}</Txt>
            <Button label={t('got_it')} onPress={() => setDuplicateAlertVisible(false)} fullWidth style={{ marginTop: 24 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  importIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { marginLeft: 2 },
  input: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.figtreeRegular,
    fontSize: 18,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
