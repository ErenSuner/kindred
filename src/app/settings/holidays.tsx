import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Toggle } from '@/components/Toggle';
import { HOLIDAYS } from '@/data/holidays';
import { HOLIDAY_HORIZON_DAYS, useHolidays } from '@/context/HolidaysContext';
import { resolveHoliday } from '@/utils/holidays';

export default function HolidaySettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, cardShadow } = useTheme();
  const { isEnabled, toggleHoliday, enabledIds } = useHolidays();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        <Txt variant="title" style={{ flex: 1, textAlign: 'center', marginRight: 24 }}>
          Shared occasions
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
          <Txt variant="sub" color={c.muted}>
            Days everyone shares. The ones you keep appear on your home screen{' '}
            {HOLIDAY_HORIZON_DAYS} days ahead, with a nudge a week and a day before.
          </Txt>
        </Animated.View>

        <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
          {HOLIDAYS.map((holiday, index) => {
            const enabled = isEnabled(holiday.id);
            const { daysAway, formattedDate } = resolveHoliday(holiday);
            const last = index === HOLIDAYS.length - 1;

            return (
              <Animated.View key={holiday.id} entering={FadeInDown.duration(400).delay(60 + index * 30)}>
                <Pressable
                  onPress={() => toggleHoliday(holiday.id, !enabled)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: enabled ? c.flameWash : c.surfaceAlt }]}>
                    <Icon
                      name={holiday.icon as any}
                      size={20}
                      color={enabled ? c.flameDeep : c.faint}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyMed">{holiday.name}</Txt>
                    <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
                      {enabled ? `${formattedDate} · ${daysAway === 0 ? 'today' : `${daysAway} days away`}` : holiday.blurb}
                    </Txt>
                  </View>
                  <Toggle value={enabled} onChange={(v) => toggleHoliday(holiday.id, v)} />
                </Pressable>
                {!last && <View style={[styles.divider, { backgroundColor: c.line }]} />}
              </Animated.View>
            );
          })}
        </View>

        {enabledIds.length === 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.emptyNote, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="info-outline" size={16} color={c.muted} />
            <Txt variant="sub" color={c.muted} style={{ flex: 1 }}>
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
  },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  emptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
