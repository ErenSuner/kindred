import { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
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
  const { c, floatShadow } = useTheme();
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
    <View style={[styles.box, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="notifications-active" size={16} color={c.flameDeep} />
        <Txt variant="subMed">Gentle nudges</Txt>
      </View>

      {/* Stated, not offered — the day itself is not something to switch off. */}
      <View style={styles.guaranteed}>
        <Icon name="check-circle" size={16} color={c.good} />
        <Txt variant="sub" color={c.muted} style={{ flex: 1 }}>
          You&apos;ll always be reminded on the day itself.
        </Txt>
      </View>

      {sorted.length > 0 && (
        <View style={styles.chosenWrap}>
          {sorted.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => toggle(r)}
              style={({ pressed }) => [
                styles.chosenChip,
                { backgroundColor: c.flameWash },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Txt variant="label" color={c.flameDeep}>{r.label}</Txt>
              <Icon name="close" size={13} color={c.flameDeep} />
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
        style={({ pressed }) => [
          styles.addBtn,
          { borderColor: c.lineStrong, backgroundColor: c.surfaceAlt },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Icon name="add" size={18} color={c.flameDeep} />
        <Txt variant="label" color={c.flameDeep}>
          {sorted.length > 0 ? `Earlier reminders (${sorted.length}/${MAX_REMINDERS})` : 'Remind me earlier too'}
        </Txt>
      </Pressable>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={() => setPickerVisible(false)}>
          <Animated.View
            entering={SlideInDown.duration(280)}
            style={[styles.sheet, { backgroundColor: c.surface }, floatShadow]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.handle, { backgroundColor: c.lineStrong }]} />
              </View>

              <Txt variant="heading">Remind me earlier</Txt>
              <Txt variant="sub" color={c.muted} style={{ marginTop: 4, marginBottom: 20 }}>
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
                        {
                          backgroundColor: on ? c.ink : c.surfaceAlt,
                          borderColor: on ? c.ink : c.line,
                          opacity: on ? 1 : 0.6,
                        },
                        disabled && { opacity: 0.28 },
                        pressed && { transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <Txt variant="subMed" color={on ? c.onInk : c.muted}>
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
                <View style={[styles.rule, { backgroundColor: c.line }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Txt variant="eyebrow" color={c.faint}>Or a specific amount</Txt>
                  <Icon
                    name={customOpen ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={c.muted}
                  />
                </View>
                <View style={[styles.rule, { backgroundColor: c.line }]} />
              </Pressable>

              {customOpen && (
                <Animated.View entering={FadeIn.duration(180)}>
              {/* Two steppers instead of a calendar — the reminder is relative to
                  the day, so an absolute date was never the right question. */}
              <View style={styles.leadRow}>
                <Pressable
                  onPress={() => setAmountPickerVisible(true)}
                  style={({ pressed }) => [
                    styles.stepper,
                    { minWidth: 72, backgroundColor: c.surfaceAlt, borderColor: c.line },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Txt variant="body">{leadAmount}</Txt>
                  <Icon name="expand-more" size={16} color={c.muted} />
                </Pressable>

                <Pressable
                  onPress={() => setUnitPickerVisible(true)}
                  style={({ pressed }) => [
                    styles.stepper,
                    { flex: 1, backgroundColor: c.surfaceAlt, borderColor: c.line },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Txt variant="body">
                    {leadAmount === 1
                      ? LEAD_UNITS.find((u) => u.value === leadUnit)?.label
                      : LEAD_UNITS.find((u) => u.value === leadUnit)?.plural}
                  </Txt>
                  <Icon name="expand-more" size={16} color={c.muted} />
                </Pressable>

                <Txt variant="body" color={c.muted}>before</Txt>
              </View>

              <Pressable
                onPress={addCustom}
                disabled={customChosen || atLimit || customMatchesPreset}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: c.flame },
                  (customChosen || atLimit || customMatchesPreset) && { opacity: 0.4 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Icon name={customChosen ? 'check' : 'add'} size={18} color={c.onFlame} />
                <Txt variant="label" color={c.onFlame}>
                  {customChosen ? 'Already added' : customMatchesPreset ? 'Already an option above' : `Add ${leadLabel(leadAmount, leadUnit)}`}
                </Txt>
              </Pressable>
                </Animated.View>
              )}

              {atLimit && (
                <Animated.View entering={FadeIn.duration(180)}>
                  <Txt variant="sub" color={c.muted} style={styles.limitNote}>
                    That&apos;s {MAX_REMINDERS} — turn one off to add another.
                  </Txt>
                </Animated.View>
              )}

              <Pressable onPress={() => setPickerVisible(false)} style={styles.doneBtn}>
                <Txt variant="label" color={c.flameDeep}>Done</Txt>
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
    borderRadius: radius.lg,
    borderWidth: 1,
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
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  rule: { flex: 1, height: 1 },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  limitNote: { textAlign: 'center', marginTop: 12, opacity: 0.9 },
  doneBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
});
