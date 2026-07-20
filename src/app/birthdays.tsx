import { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { usePeople } from '@/context/PeopleContext';
import type { Person, SpecialDay } from '@/data/mock';
import { useTranslation } from "react-i18next";
import { daysChipLabel } from '@/utils/countdownLabel';

type BirthdayItem = {
  person: Person;
  day: SpecialDay;
  nextDate: Date;
  monthIndex: number;
  isUpcoming: boolean;
};


export default function Birthdays() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { people } = usePeople();

  const [activeFilter, setActiveFilter] = useState('upcoming');

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

          // Upcoming = falls in current month or next month
          const isUpcoming = m === currentMonth || m === nextMonth;

          items.push({
            person: p,
            day: sd,
            nextDate,
            monthIndex: m,
            isUpcoming,
          });
        }
      });
    });

    items.sort((a, b) => (a.day.daysAway || 0) - (b.day.daysAway || 0));

    const monthsSet = new Set<number>();
    items.forEach((item) => {
      if (!item.isUpcoming) {
        monthsSet.add(item.monthIndex);
      }
    });

    return { birthdays: items, availableMonths: Array.from(monthsSet) };
  }, [people]);

  const chips: { key: string; label: string }[] = [
    { key: 'upcoming', label: t('upcoming_word') },
    ...availableMonths.map((m) => ({ key: String(m), label: t(`month_${m}`) })),
  ];

  const filteredBirthdays = useMemo(() => {
    if (activeFilter === 'upcoming') return birthdays; // show all, but we group them
    return birthdays.filter((b) => String(b.monthIndex) === activeFilter);
  }, [activeFilter, birthdays]);

  const renderItem = (item: BirthdayItem, index: number) => {
    const soon = (item.day.daysAway || 0) <= 7;
    return (
      <Animated.View key={`${item.person.id}-${item.day.id}`} entering={FadeInDown.duration(400).delay(index * 50)}>
        <Card onPress={() => router.push(`/person/${item.person.id}`)} style={styles.card}>
          <View style={{ position: 'relative' }}>
            <Avatar uri={item.person.avatar} initials={item.person.initials} size={56} />
            <View style={[styles.cakeBadge, { backgroundColor: c.flameWash, borderColor: c.surface }]}>
              <Icon name="cake" size={13} color={c.flameDeep} />
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 16, minWidth: 0 }}>
            <Txt variant="heading" style={{ fontSize: 18, lineHeight: 24 }}>
              {item.person.name}
            </Txt>
            <Txt variant="sub" color={c.muted} numberOfLines={1} style={{ marginTop: 2 }}>
              {item.day.date.split(',')[0]}
              {item.day.turningAge ? ` · ${t('turning_n', { age: item.day.turningAge })}` : ''}
            </Txt>
          </View>
          <View
            style={[
              styles.countChip,
              { backgroundColor: item.day.daysAway === 0 ? c.flameWash : c.surfaceAlt },
            ]}
          >
            <Txt
              variant="num"
              color={item.day.daysAway === 0 ? c.flameDeep : soon ? c.text : c.muted}
              style={{ fontSize: 13, lineHeight: 17 }}
            >
              {daysChipLabel(item.day.daysAway ?? 0)}
            </Txt>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 8, marginLeft: -8 }}>
          <Icon name="arrow-back" size={24} />
        </Pressable>
        <Txt variant="title" style={{ flex: 1, paddingHorizontal: 12 }}>
          {t('birthdays')}</Txt>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.stackXl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            gap: 10,
            paddingBottom: 16,
          }}
        >
          {chips.map((chip, i) => {
            const active = activeFilter === chip.key;
            return (
              <Animated.View key={chip.key} entering={FadeInDown.duration(400).delay(i * 40)}>
                <Pressable
                  onPress={() => setActiveFilter(chip.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? c.ink : 'transparent',
                      borderColor: active ? c.ink : c.lineStrong,
                    },
                  ]}
                >
                  <Txt variant="subMed" color={active ? c.onInk : c.muted}>
                    {chip.label}
                  </Txt>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.containerMobile, paddingTop: 8, gap: spacing.stackSm }}>
          {filteredBirthdays.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginTop: 40 }}>
              <Icon name="cake" size={44} color={c.lineStrong} />
              <Txt variant="heading" style={{ marginTop: 16 }}>
                {activeFilter === 'upcoming' ? t('no_birthdays_saved') : t('nothing_in_month', { month: t(`month_${Number(activeFilter)}`) })}
              </Txt>
              <Txt variant="sub" color={c.muted} style={{ marginTop: 6, textAlign: 'center', maxWidth: 260 }}>
                {activeFilter === 'upcoming' ? t('add_birthday_lands_here') : t('quiet_month')}
              </Txt>
            </Animated.View>
          ) : (
            <>
              {activeFilter === 'upcoming' ? (
                // Grouped view
                (() => {
                  const upcomingItems = filteredBirthdays.filter((b) => b.isUpcoming);
                  const laterItems = filteredBirthdays.filter((b) => !b.isUpcoming);

                  const elements: React.ReactElement[] = [];

                  // Render upcoming
                  upcomingItems.forEach((item, i) => elements.push(renderItem(item, i)));

                  // Render grouped by month for later items
                  let currentMonthGroup = -1;
                  laterItems.forEach((item, i) => {
                    if (item.monthIndex !== currentMonthGroup) {
                      currentMonthGroup = item.monthIndex;
                      elements.push(
                        <Animated.View
                          key={`divider-${currentMonthGroup}`}
                          entering={FadeInDown.duration(400).delay(upcomingItems.length * 50 + i * 50)}
                          style={styles.dividerRow}
                        >
                          <View style={[styles.dividerLine, { backgroundColor: c.line }]} />
                          <Txt variant="eyebrow" color={c.faint}>
                            {t(`month_${currentMonthGroup}`)}
                          </Txt>
                          <View style={[styles.dividerLine, { backgroundColor: c.line }]} />
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
    zIndex: 40,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  card: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cakeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
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
  },
});
