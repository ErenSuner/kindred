import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Toggle } from '@/components/Toggle';
import { HOLIDAYS } from '@/data/holidays';
import { HOLIDAY_HORIZON_DAYS, useHolidays } from '@/context/HolidaysContext';
import { resolveHoliday } from '@/utils/holidays';

export default function HolidaySettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isEnabled, toggleHoliday, enabledIds } = useHolidays();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary} style={{ flex: 1, textAlign: 'center', marginRight: 24 }}>
          Shared Occasions
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: spacing.stackMd,
          paddingBottom: insets.bottom + 40,
          gap: spacing.stackMd,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ lineHeight: 22 }}>
            Days everyone shares, not tied to one person. Kindred shows the ones you keep on your
            home screen {HOLIDAY_HORIZON_DAYS} days ahead, and nudges you a week and a day before.
          </Txt>
        </Animated.View>

        <View style={styles.group}>
          {HOLIDAYS.map((holiday, index) => {
            const enabled = isEnabled(holiday.id);
            const { daysAway, formattedDate } = resolveHoliday(holiday);
            const last = index === HOLIDAYS.length - 1;

            return (
              <Animated.View key={holiday.id} entering={FadeInDown.duration(400).delay(60 + index * 30)}>
                <Pressable
                  onPress={() => toggleHoliday(holiday.id, !enabled)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
                >
                  <View style={[styles.iconWrap, enabled && { backgroundColor: colors.primaryFixed }]}>
                    <Icon
                      name={holiday.icon as any}
                      size={20}
                      color={enabled ? colors.onPrimaryContainer : colors.outline}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyMd" color={colors.onSurface}>{holiday.name}</Txt>
                    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.sublabel}>
                      {enabled ? `${formattedDate} · ${daysAway === 0 ? 'today' : `${daysAway} days away`}` : holiday.blurb}
                    </Txt>
                  </View>
                  <Toggle value={enabled} onChange={(v) => toggleHoliday(holiday.id, v)} />
                </Pressable>
                {!last && <View style={styles.divider} />}
              </Animated.View>
            );
          })}
        </View>

        {enabledIds.length === 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.emptyNote}>
            <Icon name="info-outline" size={16} color={colors.onSurfaceVariant} />
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ flex: 1, fontWeight: 'normal' }}>
              With none selected, shared occasions stay off your home screen entirely.
            </Txt>
          </Animated.View>
        )}
      </ScrollView>
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
  group: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...softShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sublabel: { fontWeight: 'normal', marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginLeft: 72,
  },
  emptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
