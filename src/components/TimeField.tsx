import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, radius, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { HEADS_UP_HOURS, TimeOfDay, formatTimeOfDay } from '@/utils/eventTime';

// Five-minute steps. Nothing in this app starts at 18:37, and a 60-row picker
// to prove otherwise is worse than the constraint.
const MINUTE_STEP = 5;

type Props = {
  value: TimeOfDay | null;
  onChange: (next: TimeOfDay | null) => void;
};

// Optional time of day. Off by default, because most things Kindred tracks —
// a birthday, a renewal — happen on a day rather than at a moment.
export function TimeField({ value, onChange }: Props) {
  const [picking, setPicking] = useState<'hour' | 'minute' | null>(null);

  const toggle = () => onChange(value ? null : { hour: 18, minute: 0 });

  return (
    <View style={styles.box}>
      <Pressable onPress={toggle} style={({ pressed }) => [styles.headerRow, pressed && { opacity: 0.8 }]}>
        <Icon name="schedule" size={16} color={colors.primary} />
        <Txt variant="labelMd" color={colors.onSurface} style={{ flex: 1 }}>Time of day</Txt>
        <Icon
          name={value ? 'check-box' : 'check-box-outline-blank'}
          size={20}
          color={value ? colors.primary : colors.outline}
        />
      </Pressable>

      {value ? (
        <Animated.View entering={FadeIn.duration(180)}>
          <View style={styles.pickerRow}>
            <Pressable
              onPress={() => setPicking('hour')}
              style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.8 }]}
            >
              <Txt variant="bodyMd" color={colors.onSurface}>{String(value.hour).padStart(2, '0')}</Txt>
              <Icon name="expand-more" size={16} color={colors.onSurfaceVariant} />
            </Pressable>

            <Txt variant="headlineMd" color={colors.onSurfaceVariant}>:</Txt>

            <Pressable
              onPress={() => setPicking('minute')}
              style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.8 }]}
            >
              <Txt variant="bodyMd" color={colors.onSurface}>{String(value.minute).padStart(2, '0')}</Txt>
              <Icon name="expand-more" size={16} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Says what setting a time actually buys you, which is not obvious
              from a pair of steppers. */}
          <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.blurb}>
            You&apos;ll hear about it in the morning, and again {HEADS_UP_HOURS} hours before —
            at {formatTimeOfDay(minus(value, HEADS_UP_HOURS))}.
          </Txt>
        </Animated.View>
      ) : (
        <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
          Set one if this happens at a particular time, like a class or an appointment.
        </Txt>
      )}

      <ScrollPickerModal
        visible={picking !== null}
        onClose={() => setPicking(null)}
        title={picking === 'hour' ? 'Hour' : 'Minute'}
        options={
          picking === 'hour'
            ? Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), value: h }))
            : Array.from({ length: 60 / MINUTE_STEP }, (_, i) => ({
                label: String(i * MINUTE_STEP).padStart(2, '0'),
                value: i * MINUTE_STEP,
              }))
        }
        selectedValue={picking === 'hour' ? value?.hour : value?.minute}
        onSelect={(val) => {
          const n = val as number;
          const base = value ?? { hour: 18, minute: 0 };
          onChange(picking === 'hour' ? { ...base, hour: n } : { ...base, minute: n });
          setPicking(null);
        }}
      />
    </View>
  );
}

// Only ever used to show the reminder time, so wrapping past midnight is fine.
function minus(time: TimeOfDay, hours: number): TimeOfDay {
  const total = ((time.hour * 60 + time.minute - hours * 60) % 1440 + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  blurb: { fontWeight: 'normal', opacity: 0.85, marginTop: 10, lineHeight: 17 },
});
