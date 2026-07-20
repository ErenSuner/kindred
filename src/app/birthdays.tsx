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
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { usePeople } from '@/context/PeopleContext';
import { useBirthdays } from '@/context/BirthdaysContext';
import type { Person, SpecialDay } from '@/data/mock';
import { useTranslation } from "react-i18next";
import { daysChipLabel } from '@/utils/countdownLabel';

// What counts as "coming up within a month" — those ride alongside the nearest
// one as full cards before the month-by-month sections begin.
const WITHIN_DAYS = 31;

type BirthdayItem = {
  person: Person;
  day: SpecialDay;
  monthIndex: number;
  // 'person' opens the contact; 'simple' is a standalone birthday that opens its
  // own small edit screen and shows an emoji instead of an avatar.
  source: 'person' | 'simple';
  emoji?: string;
};


export default function Birthdays() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { people } = usePeople();
  const { birthdays: simpleBirthdays } = useBirthdays();

  // 'all' is the default grouped view; otherwise a month index as a string.
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterVisible, setFilterVisible] = useState(false);

  const { birthdays, availableMonths } = useMemo(() => {
    const items: BirthdayItem[] = [];
    const now = new Date();

    const push = (
      person: Person,
      day: SpecialDay,
      source: 'person' | 'simple',
      emoji?: string,
    ) => {
      const nextDate = new Date(now.getTime() + (day.daysAway || 0) * 86400000);
      items.push({ person, day, monthIndex: nextDate.getMonth(), source, emoji });
    };

    people.forEach((p) => {
      p.specialDays?.forEach((sd) => {
        if (sd.title.toLowerCase().includes('birthday')) {
          push(p, sd, 'person');
        }
      });
    });

    // Standalone birthdays sit in the same list, keyed off their own id.
    simpleBirthdays.forEach((b) => {
      const person = { id: b.id, name: b.name } as Person;
      const day = {
        id: b.id,
        title: 'Birthday',
        date: b.date,
        daysAway: b.daysAway,
        turningAge: b.turningAge,
      } as SpecialDay;
      push(person, day, 'simple', b.emoji);
    });

    items.sort((a, b) => (a.day.daysAway || 0) - (b.day.daysAway || 0));

    // Every month that has a birthday, ordered by how soon it comes round — so
    // the filter reads in the same order as the list.
    const monthsMap = new Map<number, number>();
    items.forEach((it) => {
      const d = it.day.daysAway ?? 0;
      const cur = monthsMap.get(it.monthIndex);
      if (cur === undefined || d < cur) monthsMap.set(it.monthIndex, d);
    });
    const availableMonths = [...monthsMap.entries()].sort((a, b) => a[1] - b[1]).map(([m]) => m);

    return { birthdays: items, availableMonths };
  }, [people, simpleBirthdays]);

  const filterOptions = [
    { label: t('all_upcoming'), value: 'all' },
    ...availableMonths.map((m) => ({ label: t(`month_${m}`), value: String(m) })),
  ];
  const filterLabel = activeFilter === 'all' ? t('all_upcoming') : t(`month_${Number(activeFilter)}`);

  const filteredBirthdays = useMemo(() => {
    if (activeFilter === 'all') return birthdays;
    return birthdays.filter((b) => String(b.monthIndex) === activeFilter);
  }, [activeFilter, birthdays]);

  const cakeBadge = (
    <View style={[styles.cakeBadge, { backgroundColor: c.flameWash, borderColor: c.surface }]}>
      <Icon name="cake" size={13} color={c.flameDeep} />
    </View>
  );

  // The nearest birthday, given room to breathe at the top of the list.
  const renderHero = (item: BirthdayItem) => {
    const days = item.day.daysAway ?? 0;
    const target =
      item.source === 'simple' ? `/birthday/edit/${item.person.id}` : `/person/${item.person.id}`;
    return (
      <Animated.View key={`hero-${item.source}-${item.person.id}`} entering={FadeInDown.duration(400)}>
        <Card onPress={() => router.push(target as any)} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ position: 'relative' }}>
              {item.source === 'simple' ? (
                <View style={[styles.heroEmoji, { backgroundColor: c.surfaceAlt }]}>
                  <Txt style={{ fontSize: 38, lineHeight: 46 }}>{item.emoji || '🎂'}</Txt>
                </View>
              ) : (
                <Avatar uri={item.person.avatar} initials={item.person.initials} size={76} />
              )}
              {cakeBadge}
            </View>
            <View style={{ flex: 1, marginLeft: 18, minWidth: 0 }}>
              <Txt variant="eyebrow" color={c.flameDeep}>{t('next_up')}</Txt>
              <Txt variant="heading" style={{ fontSize: 24, lineHeight: 30, marginTop: 3 }}>
                {item.person.name}
              </Txt>
              <Txt variant="sub" color={c.muted} numberOfLines={1} style={{ marginTop: 3 }}>
                {item.day.date.split(',')[0]}
                {item.day.turningAge ? ` · ${t('turning_n', { age: item.day.turningAge })}` : ''}
              </Txt>
            </View>
          </View>
          <View style={[styles.heroCount, { backgroundColor: days === 0 ? c.flameWash : c.surfaceAlt }]}>
            <Txt
              variant="num"
              color={days === 0 ? c.flameDeep : days <= 7 ? c.text : c.muted}
              style={{ fontSize: 15, lineHeight: 19 }}
            >
              {daysChipLabel(days)}
            </Txt>
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderItem = (item: BirthdayItem, index: number) => {
    const soon = (item.day.daysAway || 0) <= 7;
    const target =
      item.source === 'simple' ? `/birthday/edit/${item.person.id}` : `/person/${item.person.id}`;
    return (
      <Animated.View key={`${item.source}-${item.person.id}-${item.day.id}`} entering={FadeInDown.duration(400).delay(index * 50)}>
        <Card onPress={() => router.push(target as any)} style={styles.card}>
          <View style={{ position: 'relative' }}>
            {item.source === 'simple' ? (
              <View style={[styles.emojiAvatar, { backgroundColor: c.surfaceAlt }]}>
                <Txt style={{ fontSize: 28, lineHeight: 34 }}>{item.emoji || '🎂'}</Txt>
              </View>
            ) : (
              <Avatar uri={item.person.avatar} initials={item.person.initials} size={56} />
            )}
            {cakeBadge}
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

  const monthDivider = (m: number, delay: number) => (
    <Animated.View key={`divider-${m}`} entering={FadeInDown.duration(400).delay(delay)} style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: c.line }]} />
      <Txt variant="eyebrow" color={c.faint}>{t(`month_${m}`)}</Txt>
      <View style={[styles.dividerLine, { backgroundColor: c.line }]} />
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 8, marginLeft: -8 }}>
          <Icon name="arrow-back" size={24} />
        </Pressable>
        <Txt variant="title" style={{ flex: 1, paddingHorizontal: 12 }}>
          {t('birthdays')}</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.stackXl * 2,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* One filter control instead of a row of chips; the default view needs
            no chip of its own. */}
        {availableMonths.length > 1 && (
          <View style={{ paddingHorizontal: spacing.containerMobile, paddingBottom: 16 }}>
            <Pressable
              onPress={() => setFilterVisible(true)}
              style={({ pressed }) => [
                styles.filterBtn,
                { borderColor: c.lineStrong, backgroundColor: activeFilter === 'all' ? 'transparent' : c.surfaceAlt },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Icon name="filter-list" size={16} color={c.muted} />
              <Txt variant="subMed" color={c.text}>{filterLabel}</Txt>
              <Icon name="expand-more" size={18} color={c.muted} />
            </Pressable>
          </View>
        )}

        <View style={{ paddingHorizontal: spacing.containerMobile, paddingTop: 4, gap: spacing.stackSm }}>
          {filteredBirthdays.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginTop: 40 }}>
              <Icon name="cake" size={44} color={c.lineStrong} />
              <Txt variant="heading" style={{ marginTop: 16 }}>
                {activeFilter === 'all' ? t('no_birthdays_saved') : t('nothing_in_month', { month: t(`month_${Number(activeFilter)}`) })}
              </Txt>
              <Txt variant="sub" color={c.muted} style={{ marginTop: 6, textAlign: 'center', maxWidth: 260 }}>
                {activeFilter === 'all' ? t('add_birthday_lands_here') : t('quiet_month')}
              </Txt>
            </Animated.View>
          ) : activeFilter === 'all' ? (
            // Grouped view: nearest as a hero, the next month as full cards, then
            // month-by-month sections for everything further out.
            (() => {
              const [hero, ...rest] = filteredBirthdays;
              const within = rest.filter((b) => (b.day.daysAway ?? 0) <= WITHIN_DAYS);
              const later = rest.filter((b) => (b.day.daysAway ?? 0) > WITHIN_DAYS);

              const elements: React.ReactElement[] = [renderHero(hero)];
              within.forEach((item, i) => elements.push(renderItem(item, i)));

              let currentMonthGroup = -1;
              later.forEach((item, i) => {
                if (item.monthIndex !== currentMonthGroup) {
                  currentMonthGroup = item.monthIndex;
                  elements.push(monthDivider(currentMonthGroup, (within.length + i) * 50));
                }
                elements.push(renderItem(item, within.length + i));
              });

              return elements;
            })()
          ) : (
            // A single month, flat.
            filteredBirthdays.map((item, i) => renderItem(item, i))
          )}
        </View>
      </ScrollView>

      {/* Add sits where the thumb reaches, not up in the header. */}
      <Pressable
        onPress={() => router.push('/birthday/add' as any)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.flame, bottom: insets.bottom + 24 },
          floatShadow,
          pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] },
        ]}
      >
        <Icon name="add" size={28} color={c.onFlame} />
      </Pressable>

      <ScrollPickerModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title={t('filter')}
        options={filterOptions}
        selectedValue={activeFilter}
        onSelect={(val) => {
          setActiveFilter(String(val));
          setFilterVisible(false);
        }}
      />
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  card: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCard: {
    padding: 20,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroEmoji: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCount: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  emojiAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
