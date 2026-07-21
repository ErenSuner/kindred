import { useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { NotePreview } from '@/components/NotePreview';
import { FormError } from '@/components/FormError';
import { usePeople } from '@/context/PeopleContext';
import { useEvents } from '@/context/EventsContext';
import { useHolidays } from '@/context/HolidaysContext';
import { useAuth } from '@/context/AuthContext';
import { formatTimeOfDay } from '@/utils/eventTime';
import { TimelineEntry, buildTimeline } from '@/utils/timeline';
import { daysChipLabel, daysLongLabel } from '@/utils/countdownLabel';
import { useTranslation } from "react-i18next";

// The candle mark: a small amber dot that breathes gently when something is
// happening today. The same mark the Held notice uses — the lamp is lit.
function FlameDot({ today }: { today: boolean }) {
  const { c } = useTheme();
  const glow = useSharedValue(1);

  useEffect(() => {
    if (today) {
      glow.value = withRepeat(
        withSequence(withTiming(0.55, { duration: 1200 }), withTiming(1, { duration: 1200 })),
        -1,
      );
    } else {
      glow.value = 1;
    }
  }, [today, glow]);

  const style = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View
      style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.flame }, style]}
    />
  );
}

// Home answers one question: what is coming up, and when. It deliberately does
// not list people or reminders — those are whole tabs of their own, and having
// them here too meant the same thing appeared twice under different headings.
export default function Home() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { people, loadError, refreshPeople } = usePeople();
  const { events, routines } = useEvents();
  const { imminent } = useHolidays();
  const { user } = useAuth();

  const userName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'there');
  const ownAvatar: string | undefined = user?.user_metadata?.avatar_url ?? undefined;

  const groups = useMemo(
    () =>
      buildTimeline(
        people,
        events,
        routines,
        imminent.map((u) => ({
          id: u.holiday.id,
          name: u.holiday.name,
          icon: u.holiday.icon,
          formattedDate: u.formattedDate,
          daysAway: u.daysAway,
        })),
      ),
    [people, events, routines, imminent],
  );

  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  const nothingAtAll = people.length === 0 && events.length === 0 && routines.length === 0;

  // The very next thing gets the one dark card on the screen. A wall of
  // identically sized rows is honest about the order but says nothing about
  // weight, and the one thing you actually need to know is what's next.
  const hero = groups[0]?.entries[0];
  const heroKey = groups[0]?.key;
  const heroLabel = groups[0]?.label;

  // The timeline below picks up where the hero left off, so it isn't shown
  // twice. A group emptied by that is dropped entirely.
  const restGroups = groups
    .map((g, i) => (i === 0 ? { ...g, entries: g.entries.slice(1) } : g))
    .filter((g) => g.entries.length > 0);

  const openEntry = (entry: TimelineEntry) => {
    if (entry.personId) router.push(`/person/${entry.personId}` as any);
    else if (entry.source === 'routine' && entry.eventId) {
      router.push({ pathname: '/my-event/routine', params: { id: entry.eventId } } as any);
    } else if (entry.eventId) router.push(`/my-event/edit/${entry.eventId}` as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 130,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting leads, like every other tab leads with its title — no
            orphaned wordmark, nothing competing on the right. */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.welcome}>
          <Txt variant="sub" color={c.muted} style={{ marginBottom: 6, textTransform: 'capitalize' }}>
            {t('home_welcome', { name: userName })}
          </Txt>
          <Txt variant="display">
            {total === 0 ? t('all_quiet') : t('coming_up_headline')}
          </Txt>
        </Animated.View>

        <FormError message={loadError} onRetry={refreshPeople} retryLabel={t('try_again')} />

        {/* An empty list on a failed load means "couldn't fetch", not "you have
            nobody", so the invitation is held back until the load succeeded. */}
        {total === 0 && !loadError && (
          <Animated.View entering={FadeInDown.duration(500).delay(120)}>
            <Card style={styles.emptyCard}>
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.emptyIconWrap, { backgroundColor: c.flameWash }]}>
                  <Icon name={nothingAtAll ? 'people' : 'event'} size={30} color={c.flameDeep} />
                </View>
                <Txt variant="heading" style={{ textAlign: 'center', marginTop: 20 }}>
                  {nothingAtAll ? t('nobody_here_yet') : t('no_dates_yet')}
                </Txt>
                <Txt variant="body" color={c.muted} style={styles.emptyBlurb}>
                  {nothingAtAll
                    ? t('home_empty_people')
                    : t('home_empty_dates')}
                </Txt>
                <Pressable
                  onPress={() => router.push('/add')}
                  style={({ pressed }) => [
                    styles.emptyBtn,
                    { backgroundColor: c.flame },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Txt variant="bodySemi" color={c.onFlame}>{t('go_to_your_people')}</Txt>
                  <Icon name="arrow-forward" size={18} color={c.onFlame} />
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        )}

        {hero && (
          <Animated.View entering={FadeInDown.duration(500).delay(60)} style={{ marginBottom: spacing.stackLg }}>
            <Card
              ink
              pressable={!!(hero.personId || hero.eventId)}
              onPress={() => openEntry(hero)}
              style={styles.hero}
            >
              <View style={styles.heroEyebrowRow}>
                <FlameDot today={hero.daysAway === 0} />
                <Txt variant="eyebrow" color={c.flame}>
                  {heroKey === 'today' ? t('today') : t('next_up_group', { label: heroLabel })}
                </Txt>
              </View>

              <View style={styles.heroTop}>
                {hero.personId ? (
                  <Avatar uri={hero.avatar} initials={hero.initials} size={64} ring={false} />
                ) : hero.source === 'event' ? (
                  <Avatar uri={ownAvatar} initials={userName?.charAt(0)?.toUpperCase()} size={64} ring={false} />
                ) : (
                  <View style={[styles.heroIconWrap, { backgroundColor: c.inkSoft }]}>
                    <Icon name={hero.icon as any} size={26} color={c.flame} />
                  </View>
                )}

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="title" color={c.onInk}>{hero.title}</Txt>
                  <Txt variant="sub" color={c.onInkMuted} style={{ marginTop: 6 }}>
                    {hero.date}
                    {hero.timeOfDay ? ` · ${formatTimeOfDay(hero.timeOfDay)}` : ''}
                    {hero.subtitle ? ` · ${hero.subtitle}` : ''}
                  </Txt>
                </View>
              </View>

              <View style={styles.heroDays}>
                <Txt
                  color={c.flame}
                  style={{ fontFamily: fonts.frauncesSemiBold, fontSize: 30, lineHeight: 36 }}
                >
                  {daysLongLabel(hero.daysAway)}
                </Txt>
              </View>

              {hero.notes && hero.notes.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <NotePreview notes={hero.notes} lines={2} onInk />
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {restGroups.map((group, groupIndex) => (
          <Animated.View
            key={group.key}
            entering={FadeInDown.duration(500).delay(80 + groupIndex * 60)}
            style={{ marginBottom: spacing.stackLg }}
          >
            <View style={styles.groupHead}>
              <Txt variant="eyebrow" color={c.faint}>{group.label}</Txt>
              <View style={[styles.groupRule, { backgroundColor: c.line }]} />
            </View>

            <View style={{ gap: spacing.stackSm }}>
              {group.entries.map((entry) => (
                <Card
                  key={entry.id}
                  pressable={!!(entry.personId || entry.eventId)}
                  onPress={() => openEntry(entry)}
                  style={styles.row}
                >
                  <View style={styles.rowLeft}>
                    {entry.personId ? (
                      <Avatar uri={entry.avatar} initials={entry.initials} size={44} />
                    ) : entry.source === 'event' ? (
                      <Avatar uri={ownAvatar} initials={userName?.charAt(0)?.toUpperCase()} size={44} />
                    ) : (
                      <View style={[styles.iconWrap, { backgroundColor: c.surfaceAlt }]}>
                        <Icon name={entry.icon as any} size={20} color={c.muted} />
                      </View>
                    )}

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="bodyMed">{entry.title}</Txt>
                      <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
                        {entry.date}
                        {entry.timeOfDay ? ` · ${formatTimeOfDay(entry.timeOfDay)}` : ''}
                        {entry.subtitle ? ` · ${entry.subtitle}` : ''}
                      </Txt>

                      {entry.notes && entry.notes.length > 0 && (
                        <View style={{ marginTop: 6 }}>
                          <NotePreview notes={entry.notes} lines={1} compact />
                        </View>
                      )}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.countdown,
                      { backgroundColor: entry.daysAway === 0 ? c.flameWash : c.surfaceAlt },
                    ]}
                  >
                    <Txt
                      variant="num"
                      color={entry.daysAway === 0 ? c.flameDeep : c.muted}
                      style={{ fontSize: 13, lineHeight: 17 }}
                    >
                      {daysChipLabel(entry.daysAway)}
                    </Txt>
                  </View>
                </Card>
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { fontFamily: fonts.frauncesSemiBold, fontSize: 15, lineHeight: 20, letterSpacing: 0.3 },
  welcome: { marginBottom: spacing.stackLg },
  hero: { overflow: 'hidden' },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  heroTop: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDays: { marginTop: 20 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.stackSm, marginLeft: 2 },
  groupRule: { flex: 1, height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  emptyCard: { paddingVertical: 40, paddingHorizontal: 24, marginBottom: spacing.stackLg },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBlurb: { textAlign: 'center', marginTop: 8, maxWidth: 280 },
  emptyBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
});
