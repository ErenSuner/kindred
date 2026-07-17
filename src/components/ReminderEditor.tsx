import { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { colors, radius, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { Nudge, PRESET_REMINDERS, formatCustomDate } from '@/utils/nudges';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const MAX_REMINDERS = 3;

type Props = {
  reminders: Nudge[];
  onChange: (next: Nudge[]) => void;
  // The event's own date, used to keep custom reminders from landing after it.
  eventDate: Date | null;
};

export function ReminderEditor({ reminders, onChange, eventDate }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [customDateMode, setCustomDateMode] = useState(false);
  const [customDay, setCustomDay] = useState<number | null>(null);
  const [customMonth, setCustomMonth] = useState<number | null>(null);
  const [customYear, setCustomYear] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

  const addReminder = (reminder: Nudge) => {
    if (reminders.length >= MAX_REMINDERS) return;
    if (reminders.some((r) => r.value === reminder.value)) return;
    onChange([...reminders, reminder]);
    setModalVisible(false);
    setCustomDateMode(false);
  };

  const removeReminder = (index: number) => {
    onChange(reminders.filter((_, i) => i !== index));
  };

  const isCustomDateValid = () => {
    if (!customDay || !customMonth || !customYear) return false;
    const customDate = new Date(customYear, customMonth - 1, customDay);
    if (!eventDate) return true; // no event date yet, nothing to validate against
    return customDate.getTime() <= eventDate.getTime();
  };

  const addCustomDateReminder = () => {
    if (!isCustomDateValid()) return;
    const dateStr = `${customYear}-${String(customMonth).padStart(2, '0')}-${String(customDay).padStart(2, '0')}`;
    addReminder({ type: 'custom', label: formatCustomDate(dateStr), value: dateStr });
    setCustomDay(null);
    setCustomMonth(null);
    setCustomYear(null);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { label: String(currentYear), value: currentYear },
    { label: String(currentYear + 1), value: currentYear + 1 },
  ];

  return (
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

      {reminders.length < MAX_REMINDERS ? (
        <Pressable
          onPress={() => { setModalVisible(true); setCustomDateMode(false); }}
          style={({ pressed }) => [styles.addReminderBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
        >
          <Icon name="add" size={18} color={colors.primary} />
          <Txt variant="labelMd" color={colors.primary}>
            Add Reminder {reminders.length > 0 ? `(${reminders.length}/${MAX_REMINDERS})` : ''}
          </Txt>
        </Pressable>
      ) : (
        <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ textAlign: 'center', opacity: 0.7 }}>
          Maximum {MAX_REMINDERS} reminders reached
        </Txt>
      )}

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={pickerType === 'day' ? 'Select Day' : pickerType === 'month' ? 'Select Month' : 'Select Year'}
        options={
          pickerType === 'day'
            ? Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
            : pickerType === 'month'
            ? MONTHS_FULL.map((m, i) => ({ label: m, value: i + 1 }))
            : yearOptions
        }
        selectedValue={
          pickerType === 'day' ? customDay || undefined
          : pickerType === 'month' ? customMonth || undefined
          : customYear || undefined
        }
        onSelect={(val) => {
          if (pickerType === 'day') setCustomDay(val as number);
          else if (pickerType === 'month') setCustomMonth(val as number);
          else setCustomYear(val as number);
          setPickerVisible(false);
        }}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setModalVisible(false); setCustomDateMode(false); }}>
          <Animated.View entering={SlideInDown.duration(300)} style={styles.modalContent}>
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
                    Choose when you&apos;d like to be reminded
                  </Txt>

                  <View style={{ gap: 6 }}>
                    {PRESET_REMINDERS.map((preset) => {
                      const alreadyAdded = reminders.some((r) => r.value === preset.value);
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
                          {alreadyAdded && <Icon name="check" size={18} color={colors.secondary} />}
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
                    style={({ pressed }) => [styles.customDateBtn, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
                  >
                    <Icon name="calendar-today" size={20} color={colors.tertiary} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="labelMd" color={colors.onSurface}>Pick a Specific Date</Txt>
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
                    {eventDate
                      ? `Must be on or before ${MONTHS_SHORT[eventDate.getMonth()]} ${eventDate.getDate()}`
                      : 'Set the event date first for validation'}
                  </Txt>

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <Pressable onPress={() => { setPickerType('day'); setPickerVisible(true); }} style={[styles.input, styles.inputCenter, { flex: 1 }]}>
                      <Txt variant="bodyMd" color={customDay ? colors.onSurface : colors.outline}>{customDay || 'Day'}</Txt>
                    </Pressable>
                    <Pressable onPress={() => { setPickerType('month'); setPickerVisible(true); }} style={[styles.input, styles.inputCenter, { flex: 1.5 }]}>
                      <Txt variant="bodyMd" color={customMonth ? colors.onSurface : colors.outline}>
                        {customMonth ? MONTHS_SHORT[customMonth - 1] : 'Month'}
                      </Txt>
                    </Pressable>
                    <Pressable onPress={() => { setPickerType('year'); setPickerVisible(true); }} style={[styles.input, styles.inputCenter, { flex: 1.2 }]}>
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
                    disabled={!isCustomDateValid()}
                    style={({ pressed }) => [
                      styles.confirmDateBtn,
                      !isCustomDateValid() && { opacity: 0.4 },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Icon name="check" size={18} color={colors.onPrimary} />
                    <Txt variant="labelMd" color={colors.onPrimary}>Add This Date</Txt>
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
  nudgeBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: 16,
    marginTop: spacing.stackSm,
  },
  input: {
    backgroundColor: 'rgba(228,226,225,0.4)',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  inputCenter: { alignItems: 'center', justifyContent: 'center' },
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
