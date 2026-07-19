import { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { colors, radius, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import {
  DAY_OF,
  LEAD_UNITS,
  LeadUnit,
  MAX_LEAD_PICK,
  Nudge,
  PRESET_OFFSET_DAYS,
  PRESET_REMINDERS,
  leadLabel,
  leadValue,
  offsetDaysFor,
} from '@/utils/nudges';

export const MAX_REMINDERS = 4;

type Props = {
  reminders: Nudge[];
  onChange: (next: Nudge[]) => void;
  // The event's own date. Kept for call-site compatibility; lead times are
  // relative so nothing needs validating against it any more.
  eventDate?: Date | null;
  // Caps how far ahead a reminder can be set. A weekly routine passes 6: "a
  // week before" a weekly thing is the previous occurrence, so offering it
  // would just fire every week and say nothing.
  maxLeadDays?: number;
};

// Everything except the day itself, which is fixed and shown separately.
const ALL_PRESETS = PRESET_REMINDERS.filter((p) => p.value !== DAY_OF);

export function ReminderEditor({ reminders, onChange, maxLeadDays }: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [leadAmount, setLeadAmount] = useState(4);
  const [leadUnit, setLeadUnit] = useState<LeadUnit>('day');
  const [amountPickerVisible, setAmountPickerVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const withinLimit = (days: number) => maxLeadDays === undefined || days <= maxLeadDays;
  const CHOOSABLE_PRESETS = ALL_PRESETS.filter((p) => withinLimit(PRESET_OFFSET_DAYS[p.value] ?? 0));
  const LEAD_UNIT_OPTIONS = LEAD_UNITS.filter((u) => withinLimit(u.days));

  // The day-of reminder is never in the editable list — it is guaranteed.
  const chosen = reminders.filter((r) => r.value !== DAY_OF);
  const chosenValues = new Set(chosen.map((r) => r.value));
  const atLimit = chosen.length >= MAX_REMINDERS;

  const toggle = (nudge: Nudge) => {
    if (chosenValues.has(nudge.value)) {
      onChange(chosen.filter((r) => r.value !== nudge.value));
      return;
    }
    if (atLimit) return;
    onChange([...chosen, nudge]);
  };

  const customLead = leadValue(leadAmount, leadUnit);
  const customChosen = chosenValues.has(customLead);
  // A custom amount that happens to equal a preset would be a duplicate row.
  const customMatchesPreset = CHOOSABLE_PRESETS.some(
    (p) => offsetDaysFor({ type: 'preset', label: '', value: p.value }) ===
      offsetDaysFor({ type: 'lead', label: '', value: customLead }),
  );

  const addCustom = () => {
    if (customChosen || atLimit) return;
    onChange([...chosen, { type: 'lead', label: leadLabel(leadAmount, leadUnit), value: customLead }]);
    setPickerVisible(false);
  };

  // Furthest out first, so the list reads as a run-up to the day.
  const sorted = [...chosen].sort((a, b) => (offsetDaysFor(b) ?? 0) - (offsetDaysFor(a) ?? 0));

  return (
    <View style={styles.box}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="notifications-active" size={16} color={colors.primary} />
        <Txt variant="labelMd" color={colors.onSurface}>Gentle Nudges</Txt>
      </View>

      {/* Stated, not offered — the day itself is not something to switch off. */}
      <View style={styles.guaranteed}>
        <Icon name="check-circle" size={16} color={colors.secondary} />
        <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ flex: 1, fontWeight: 'normal' }}>
          You&apos;ll always be reminded on the day itself.
        </Txt>
      </View>

      {sorted.length > 0 && (
        <View style={styles.chosenWrap}>
          {sorted.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => toggle(r)}
              style={({ pressed }) => [styles.chosenChip, pressed && { opacity: 0.75 }]}
            >
              <Txt variant="labelSm" color={colors.onSecondaryContainer}>{r.label}</Txt>
              <Icon name="close" size={13} color={colors.onSecondaryContainer} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => {
          // Each visit starts on the presets, whatever last time ended on.
          setCustomOpen(false);
          setPickerVisible(true);
        }}
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
      >
        <Icon name="add" size={18} color={colors.primary} />
        <Txt variant="labelMd" color={colors.primary}>
          {sorted.length > 0 ? `Earlier reminders (${sorted.length}/${MAX_REMINDERS})` : 'Remind me earlier too'}
        </Txt>
      </Pressable>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <Animated.View entering={SlideInDown.duration(280)} style={styles.sheet}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={styles.handle} />
              </View>

              <Txt variant="headlineMd" color={colors.onSurface}>Remind me earlier</Txt>
              <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4, marginBottom: 20 }}>
                Tap to turn one on or off. Up to {MAX_REMINDERS}, on top of the day itself.
              </Txt>

              {/* Toggles, not checkboxes: on is solid, off is faded. */}
              <View style={styles.optionWrap}>
                {CHOOSABLE_PRESETS.map((preset) => {
                  const on = chosenValues.has(preset.value);
                  const disabled = !on && atLimit;
                  return (
                    <Pressable
                      key={preset.value}
                      onPress={() => toggle({ type: 'preset', label: preset.label, value: preset.value })}
                      style={({ pressed }) => [
                        styles.option,
                        on && styles.optionOn,
                        disabled && styles.optionDisabled,
                        pressed && { transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Txt
                        variant="labelMd"
                        color={on ? colors.onSecondaryContainer : colors.onSurfaceVariant}
                      >
                        {preset.label}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>

              {/* Collapsed by default. Open, its filled Add button pulled more
                  attention than Done did, which made the presets look like the
                  side path rather than the main one. */}
              <Pressable
                onPress={() => setCustomOpen((open) => !open)}
                style={({ pressed }) => [styles.divider, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.rule} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Txt variant="labelSm" color={colors.onSurfaceVariant}>OR A SPECIFIC AMOUNT</Txt>
                  <Icon
                    name={customOpen ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={colors.onSurfaceVariant}
                  />
                </View>
                <View style={styles.rule} />
              </Pressable>

              {customOpen && (
                <Animated.View entering={FadeIn.duration(180)}>
              {/* Two steppers instead of a calendar — the reminder is relative to
                  the day, so an absolute date was never the right question. */}
              <View style={styles.leadRow}>
                <Pressable
                  onPress={() => setAmountPickerVisible(true)}
                  style={({ pressed }) => [styles.stepper, { minWidth: 72 }, pressed && { opacity: 0.8 }]}
                >
                  <Txt variant="bodyMd" color={colors.onSurface}>{leadAmount}</Txt>
                  <Icon name="expand-more" size={16} color={colors.onSurfaceVariant} />
                </Pressable>

                <Pressable
                  onPress={() => setUnitPickerVisible(true)}
                  style={({ pressed }) => [styles.stepper, { flex: 1 }, pressed && { opacity: 0.8 }]}
                >
                  <Txt variant="bodyMd" color={colors.onSurface}>
                    {leadAmount === 1
                      ? LEAD_UNITS.find((u) => u.value === leadUnit)?.label
                      : LEAD_UNITS.find((u) => u.value === leadUnit)?.plural}
                  </Txt>
                  <Icon name="expand-more" size={16} color={colors.onSurfaceVariant} />
                </Pressable>

                <Txt variant="bodyMd" color={colors.onSurfaceVariant}>before</Txt>
              </View>

              <Pressable
                onPress={addCustom}
                disabled={customChosen || atLimit || customMatchesPreset}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  (customChosen || atLimit || customMatchesPreset) && { opacity: 0.4 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Icon name={customChosen ? 'check' : 'add'} size={18} color={colors.onPrimary} />
                <Txt variant="labelMd" color={colors.onPrimary}>
                  {customChosen ? 'Already added' : customMatchesPreset ? 'Already an option above' : `Add ${leadLabel(leadAmount, leadUnit)}`}
                </Txt>
              </Pressable>
                </Animated.View>
              )}

              {atLimit && (
                <Animated.View entering={FadeIn.duration(180)}>
                  <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.limitNote}>
                    That&apos;s {MAX_REMINDERS} — turn one off to add another.
                  </Txt>
                </Animated.View>
              )}

              <Pressable onPress={() => setPickerVisible(false)} style={styles.doneBtn}>
                <Txt variant="labelMd" color={colors.primary}>Done</Txt>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      <ScrollPickerModal
        visible={amountPickerVisible}
        onClose={() => setAmountPickerVisible(false)}
        title="How many?"
        options={Array.from({ length: MAX_LEAD_PICK }, (_, i) => ({ label: String(i + 1), value: i + 1 }))}
        selectedValue={leadAmount}
        onSelect={(v) => {
          setLeadAmount(v as number);
          setAmountPickerVisible(false);
        }}
      />

      <ScrollPickerModal
        visible={unitPickerVisible}
        onClose={() => setUnitPickerVisible(false)}
        title={LEAD_UNIT_OPTIONS.length === 1 ? 'How far ahead?' : 'Days, weeks or months?'}
        options={LEAD_UNIT_OPTIONS.map((u) => ({ label: u.plural, value: u.value }))}
        selectedValue={leadUnit}
        onSelect={(v) => {
          setLeadUnit(v as LeadUnit);
          setUnitPickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: 16,
    marginTop: spacing.stackSm,
  },
  guaranteed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  chosenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chosenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtn: {
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    // Unselected reads as faded rather than empty — no checkbox needed.
    opacity: 0.55,
  },
  optionOn: {
    opacity: 1,
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  optionDisabled: { opacity: 0.28 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  rule: { flex: 1, height: 1, backgroundColor: colors.surfaceVariant },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  limitNote: { textAlign: 'center', marginTop: 12, fontWeight: 'normal', opacity: 0.8 },
  doneBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
});
