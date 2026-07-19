import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import {
  MAX_INTERVAL,
  MONTHLY,
  ONE_TIME,
  Recurrence,
  WEEKLY,
  YEARLY,
  recurrenceDescription,
  recurrenceIcon,
} from '@/utils/recurrence';

type Quick = { label: string; value: Recurrence };

const QUICK_OPTIONS: Quick[] = [
  { label: 'Once', value: ONE_TIME },
  { label: 'Weekly', value: WEEKLY },
  { label: 'Monthly', value: MONTHLY },
  { label: 'Yearly', value: YEARLY },
];

// Custom is for the short cycles the quick chips don't cover. "Every N years"
// was dropped — a yearly day is the Yearly chip, and nothing sensibly repeats
// on a multi-year cycle.
type CustomUnit = 'day' | 'week' | 'month';

const UNIT_OPTIONS: { label: string; value: CustomUnit }[] = [
  { label: 'Days', value: 'day' },
  { label: 'Weeks', value: 'week' },
  { label: 'Months', value: 'month' },
];

function matchesQuick(r: Recurrence, quick: Recurrence) {
  if (quick.unit === 'none') return r.unit === 'none';
  return r.unit === quick.unit && r.interval === 1;
}

// Custom mode covers anything the four quick chips don't: every day, every 3
// weeks, and so on. An "every N years" value from an older row matches nothing
// here — the description above still spells it out, and picking anything
// replaces it.
function isCustom(r: Recurrence) {
  if (r.unit === 'day') return true;
  return r.unit === 'week' || r.unit === 'month' ? r.interval !== 1 : false;
}

type Props = {
  value: Recurrence;
  onChange: (next: Recurrence) => void;
};

export function RecurrencePicker({ value, onChange }: Props) {
  const { c } = useTheme();
  const [customMode, setCustomMode] = useState(() => isCustom(value));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'interval' | 'unit'>('interval');

  // Falling back to weeks keeps a one-time (or legacy yearly) event from
  // becoming "every 2 nothings".
  const customUnit: CustomUnit =
    value.unit === 'day' || value.unit === 'week' || value.unit === 'month' ? value.unit : 'week';
  const customInterval = isCustom(value) ? value.interval : 2;

  const selectQuick = (quick: Recurrence) => {
    setCustomMode(false);
    onChange(quick);
  };

  const enterCustom = () => {
    setCustomMode(true);
    onChange({ unit: customUnit, interval: customInterval });
  };

  const showCustom = customMode || isCustom(value);

  const chipLook = (active: boolean) => ({
    backgroundColor: active ? c.ink : c.surfaceAlt,
    borderColor: active ? c.ink : c.line,
  });

  return (
    <View style={[styles.box, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={recurrenceIcon(value)} size={16} color={c.flameDeep} />
        <Txt variant="subMed">Repeats</Txt>
      </View>
      <Txt variant="sub" color={c.muted} style={{ marginTop: 4, marginBottom: 12 }}>
        {recurrenceDescription(value)}
      </Txt>

      <View style={styles.chipWrap}>
        {QUICK_OPTIONS.map((option) => {
          const active = !showCustom && matchesQuick(value, option.value);
          return (
            <Pressable
              key={option.label}
              onPress={() => selectQuick(option.value)}
              style={({ pressed }) => [styles.chip, chipLook(active), pressed && { opacity: 0.8 }]}
            >
              <Txt variant="label" color={active ? c.onInk : c.muted}>
                {option.label}
              </Txt>
            </Pressable>
          );
        })}

        <Pressable
          onPress={enterCustom}
          style={({ pressed }) => [styles.chip, chipLook(showCustom), pressed && { opacity: 0.8 }]}
        >
          <Icon name="tune" size={12} color={showCustom ? c.onInk : c.muted} />
          <Txt variant="label" color={showCustom ? c.onInk : c.muted}>
            Custom
          </Txt>
        </Pressable>
      </View>

      {showCustom && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.customRow}>
          <Txt variant="body" color={c.muted}>Every</Txt>
          <Pressable
            onPress={() => { setPickerType('interval'); setPickerVisible(true); }}
            style={[styles.stepper, { minWidth: 64, backgroundColor: c.surfaceAlt, borderColor: c.line }]}
          >
            <Txt variant="body">{customInterval}</Txt>
            <Icon name="expand-more" size={16} color={c.muted} />
          </Pressable>
          <Pressable
            onPress={() => { setPickerType('unit'); setPickerVisible(true); }}
            style={[styles.stepper, { flex: 1, backgroundColor: c.surfaceAlt, borderColor: c.line }]}
          >
            <Txt variant="body">
              {UNIT_OPTIONS.find((u) => u.value === customUnit)?.label}
            </Txt>
            <Icon name="expand-more" size={16} color={c.muted} />
          </Pressable>
        </Animated.View>
      )}

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={pickerType === 'interval' ? 'Repeat Every' : 'Repeat Unit'}
        options={
          pickerType === 'interval'
            ? Array.from({ length: MAX_INTERVAL }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
            : UNIT_OPTIONS
        }
        selectedValue={pickerType === 'interval' ? customInterval : customUnit}
        onSelect={(val) => {
          if (pickerType === 'interval') {
            onChange({ unit: customUnit, interval: val as number });
          } else {
            onChange({ unit: val as CustomUnit, interval: customInterval });
          }
          setPickerVisible(false);
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
