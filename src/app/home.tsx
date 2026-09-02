import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/Card';
import { CelebrationBg } from '@/components/CelebrationBg';
import { FormError } from '@/components/FormError';
import { Icon } from '@/components/Icon';
import { SearchBar } from '@/components/SearchBar';
import { Txt } from '@/components/Txt';
import { useBirthdays } from '@/context/BirthdaysContext';
import type { SimpleBirthday } from '@/data/mock';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { daysChipLabel, daysLongLabel } from '@/utils/countdownLabel';
import { IMPORTANCE_ORDER } from '@/utils/importance';
import { matchesQuery } from '@/utils/search';

// Where "coming up" ends and "later" begins. A month is roughly the horizon at
// which a birthday is something you could still act on rather than something
// you are merely aware of.
const SOON_DAYS = 30;

// Below this there is nothing to search: one birthday is already on screen in
// full, and a search box over it is a control that can only ever hide it.
const SEARCH_FROM = 2;

// Three bars, filled to the level. Small enough to read as texture rather than
// as a control — this is a reminder of what was chosen, not somewhere to change
// it.
function ImportanceBars({ level }: { level: SimpleBirthday['importance'] }) {
  const { c } = useTheme();
  const index = Math.max(0, IMPORTANCE_ORDER.indexOf(level));

  return (
    <View style={styles.bars}>
      {IMPORTANCE_ORDER.map((_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: 6 + i * 4, backgroundColor: i <= index ? c.flameDeep : c.line },
          ]}
        />
      ))}
    </View>
  );
}

// The next one, given the room it deserves. On the day itself it stops counting
// down and simply says so.
function NextUp({ birthday, onPress }: { birthday: SimpleBirthday; onPress: () => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const isToday = birthday.daysAway === 0;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Card ink pressable onPress={onPress} style={styles.hero}>
        <CelebrationBg />

        <Txt variant="eyebrow" color={c.onInkFaint}>
          {isToday ? t('today') : t('next_up')}
        </Txt>

        <Txt variant="display" color={c.onInk} style={styles.heroName} numberOfLines={2}>
          {birthday.name}
        </Txt>

        <View style={styles.heroFoot}>
          <View style={[styles.countdown, { backgroundColor: isToday ? c.flame : c.inkSoft }]}>
            <Icon
              name={isToday ? 'celebration' : 'schedule'}
              size={15}
              color={isToday ? c.onFlame : c.onInkMuted}
            />
            <Txt variant="subMed" color={isToday ? c.onFlame : c.onInk}>
              {daysLongLabel(birthday.daysAway)}
            </Txt>
          </View>

          <Txt variant="sub" color={c.onInkMuted} style={styles.heroDate}>
            {birthday.turningAge
              ? t('date_turning', { date: birthday.date, age: birthday.turningAge })
              : birthday.date}
          </Txt>
        </View>
      </Card>
    </Animated.View>
  );
}

function Row({ birthday, onPress, index }: { birthday: SimpleBirthday; onPress: () => void; index: number }) {
  const { c } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(260)}
      layout={LinearTransition.duration(220)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { borderColor: c.line, backgroundColor: c.surface },
          pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] },
        ]}
      >
        <View style={styles.rowText}>
          <Txt variant="bodySemi" numberOfLines={1}>
            {birthday.name}
          </Txt>
          <Txt variant="sub" color={c.muted} numberOfLines={1}>
            {birthday.date}
          </Txt>
        </View>

        <Txt variant="num" color={c.flameDeep}>
          {daysChipLabel(birthday.daysAway)}
        </Txt>

        <ImportanceBars level={birthday.importance} />
      </Pressable>
    </Animated.View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.section}>
      {children}
    </Txt>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  const { birthdays, loading, loadError, refreshBirthdays } = useBirthdays();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const searching = query.trim().length > 0;

  const [next, soon, later] = useMemo(() => {
    const [first, ...rest] = birthdays;
    return [
      first,
      rest.filter((b) => b.daysAway <= SOON_DAYS),
      rest.filter((b) => b.daysAway > SOON_DAYS),
    ];
  }, [birthdays]);

  // Searching looks at everyone, the next one included — the whole list is
  // sorted soonest first already, so the results keep that order.
  const results = useMemo(
    () => (searching ? birthdays.filter((b) => matchesQuery(b.name, query)) : []),
    [birthdays, query, searching],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBirthdays();
    } finally {
      setRefreshing(false);
    }
  };

  // A failed load is not an empty account. The cached list, if there is one,
  // stays on screen underneath the banner.
  const isEmpty = birthdays.length === 0 && !loading && !loadError;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Txt variant="display">{t('birthdays')}</Txt>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('settings')}
        >
          <Icon name="settings" size={24} color={c.muted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.flame} />
        }
      >
        {loadError ? <FormError message={loadError} onRetry={onRefresh} /> : null}

        {/* The hero says "this is the one that matters next", which is not true
            of whatever a search happens to turn up. It stands aside while the
            box has something in it. */}
        {next && !searching ? (
          <NextUp birthday={next} onPress={() => router.push(`/birthday/edit/${next.id}`)} />
        ) : null}

        {birthdays.length >= SEARCH_FROM && (
          <SearchBar value={query} onChange={setQuery} placeholder={t('search')} />
        )}

        {searching ? (
          results.length > 0 ? (
            <View style={styles.group}>
              {results.map((b, i) => (
                <Row key={b.id} birthday={b} index={i} onPress={() => router.push(`/birthday/edit/${b.id}`)} />
              ))}
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(200)} style={styles.noResults}>
              <Icon name="search-off" size={36} color={c.lineStrong} />
              <Txt variant="bodySemi" style={styles.noResultsTitle}>
                {t('no_results_title')}
              </Txt>
              <Txt variant="sub" color={c.muted} style={styles.noResultsBody}>
                {t('no_results_body', { query: query.trim() })}
              </Txt>
            </Animated.View>
          )
        ) : (
          <>
            {soon.length > 0 && (
              <View style={styles.group}>
                <SectionTitle>{t('coming_up')}</SectionTitle>
                {soon.map((b, i) => (
                  <Row key={b.id} birthday={b} index={i} onPress={() => router.push(`/birthday/edit/${b.id}`)} />
                ))}
              </View>
            )}

            {later.length > 0 && (
              <View style={styles.group}>
                <SectionTitle>{t('later_on')}</SectionTitle>
                {later.map((b, i) => (
                  <Row key={b.id} birthday={b} index={i} onPress={() => router.push(`/birthday/edit/${b.id}`)} />
                ))}
              </View>
            )}
          </>
        )}

        {isEmpty && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
            <Icon name="cake" size={44} color={c.lineStrong} />
            <Txt variant="heading" style={styles.emptyTitle}>
              {t('empty_title')}
            </Txt>
            <Txt variant="body" color={c.muted} style={styles.emptyBody}>
              {t('empty_body')}
            </Txt>
          </Animated.View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/birthday/add')}
        accessibilityRole="button"
        accessibilityLabel={t('new_birthday')}
        style={({ pressed }) => [
          styles.fab,
          floatShadow,
          { backgroundColor: c.flame, bottom: insets.bottom + 24 },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <Icon name="add" size={28} color={c.onFlame} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: 12,
  },
  scroll: {
    paddingHorizontal: spacing.containerMobile,
    gap: spacing.stackMd,
  },
  hero: {
    overflow: 'hidden',
    paddingVertical: 24,
  },
  heroName: { marginTop: 6 },
  heroFoot: { marginTop: 18, gap: 10, alignItems: 'flex-start' },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  heroDate: { opacity: 0.9 },
  group: { gap: 8 },
  section: { marginTop: 8, marginLeft: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  // Allowed to shrink, so a long unbroken name cannot push the countdown out
  // of the card.
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 14,
  },
  bar: { width: 3, borderRadius: 2 },
  empty: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 24,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  noResultsTitle: { marginTop: 12, textAlign: 'center' },
  noResultsBody: { marginTop: 4, textAlign: 'center' },
  emptyTitle: { marginTop: 16, textAlign: 'center' },
  emptyBody: { marginTop: 8, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.containerMobile,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
