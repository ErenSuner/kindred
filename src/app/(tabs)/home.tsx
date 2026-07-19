import { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '@/theme/tokens';
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

function countdown(daysAway: number): string {
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  return `${daysAway}d`;
}

// Home answers one question: what is coming up, and when. It deliberately does
// not list people or reminders — those are whole tabs of their own, and having
// them here too meant the same thing appeared twice under different headings.
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const openEntry = (entry: TimelineEntry) => {
    if (entry.personId) router.push(`/person/${entry.personId}` as any);
    else if (entry.source === 'routine' && entry.eventId) {
      router.push({ pathname: '/my-event/routine', params: { id: entry.eventId } } as any);
    } else if (entry.eventId) router.push(`/my-event/edit/${entry.eventId}` as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Txt variant="headlineMd" color={colors.primary} style={styles.wordmark}>
          Kindred
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: spacing.stackMd,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.welcome}>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: 4, textTransform: 'capitalize' }}>
              Welcome back, {userName}
            </Txt>
            <Txt variant="headlineLgMobile" color={colors.onSurface}>
              {total === 0 ? 'Nothing coming up.' : "Here's what's coming up."}
            </Txt>
          </View>

          <Pressable
            onPress={() => router.push('/birthdays')}
            style={({ pressed }) => [styles.birthdaysBtn, pressed && { opacity: 0.8 }]}
          >
            <Icon name="cake" size={20} color={colors.onPrimaryContainer} />
            <Txt variant="labelMd" color={colors.onPrimaryContainer}>Birthdays</Txt>
          </Pressable>
        </Animated.View>

        <FormError message={loadError} onRetry={refreshPeople} retryLabel="Retry" />

        {/* An empty list on a failed load means "couldn't fetch", not "you have
            nobody", so the invitation is held back until the load succeeded. */}
        {total === 0 && !loadError && (
          <Animated.View entering={FadeInDown.duration(500).delay(120)}>
            <Card style={styles.emptyCard}>
              <View style={styles.emptyAccent} />
              <View style={{ alignItems: 'center' }}>
                <View style={styles.emptyIconWrap}>
                  <Icon name={nothingAtAll ? 'people' : 'event'} size={32} color={colors.primary} />
                </View>
                <Txt variant="headlineMd" color={colors.onSurface} style={{ textAlign: 'center', marginTop: 20 }}>
                  {nothingAtAll ? 'Nobody here yet' : 'No dates yet'}
                </Txt>
                <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={styles.emptyBlurb}>
                  {nothingAtAll
                    ? 'Add the people you care about and their days will show up here, soonest first.'
                    : 'Add a birthday or a special day to someone, and it will appear here.'}
                </Txt>
                <Pressable
                  onPress={() => router.push('/add')}
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                >
                  <Icon name="arrow-forward" size={18} color={colors.onPrimary} />
                  <Txt variant="labelMd" color={colors.onPrimary}>Go to your people</Txt>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        )}

        {groups.map((group, groupIndex) => (
          <Animated.View
            key={group.key}
            entering={FadeInDown.duration(500).delay(80 + groupIndex * 60)}
            style={{ marginBottom: spacing.stackLg }}
          >
            <View style={styles.groupHead}>
              <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ letterSpacing: 1 }}>
                {group.label.toUpperCase()}
              </Txt>
              <View style={styles.groupRule} />
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
                      <View style={[styles.iconWrap, entry.source === 'holiday' && styles.iconWrapHoliday]}>
                        <Icon
                          name={entry.icon as any}
                          size={20}
                          color={entry.source === 'holiday' ? colors.tertiary : colors.secondary}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="bodyLg" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                        {entry.title}
                      </Txt>
                      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.rowMeta}>
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

                  <View style={styles.countdown}>
                    <Txt
                      variant="labelMd"
                      color={entry.daysAway === 0 ? colors.primary : colors.onSurfaceVariant}
                    >
                      {countdown(entry.daysAway)}
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
  header: {
    alignItems: 'center',
    paddingBottom: spacing.stackMd,
    backgroundColor: colors.background,
  },
  wordmark: { fontFamily: 'Literata_700Bold', fontSize: 28, letterSpacing: -0.5 },
  welcome: {
    marginBottom: spacing.stackXl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  birthdaysBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: 4,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.stackSm, marginLeft: 2 },
  groupRule: { flex: 1, height: 1, backgroundColor: colors.surfaceVariant },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  rowMeta: { fontWeight: 'normal', marginTop: 2 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(206,234,207,0.5)',
  },
  iconWrapHoliday: { backgroundColor: 'rgba(207,151,83,0.25)' },
  countdown: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
  },
  emptyCard: { overflow: 'hidden', paddingVertical: 40, paddingHorizontal: 24, marginBottom: spacing.stackLg },
  emptyAccent: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(217,142,142,0.12)',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBlurb: { textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 22 },
  emptyBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
});
