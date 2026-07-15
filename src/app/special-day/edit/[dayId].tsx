import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { usePeople } from '@/context/PeopleContext';

const NUDGES = ['1 Week Before', '1 Day Before', 'Day Of'];
const NOTE_KINDS = ['Gift Idea', 'Memory', 'Reminder', 'Other'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export default function EditSpecialDay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dayId, personId } = useLocalSearchParams<{ dayId: string; personId: string }>();
  const { people, updateSpecialDay, deleteSpecialDay, addNoteToPerson } = usePeople();

  const person = people.find((p) => p.id === personId);
  const specialDay = person?.specialDays?.find((sd) => sd.id === dayId);

  // Occasion state
  const [occasionType, setOccasionType] = useState('Birthday');
  const [occasion, setOccasion] = useState('');
  
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

  const [nudges, setNudges] = useState<string[]>(['1 Week Before', '1 Day Before']);

  // Notes state
  const [notes, setNotes] = useState<{ id: string, kind: string, body: string }[]>([]);
  const [noteBody, setNoteBody] = useState('');
  const [noteKind, setNoteKind] = useState('Gift Idea');

  useEffect(() => {
    if (specialDay) {
      const isBuiltin = ['Birthday', 'Anniversary'].includes(specialDay.title);
      setOccasionType(isBuiltin ? specialDay.title : 'Other');
      setOccasion(specialDay.title);

      const parts = (specialDay.originalDate || '').split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (y !== 1000 && !isNaN(y)) setYear(y);
        if (!isNaN(m)) setMonth(m);
        if (!isNaN(d)) setDay(d);
      }
    }
  }, [specialDay]);

  const toggleNudge = (n: string) =>
    setNudges((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  const addNote = () => {
    if (!noteBody.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      kind: noteKind,
      body: noteBody.trim(),
    };
    setNotes((prev) => [...prev, note]);
    setNoteBody('');
  };

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSubmit = async () => {
    if (!day || !month || !occasion.trim()) {
      alert('Please select an occasion, day, and month.');
      return;
    }

    try {
      const y = year && year !== 1000 ? year : 1000;
      const formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      await updateSpecialDay(dayId ?? '', {
        title: occasion.trim(),
        date: formattedDate,
      });

      // Handle notes (we save them to the person for now)
      if (noteBody.trim()) {
        await addNoteToPerson(personId ?? '', noteKind, noteBody.trim());
      }
      for (const n of notes) {
        await addNoteToPerson(personId ?? '', n.kind, n.body);
      }

      router.back();
    } catch (e) {
      console.error(e);
      alert('Failed to update special day.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Special Day',
      'Are you sure you want to delete this special day?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSpecialDay(dayId ?? '');
              router.back();
            } catch (e) {
              console.error(e);
              alert('Failed to delete special day.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary} style={{ flex: 1, textAlign: 'center' }}>
          Edit Special Day
        </Txt>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Icon name="delete" size={24} color={colors.error} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          
          {/* Important date */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { gap: spacing.stackMd }]}>
            <View style={styles.cardHeader}>
              <Txt variant="headlineMd" color={colors.onSurface}>
                An Important Date
              </Txt>
            </View>
            <View style={{ gap: spacing.stackMd }}>
              <View style={{ gap: 4 }}>
                <FieldLabel>Occasion</FieldLabel>
                <View style={styles.chipWrap}>
                  {['Birthday', 'Anniversary', 'Other'].map((type) => {
                    const active = occasionType === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => {
                          setOccasionType(type);
                          if (type !== 'Other') setOccasion(type);
                          else setOccasion('');
                        }}
                        style={[styles.selectChip, active && styles.selectChipActive]}
                      >
                        <Txt variant="labelMd" color={active ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
                          {type}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={occasion}
                  onChangeText={setOccasion}
                  placeholder="e.g., Graduation"
                  placeholderTextColor={colors.outline}
                  style={[styles.input, occasionType !== 'Other' && { opacity: 0.5 }]}
                  editable={occasionType === 'Other'}
                />
              </View>
              <View style={{ gap: 4 }}>
                <FieldLabel>Date <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{fontWeight: 'normal'}}>(Year optional)</Txt></FieldLabel>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => { setPickerType('day'); setPickerVisible(true); }} style={[styles.input, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                    <Txt variant="bodyMd" color={day ? colors.onSurface : colors.outline}>{day || 'Day'}</Txt>
                  </Pressable>
                  <Pressable onPress={() => { setPickerType('month'); setPickerVisible(true); }} style={[styles.input, { flex: 1.5, alignItems: 'center', justifyContent: 'center' }]}>
                    <Txt variant="bodyMd" color={month ? colors.onSurface : colors.outline}>
                      {month ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1] : 'Month'}
                    </Txt>
                  </Pressable>
                  <Pressable onPress={() => { setPickerType('year'); setPickerVisible(true); }} style={[styles.input, { flex: 1.2, alignItems: 'center', justifyContent: 'center' }]}>
                    <Txt variant="bodyMd" color={year && year !== 1000 ? colors.onSurface : colors.outline}>{year && year !== 1000 ? year : 'Year'}</Txt>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Gentle nudges */}
            <View style={styles.nudgeBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="notifications-active" size={16} color={colors.primary} />
                <Txt variant="labelMd" color={colors.onSurface}>
                  Gentle Nudges
                </Txt>
              </View>
              <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4, marginBottom: 12 }}>
                When would you like to be softly reminded?
              </Txt>
              <View style={styles.chipWrap}>
                {NUDGES.map((n) => {
                  const active = nudges.includes(n);
                  return (
                    <Pressable
                      key={n}
                      onPress={() => toggleNudge(n)}
                      style={[styles.nudgeChip, active && styles.nudgeChipActive]}
                    >
                      {active && <Icon name="check" size={16} color={colors.onPrimaryContainer} />}
                      <Txt variant="labelSm" color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant}>
                        {n}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Notes & Ideas */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={[styles.card, { gap: spacing.stackMd }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="edit-note" size={24} color={colors.tertiary} />
                <Txt variant="headlineMd" color={colors.onSurface}>
                  Notes &amp; Ideas
                </Txt>
              </View>
            </View>

            {/* Note kind selector */}
            <View style={{ gap: 4 }}>
              <FieldLabel>Category</FieldLabel>
              <View style={styles.chipWrap}>
                {NOTE_KINDS.map((k) => {
                  const active = noteKind === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setNoteKind(k)}
                      style={[styles.selectChip, active && styles.selectChipActive]}
                    >
                      <Txt variant="labelMd" color={active ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
                        {k}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Note input */}
            <View style={{ gap: 8 }}>
              <TextInput
                value={noteBody}
                onChangeText={setNoteBody}
                placeholder="Jot down a thought..."
                placeholderTextColor={colors.onSurfaceVariant}
                multiline
                style={styles.noteInput}
              />
              <Pressable
                onPress={addNote}
                style={[styles.addNoteBtn, !noteBody.trim() && { opacity: 0.4 }]}
              >
                <Icon name="add" size={18} color={colors.primary} />
                <Txt variant="labelMd" color={colors.primary}>
                  Add Note
                </Txt>
              </Pressable>
            </View>

            {/* Existing notes newly added in this session */}
            {notes.length > 0 && (
              <View style={{ gap: spacing.stackSm }}>
                {notes.map((n) => (
                  <View key={n.id} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontFamily: 'Inter_400Regular' }}>
                        {n.kind}
                      </Txt>
                      <Pressable onPress={() => removeNote(n.id)} hitSlop={8}>
                        <Icon name="close" size={16} color={colors.onSurfaceVariant} />
                      </Pressable>
                    </View>
                    <Txt variant="bodyMd" color={colors.onSurface}>
                      {n.body}
                    </Txt>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ alignItems: 'center' }}>
            <Button label="Save Changes" icon="check" onPress={handleSubmit} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={pickerType === 'day' ? 'Select Day' : pickerType === 'month' ? 'Select Month' : 'Select Year'}
        options={
          pickerType === 'day' 
            ? Array.from({length: 31}, (_, i) => ({ label: String(i + 1), value: i + 1 }))
            : pickerType === 'month'
            ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => ({ label: m, value: i + 1 }))
            : [{ label: 'Skip Year', value: 1000 }, ...Array.from({length: 101}, (_, i) => ({ label: String(new Date().getFullYear() - i), value: new Date().getFullYear() - i }))]
        }
        selectedValue={pickerType === 'day' ? (day || undefined) : pickerType === 'month' ? (month || undefined) : (year || undefined)}
        onSelect={(val) => {
          if (pickerType === 'day') setDay(val as number);
          else if (pickerType === 'month') setMonth(val as number);
          else setYear(val as number);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
    backgroundColor: colors.background,
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
  nudgeBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: 16,
    marginTop: spacing.stackSm,
  },
  nudgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  nudgeChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  noteInput: {
    backgroundColor: 'rgba(228,226,225,0.3)',
    borderRadius: radius.DEFAULT,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    marginTop: 12,
  },
  noteCard: {
    backgroundColor: colors.inverseOnSurface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(215,193,193,0.3)',
    gap: 6,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
