import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, radius, spacing } from '@/theme/tokens';
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

  return (
    <View style={styles.box}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={recurrenceIcon(value)} size={16} color={colors.primary} />
        <Txt variant="labelMd" color={colors.onSurface}>Repeats</Txt>
      </View>
      <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4, marginBottom: 12 }}>
        {recurrenceDescription(value)}
      </Txt>

      <View style={styles.chipWrap}>
        {QUICK_OPTIONS.map((option) => {
          const active = !showCustom && matchesQuick(value, option.value);
          return (
            <Pressable
              key={option.label}
              onPress={() => selectQuick(option.value)}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.8 }]}
            >
              <Txt variant="labelSm" color={active ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
                {option.label}
              </Txt>
            </Pressable>
          );
        })}

        <Pressable
          onPress={enterCustom}
          style={({ pressed }) => [styles.chip, showCustom && styles.chipActive, pressed && { opacity: 0.8 }]}
        >
          <Icon name="tune" size={12} color={showCustom ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
          <Txt variant="labelSm" color={showCustom ? colors.onSecondaryContainer : colors.onSurfaceVariant}>
            Custom
          </Txt>
        </Pressable>
      </View>

      {showCustom && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.customRow}>
          <Txt variant="bodyMd" color={colors.onSurfaceVariant}>Every</Txt>
          <Pressable
            onPress={() => { setPickerType('interval'); setPickerVisible(true); }}
            style={[styles.stepper, { minWidth: 64 }]}
          >
            <Txt variant="bodyMd" color={colors.onSurface}>{customInterval}</Txt>
            <Icon name="expand-more" size={16} color={colors.onSurfaceVariant} />
          </Pressable>
          <Pressable
            onPress={() => { setPickerType('unit'); setPickerVisible(true); }}
            style={[styles.stepper, { flex: 1 }]}
          >
            <Txt variant="bodyMd" color={colors.onSurface}>
              {UNIT_OPTIONS.find((u) => u.value === customUnit)?.label}
            </Txt>
            <Icon name="expand-more" size={16} color={colors.onSurfaceVariant} />
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
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
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
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  chipActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
