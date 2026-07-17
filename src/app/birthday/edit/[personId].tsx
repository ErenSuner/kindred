import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { usePeople } from '@/context/PeopleContext';

const PRESET_REMINDERS = [
  { label: 'Day Of', value: 'day_of' },
  { label: '1 Day Before', value: '1_day' },
  { label: '3 Days Before', value: '3_days' },
  { label: '1 Week Before', value: '1_week' },
  { label: '2 Weeks Before', value: '2_weeks' },
  { label: '1 Month Before', value: '1_month' },
  { label: '2 Months Before', value: '2_months' },
];

const MAX_REMINDERS = 3;

type Reminder = {
  type: 'preset' | 'custom';
  label: string;
  value: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatCustomDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

export default function EditBirthday() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { people, updateBirthday, deleteBirthday } = usePeople();

  const person = people.find((p) => p.id === personId);
  const birthday = person?.birthday;

  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

  // Reminder state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [customDateMode, setCustomDateMode] = useState(false);
  const [customDay, setCustomDay] = useState<number | null>(null);
  const [customMonth, setCustomMonth] = useState<number | null>(null);
  const [customYear, setCustomYear] = useState<number | null>(null);
  const [customPickerVisible, setCustomPickerVisible] = useState(false);
  const [customPickerType, setCustomPickerType] = useState<'day' | 'month' | 'year'>('day');

  useEffect(() => {
    if (birthday) {
      const parts = (birthday.date || '').split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (y !== 1000 && !isNaN(y)) setYear(y);
        if (!isNaN(m)) setMonth(m);
        if (!isNaN(d)) setDay(d);
      }

      // Initialize reminders from bd.nudges
      if (birthday.nudges && birthday.nudges.length > 0) {
        const parsed = birthday.nudges.map((val: string) => {
          const preset = PRESET_REMINDERS.find(p => p.value === val);
          if (preset) {
            return { type: 'preset' as const, label: preset.label, value: val };
          } else {
            return { type: 'custom' as const, label: formatCustomDate(val), value: val };
          }
        });
        setReminders(parsed);
      }
    }
  }, [birthday]);

  const addReminder = (reminder: Reminder) => {
    if (reminders.length >= MAX_REMINDERS) return;
    if (reminders.some(r => r.type === reminder.type && r.value === reminder.value)) return;
    setReminders(prev => [...prev, reminder]);
    setReminderModalVisible(false);
    setCustomDateMode(false);
  };

  const removeReminder = (index: number) => {
    setReminders(prev => prev.filter((_, i) => i !== index));
  };

  const getBirthdayDate = (): Date | null => {
    if (!day || !month) return null;
    const y = year && year !== 1000 ? year : new Date().getFullYear();
    return new Date(y, month - 1, day);
  };

  const isCustomDateValid = (): boolean => {
    if (!customDay || !customMonth || !customYear) return false;
    const customDate = new Date(customYear, customMonth - 1, customDay);
    const eventDate = getBirthdayDate();
    if (!eventDate) return true;
    return customDate.getTime() <= eventDate.getTime();
  };

  const addCustomDateReminder = () => {
    if (!customDay || !customMonth || !customYear) return;
    if (!isCustomDateValid()) return;
    const dateStr = `${customYear}-${String(customMonth).padStart(2, '0')}-${String(customDay).padStart(2, '0')}`;
    addReminder({
      type: 'custom',
      label: formatCustomDate(dateStr),
      value: dateStr,
    });
    setCustomDay(null);
    setCustomMonth(null);
    setCustomYear(null);
  };

  const handleSubmit = async () => {
    if (!day || !month || !birthday) {
      alert('Please select a day and month.');
      return;
    }

    try {
      const y = year && year !== 1000 ? year : 1000;
      const formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      await updateBirthday(birthday.id, {
        date: formattedDate,
        nudges: reminders.map(r => r.value)
      });

      router.back();
    } catch (e) {
      console.error(e);
      alert('Failed to update birthday.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Birthday',
      'Are you sure you want to delete this birthday?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (!birthday) return;
            try {
              await deleteBirthday(birthday.id);
              router.back();
            } catch (e) {
              console.error(e);
              alert('Failed to delete birthday.');
            }
          }
        }
      ]
    );
  };

  const currentYear = new Date().getFullYear();
  const customYearOptions = [
    { label: String(currentYear), value: currentYear },
    { label: String(currentYear + 1), value: currentYear + 1 },
  ];

  if (!birthday) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Txt>Loading...</Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary} style={{ flex: 1, textAlign: 'center' }}>
          Edit Birthday
        </Txt>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Icon name="delete" size={24} color={colors.error} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.containerMobile, gap: spacing.stackLg, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { gap: spacing.stackMd }]}>
            <View style={styles.cardHeader}>
              <Txt variant="headlineMd" color={colors.onSurface}>
                Birthday
              </Txt>
              <Icon name="cake" size={24} color={colors.primary} />
            </View>
            <View style={{ gap: spacing.stackMd }}>
              <View style={{ gap: 4 }}>
                <FieldLabel>Date <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{fontWeight: 'normal'}}>(Year optional)</Txt></FieldLabel>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => { setPickerType('day'); setPickerVisible(true); }} style={[styles.input, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                    <Txt variant="bodyMd" color={day ? colors.onSurface : colors.outline}>{day || 'Day'}</Txt>
                  </Pressable>
                  <Pressable onPress={() => { setPickerType('month'); setPickerVisible(true); }} style={[styles.input, { flex: 1.5, alignItems: 'center', justifyContent: 'center' }]}>
                    <Txt variant="bodyMd" color={month ? colors.onSurface : colors.outline}>
                      {month ? MONTHS_SHORT[month - 1] : 'Month'}
                    </Txt>
                  </Pressable>
                  <Pressable onPress={() => { setPickerType('year'); setPickerVisible(true); }} style={[styles.input, { flex: 1.2, alignItems: 'center', justifyContent: 'center' }]}>
                    <Txt variant="bodyMd" color={year && year !== 1000 ? colors.onSurface : colors.outline}>{year && year !== 1000 ? year : 'Year'}</Txt>
                  </Pressable>
                </View>
              </View>

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

                {reminders.length > 0 && (
                  <View style={{ gap: 8, marginBottom: 12 }}>
                    {reminders.map((r, i) => (
                      <View key={`${r.value}-${i}`} style={styles.reminderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Icon name={r.type === 'custom' ? 'calendar-today' : 'schedule'} size={16} color={colors.primary} />
                          <Txt variant="labelMd" color={colors.onSurface}>{r.label}</Txt>
                        </View>
                        <Pressable onPress={() => removeReminder(i)} hitSlop={8}>
                          <Icon name="close" size={16} color={colors.onSurfaceVariant} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {reminders.length < MAX_REMINDERS && (
                  <Pressable
                    onPress={() => { setReminderModalVisible(true); setCustomDateMode(false); }}
                    style={({ pressed }) => [
                      styles.addReminderBtn,
                      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Icon name="add" size={18} color={colors.primary} />
                    <Txt variant="labelMd" color={colors.primary}>
                      Add Reminder {reminders.length > 0 ? `(${reminders.length}/${MAX_REMINDERS})` : ''}
                    </Txt>
                  </Pressable>
                )}
                {reminders.length >= MAX_REMINDERS && (
                  <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center', opacity: 0.7 }}>
                    Maximum {MAX_REMINDERS} reminders reached
                  </Txt>
                )}
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ alignItems: 'center' }}>
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
            ? MONTHS_FULL.map((m, i) => ({ label: m, value: i + 1 }))
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

      <ScrollPickerModal
        visible={customPickerVisible}
        onClose={() => setCustomPickerVisible(false)}
        title={customPickerType === 'day' ? 'Select Day' : customPickerType === 'month' ? 'Select Month' : 'Select Year'}
        options={
          customPickerType === 'day'
            ? Array.from({length: 31}, (_, i) => ({ label: String(i + 1), value: i + 1 }))
            : customPickerType === 'month'
            ? MONTHS_FULL.map((m, i) => ({ label: m, value: i + 1 }))
            : customYearOptions
        }
        selectedValue={customPickerType === 'day' ? (customDay || undefined) : customPickerType === 'month' ? (customMonth || undefined) : (customYear || undefined)}
        onSelect={(val) => {
          if (customPickerType === 'day') setCustomDay(val as number);
          else if (customPickerType === 'month') setCustomMonth(val as number);
          else setCustomYear(val as number);
          setCustomPickerVisible(false);
        }}
      />

      <Modal visible={reminderModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setReminderModalVisible(false); setCustomDateMode(false); }}>
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={styles.modalContent}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant }} />
              </View>

              {!customDateMode ? (
                <>
                  <Txt variant="headlineMd" color={colors.onSurface} style={{ marginBottom: 4 }}>
                    Add Reminder
                  </Txt>
                  <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: 20 }}>
                    Choose when you'd like to be reminded
                  </Txt>

                  <View style={{ gap: 6 }}>
                    {PRESET_REMINDERS.map((preset) => {
                      const alreadyAdded = reminders.some(r => r.type === 'preset' && r.value === preset.value);
                      return (
                        <Pressable
                          key={preset.value}
                          onPress={() => {
                            if (!alreadyAdded) {
                              addReminder({ type: 'preset', label: preset.label, value: preset.value });
                            }
                          }}
                          disabled={alreadyAdded}
                          style={({ pressed }) => [
                            styles.presetRow,
                            alreadyAdded && { opacity: 0.4 },
                            pressed && !alreadyAdded && { backgroundColor: colors.surfaceContainerHigh },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Icon name="schedule" size={20} color={alreadyAdded ? colors.outline : colors.primary} />
                            <Txt variant="bodyMd" color={alreadyAdded ? colors.outline : colors.onSurface}>
                              {preset.label}
                            </Txt>
                          </View>
                          {alreadyAdded && (
                            <Icon name="check" size={18} color={colors.secondary} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceVariant }} />
                    <Txt variant="labelSm" color={colors.onSurfaceVariant}>OR</Txt>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceVariant }} />
                  </View>

                  <Pressable
                    onPress={() => setCustomDateMode(true)}
                    style={({ pressed }) => [
                      styles.customDateBtn,
                      pressed && { backgroundColor: colors.surfaceContainerHigh },
                    ]}
                  >
                    <Icon name="calendar-today" size={20} color={colors.tertiary} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="labelMd" color={colors.onSurface}>
                        Pick a Specific Date
                      </Txt>
                      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ fontWeight: 'normal' }}>
                        Choose an exact date from the calendar
                      </Txt>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => setCustomDateMode(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                    <Icon name="arrow-back" size={20} color={colors.primary} />
                    <Txt variant="labelMd" color={colors.primary}>Back</Txt>
                  </Pressable>

                  <Txt variant="headlineMd" color={colors.onSurface} style={{ marginBottom: 4 }}>
                    Pick a Date
                  </Txt>
                  <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: 20 }}>
                    {day && month ? `Must be on or before ${MONTHS_SHORT[month - 1]} ${day}` : 'Set the event date first for validation'}
                  </Txt>

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <Pressable onPress={() => { setCustomPickerType('day'); setCustomPickerVisible(true); }} style={[styles.input, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                      <Txt variant="bodyMd" color={customDay ? colors.onSurface : colors.outline}>{customDay || 'Day'}</Txt>
                    </Pressable>
                    <Pressable onPress={() => { setCustomPickerType('month'); setCustomPickerVisible(true); }} style={[styles.input, { flex: 1.5, alignItems: 'center', justifyContent: 'center' }]}>
                      <Txt variant="bodyMd" color={customMonth ? colors.onSurface : colors.outline}>
                        {customMonth ? MONTHS_SHORT[customMonth - 1] : 'Month'}
                      </Txt>
                    </Pressable>
                    <Pressable onPress={() => { setCustomPickerType('year'); setCustomPickerVisible(true); }} style={[styles.input, { flex: 1.2, alignItems: 'center', justifyContent: 'center' }]}>
                      <Txt variant="bodyMd" color={customYear ? colors.onSurface : colors.outline}>{customYear || 'Year'}</Txt>
                    </Pressable>
                  </View>

                  {customDay && customMonth && customYear && !isCustomDateValid() && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Icon name="error-outline" size={16} color={colors.error} />
                      <Txt variant="labelSm" color={colors.error}>
                        Reminder date must be before the event date
                      </Txt>
                    </View>
                  )}

                  <Pressable
                    onPress={addCustomDateReminder}
                    disabled={!customDay || !customMonth || !customYear || !isCustomDateValid()}
                    style={({ pressed }) => [
                      styles.confirmDateBtn,
                      (!customDay || !customMonth || !customYear || !isCustomDateValid()) && { opacity: 0.4 },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Icon name="check" size={18} color={colors.onPrimary} />
                    <Txt variant="labelMd" color={colors.onPrimary}>
                      Add This Date
                    </Txt>
                  </Pressable>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
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
  nudgeBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: 16,
    marginTop: spacing.stackSm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  addReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 48,
    maxHeight: '80%',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  customDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  confirmDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
});
