import { Button } from '@/components/Button';
import { SelectableChip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { usePeople } from '@/context/PeopleContext';
import type { Relationship } from '@/data/mock';
import { ambientShadow, colors, radius, softShadow, spacing } from '@/theme/tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RELATIONSHIPS: Relationship[] = ['Family', 'Friend', 'Partner', 'Colleague', 'Acquaintance'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export default function EditConnection() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { updatePerson, getPerson, people, addNoteToPerson } = usePeople();

  const person = getPerson(id ?? '');

  // Form state
  const [relationship, setRelationship] = useState<Relationship>('Friend');
  const [name, setName] = useState('');

  // Validation
  const [nameError, setNameError] = useState('');
  const [duplicateAlertVisible, setDuplicateAlertVisible] = useState(false);

  useEffect(() => {
    if (person) {
      setName(person.name);
      setRelationship(person.role as Relationship);
    }
  }, [person]);



  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Please enter a name');
      return;
    }

    const nameExists = people.some(
      (p) => p.id !== person?.id && p.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      setNameError('A connection with this name already exists.');
      setDuplicateAlertVisible(true);
      return;
    }

    try {
      await updatePerson(id ?? '', {
        name: trimmedName,
        role: relationship,
      });

      router.back();
    } catch (e) {
      console.error('Failed to update connection:', e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="close" size={26} color={colors.onSurfaceVariant} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.onSurface}>
          Edit Connection
        </Txt>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            paddingTop: spacing.stackLg,
            paddingBottom: insets.bottom + 140,
            gap: spacing.stackXl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
            <Pressable style={styles.avatarUpload}>
              <Icon name="add-a-photo" size={30} color={colors.onSurfaceVariant} />
            </Pressable>
            <Txt variant="headlineLgMobile" color={colors.onSurface} style={{ marginTop: 24, textAlign: 'center' }}>
              Edit Connection
            </Txt>
            <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center', maxWidth: 320 }}>
              Update the details for this connection.
            </Txt>
          </Animated.View>

          {/* Basics */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { gap: spacing.stackMd }]}>
            <View style={{ gap: 4 }}>
              <FieldLabel>Their Name</FieldLabel>
              <TextInput
                value={name}
                onChangeText={(t) => { setName(t); setNameError(''); }}
                placeholder="e.g., Eleanor"
                placeholderTextColor={colors.outline}
                style={[styles.input, styles.inputLg, !!nameError && styles.inputError]}
              />
              {!!nameError && (
                <Txt variant="labelSm" color={colors.error} style={{ marginTop: 4, marginLeft: 2 }}>
                  {nameError}
                </Txt>
              )}
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>Relationship</FieldLabel>
              <View style={styles.chipWrap}>
                {RELATIONSHIPS.map((r) => (
                  <SelectableChip
                    key={r}
                    label={r}
                    active={relationship === r}
                    onPress={() => setRelationship(r)}
                    isRole
                  />
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
            <Button label="Save Changes" icon="check" onPress={handleSubmit} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Duplicate Name Alert Modal */}
      <Modal visible={duplicateAlertVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(200)} style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Icon name="error" size={32} color={colors.error} />
            </View>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
              Name Exists
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>
              You already have a connection named "{name.trim()}". Please use a different name or add a last initial.
            </Txt>
            <Button label="Got it" onPress={() => setDuplicateAlertVisible(false)} fullWidth style={{ marginTop: 24 }} />
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
    backgroundColor: colors.background,
  },
  avatarUpload: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    ...softShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { letterSpacing: 1, marginLeft: 2 },
  input: {
    backgroundColor: 'rgba(228,226,225,0.4)',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  inputLg: { fontSize: 18 },
  inputError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  selectChipActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...ambientShadow,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
