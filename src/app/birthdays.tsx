import { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { usePeople } from '@/context/PeopleContext';
import type { Person, SpecialDay } from '@/data/mock';

type BirthdayItem = {
  person: Person;
  day: SpecialDay;
  nextDate: Date;
  monthName: string;
  isUpcoming: boolean;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Birthdays() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { people } = usePeople();

  const [activeFilter, setActiveFilter] = useState('Upcoming');

  const { birthdays, availableMonths } = useMemo(() => {
    const items: BirthdayItem[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const nextMonth = (currentMonth + 1) % 12;

    people.forEach((p) => {
      p.specialDays?.forEach((sd) => {
        if (sd.title.toLowerCase().includes('birthday')) {
          const nextDate = new Date(now.getTime() + (sd.daysAway || 0) * 86400000);
          const m = nextDate.getMonth();
          const monthName = MONTHS[m];
          // Upcoming = falls in current month or next month
          const isUpcoming = m === currentMonth || m === nextMonth;

          items.push({
            person: p,
            day: sd,
            nextDate,
            monthName,
            isUpcoming,
          });
        }
      });
    });

    items.sort((a, b) => (a.day.daysAway || 0) - (b.day.daysAway || 0));

    const monthsSet = new Set<string>();
    items.forEach((item) => {
      if (!item.isUpcoming) {
        monthsSet.add(item.monthName);
      }
    });

    return { birthdays: items, availableMonths: Array.from(monthsSet) };
  }, [people]);

  const chips = ['Upcoming', ...availableMonths];

  const filteredBirthdays = useMemo(() => {
    if (activeFilter === 'Upcoming') return birthdays; // show all, but we group them
    return birthdays.filter((b) => b.monthName === activeFilter);
  }, [activeFilter, birthdays]);

  // Group by month ONLY if activeFilter === 'Upcoming' (to show the full list with dividers)
  // If a specific month is selected, no dividers needed (or just one for that month)
  
  const renderItem = (item: BirthdayItem, index: number) => {
    const isVerySoon = (item.day.daysAway || 0) <= 7;
    return (
      <Animated.View key={`${item.person.id}-${item.day.id}`} entering={FadeInDown.duration(400).delay(index * 50)}>
        <Pressable
          onPress={() => router.push(`/person/${item.person.id}`)}
          style={({ pressed }) => [
            styles.card,
            pressed && { transform: [{ scale: 0.98 }], backgroundColor: colors.surfaceContainerHigh }
          ]}
        >
          <View style={{ position: 'relative' }}>
            <Avatar uri={item.person.avatar} initials={item.person.initials} size={64} />
            <View style={styles.cakeBadge}>
              <Icon name="cake" size={14} color={colors.onPrimaryContainer} />
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ fontSize: 20, lineHeight: 28 }}>
              {item.person.name}
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} numberOfLines={1}>
              {item.day.date.split(',')[0]} · {item.day.title}{item.day.turningAge ? ` (Turning ${item.day.turningAge})` : ''}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end', opacity: isVerySoon ? 1 : 0.7 }}>
            <Txt variant="labelMd" color={isVerySoon ? colors.primary : colors.onSurfaceVariant} style={isVerySoon && { fontWeight: 'bold' }}>
              {item.day.daysAway === 0 ? 'Today!' : `${item.day.daysAway} Days`}
            </Txt>
            {item.day.daysAway !== 0 && (
              <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Away
              </Txt>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 8, marginLeft: -8 }}>
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.primary} style={{ flex: 1, paddingHorizontal: 16 }}>
          Birthdays
        </Txt>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.stackXl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            gap: 12,
            paddingBottom: 16,
          }}
        >
          {chips.map((chip, i) => {
            const active = activeFilter === chip;
            return (
              <Animated.View key={chip} entering={FadeInDown.duration(400).delay(i * 50)}>
                <Pressable
                  onPress={() => setActiveFilter(chip)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Txt variant="labelMd" color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant}>
                    {chip}
                  </Txt>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.containerMobile, paddingTop: 8, gap: spacing.stackMd }}>
          {filteredBirthdays.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginTop: 40 }}>
              <Icon name="cake" size={48} color={colors.outlineVariant} />
              <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
                No birthdays found
              </Txt>
            </Animated.View>
          ) : (
            <>
              {activeFilter === 'Upcoming' ? (
                // Grouped view
                (() => {
                  const upcomingItems = filteredBirthdays.filter((b) => b.isUpcoming);
                  const laterItems = filteredBirthdays.filter((b) => !b.isUpcoming);

                  const elements: React.ReactElement[] = [];
                  
                  // Render upcoming
                  upcomingItems.forEach((item, i) => elements.push(renderItem(item, i)));

                  // Render grouped by month for later items
                  let currentMonthGroup = '';
                  laterItems.forEach((item, i) => {
                    if (item.monthName !== currentMonthGroup) {
                      currentMonthGroup = item.monthName;
                      elements.push(
                        <Animated.View key={`divider-${currentMonthGroup}`} entering={FadeInDown.duration(400).delay(upcomingItems.length * 50 + i * 50)} style={styles.dividerRow}>
                          <View style={styles.dividerLine} />
                          <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
                            {currentMonthGroup}
                          </Txt>
                          <View style={styles.dividerLine} />
                        </Animated.View>
                      );
                    }
                    elements.push(renderItem(item, upcomingItems.length + i));
                  });

                  return elements;
                })()
              ) : (
                // Filtered view (just the selected month)
                filteredBirthdays.map((item, i) => renderItem(item, i))
              )}
            </>
          )}
        </View>
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
    zIndex: 40,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  chipActive: {
    backgroundColor: colors.primaryContainer,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...softShadow,
  },
  cakeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceVariant,
  }
});
