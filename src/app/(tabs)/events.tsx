import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/Card';
import { AddEventSheet } from '@/components/AddEventSheet';
import { FormError } from '@/components/FormError';
import { useEvents } from '@/context/EventsContext';
import { parseNudges } from '@/utils/nudges';
import { recurrenceIcon, recurrenceShortLabel } from '@/utils/recurrence';
import { weekdaysLabel } from '@/utils/routines';
import { formatTimeOfDay } from '@/utils/eventTime';
import type { MyEvent } from '@/data/mock';

function countdown(daysAway: number): string {
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  return `${daysAway} days`;
}

function NudgeSummary({ event, onInk = false }: { event: MyEvent; onInk?: boolean }) {
  const { c } = useTheme();
  const fg = onInk ? c.onInkMuted : c.muted;
  const nudges = parseNudges(event.nudges);
  if (nudges.length === 0) {
    return (
      <Txt variant="sub" color={fg} style={{ opacity: 0.8 }}>
        Reminded on the day
      </Txt>
    );
  }
  return (
    <Txt variant="sub" color={fg} style={{ opacity: 0.9 }}>
      {nudges.map((n) => n.label).join(' · ')}
    </Txt>
  );
}

export default function MyEvents() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { events, routines, pastEvents, loadError, refreshEvents } = useEvents();
  const { user } = useAuth();
  const userName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'You');
  const ownAvatarUrl: string | undefined = user?.user_metadata?.avatar_url ?? undefined;

  const featured = events[0];
  const rest = events.slice(1);

  const [addVisible, setAddVisible] = useState(false);
  const openAdd = () => setAddVisible(true);
  const goAdd = (choice: 'once' | 'weekly') =>
    router.push((choice === 'weekly' ? '/my-event/routine' : '/my-event/add') as any);

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
        {/* Title left, primary add top-right — the same shape as People, so
            "where do I add" has one answer across the app. */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.titleRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="sub" color={c.muted} style={{ marginBottom: 6 }}>
              {events.length === 0
                ? 'Appointments, renewals, routines'
                : `${events.length} ${events.length === 1 ? 'reminder' : 'reminders'}`}
            </Txt>
            <Txt variant="display">Just for you.</Txt>
          </View>
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [
              styles.headerBtn,
              { backgroundColor: c.flame },
              pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
            ]}
          >
            <Icon name="add" size={17} color={c.onFlame} />
            <Txt variant="label" color={c.onFlame}>Add</Txt>
          </Pressable>
        </Animated.View>

        {loadError && (
          <View style={{ marginBottom: spacing.stackMd }}>
            <FormError message={loadError} onRetry={refreshEvents} retryLabel="Retry" />
          </View>
        )}

        {/* The empty card is suppressed on a failed load — an empty list there
            means "couldn't fetch", not "you have nothing". */}
        {events.length === 0 && routines.length === 0 && !loadError ? (
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Card style={styles.emptyCard}>
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.emptyIconWrap, { backgroundColor: c.flameWash }]}>
                  <Icon name="self-improvement" size={30} color={c.flameDeep} />
                </View>
                <Txt variant="heading" style={{ textAlign: 'center', marginTop: 20 }}>
                  Nothing for you yet
                </Txt>
                <Txt variant="body" color={c.muted} style={{ textAlign: 'center', marginTop: 8, maxWidth: 270 }}>
                  Appointments, renewals, anything you&apos;d rather not carry in your head.
                </Txt>
                <Pressable
                  onPress={openAdd}
                  style={({ pressed }) => [
                    styles.emptyBtn,
                    { backgroundColor: c.flame },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Icon name="add" size={18} color={c.onFlame} />
                  <Txt variant="bodySemi" color={c.onFlame}>Add something</Txt>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        ) : (
          <>
            {/* Nearest reminder — the one dark card on this screen. */}
            {featured && (
            <Animated.View entering={FadeInDown.duration(500).delay(120)} style={{ marginBottom: spacing.gutter }}>
              <Card ink pressable onPress={() => router.push(`/my-event/edit/${featured.id}` as any)}>
                <View style={styles.featuredEyebrowRow}>
                  <View style={[styles.flameDot, { backgroundColor: c.flame }]} />
                  <Txt variant="eyebrow" color={c.flame}>Next up</Txt>
                  <View style={{ flex: 1 }} />
                  <View style={[styles.repeatChip, { backgroundColor: c.inkSoft }]}>
                    <Icon name={recurrenceIcon(featured.recurrence)} size={12} color={c.onInkMuted} />
                    <Txt variant="label" color={c.onInkMuted}>
                      {recurrenceShortLabel(featured.recurrence)}
                    </Txt>
                  </View>
                </View>

                <View style={styles.featuredTop}>
                  <Avatar uri={ownAvatarUrl} initials={userName?.charAt(0)?.toUpperCase()} size={56} ring={false} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="title" color={c.onInk}>{featured.title}</Txt>
                    <Txt variant="sub" color={c.onInkMuted} style={{ marginTop: 4 }}>
                      {featured.date}{featured.timeOfDay ? ` · ${formatTimeOfDay(featured.timeOfDay)}` : ''}
                    </Txt>
                  </View>
                </View>

                <Txt
                  color={c.flame}
                  style={{ fontFamily: fonts.frauncesSemiBold, fontSize: 30, lineHeight: 36, marginTop: 18 }}
                >
                  {featured.daysAway === 0
                    ? 'Today'
                    : featured.daysAway === 1
                    ? 'Tomorrow'
                    : `in ${featured.daysAway} days`}
                </Txt>

                {/* The mechanism, quietly visible. */}
                <View style={[styles.nudgeDivider, { borderTopColor: c.inkSoft }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="notifications-none" size={14} color={c.onInkMuted} />
                    <NudgeSummary event={featured} onInk />
                  </View>
                </View>
              </Card>
            </Animated.View>
            )}

            {rest.length > 0 && (
              <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ gap: spacing.stackSm }}>
                {rest.map((event) => (
                  <Card
                    key={event.id}
                    pressable
                    onPress={() => router.push(`/my-event/edit/${event.id}` as any)}
                    style={styles.rowCard}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                      <Avatar uri={ownAvatarUrl} initials={userName?.charAt(0)?.toUpperCase()} size={44} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt variant="bodyMed">{event.title}</Txt>
                        <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
                          {event.date}{event.timeOfDay ? ` · ${formatTimeOfDay(event.timeOfDay)}` : ''}
                        </Txt>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.countChip,
                        { backgroundColor: event.daysAway === 0 ? c.flameWash : c.surfaceAlt },
                      ]}
                    >
                      <Txt
                        variant="num"
                        color={event.daysAway === 0 ? c.flameDeep : c.muted}
                        style={{ fontSize: 13, lineHeight: 17 }}
                      >
                        {countdown(event.daysAway)}
                      </Txt>
                    </View>
                  </Card>
                ))}
              </Animated.View>
            )}

          </>
        )}

        {/* Weekly routines — no countdown, because there's always another one.
            Only shown once there are some; adding is the shared "Add" flow. */}
        {routines.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ marginTop: spacing.stackLg, gap: spacing.stackSm }}>
            <View style={styles.sectionHead}>
              <Txt variant="eyebrow" color={c.faint}>Every week</Txt>
              <View style={[styles.sectionRule, { backgroundColor: c.line }]} />
            </View>

            {routines.map((routine) => (
              <Card
                key={routine.id}
                pressable
                onPress={() => router.push({ pathname: '/my-event/routine', params: { id: routine.id } } as any)}
                style={styles.rowCard}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  {/* Amber, like the repeat icon everywhere else routines appear
                      — grey-on-grey left it invisible next to photo rows. */}
                  <View style={[styles.routineIcon, { backgroundColor: c.flameWash }]}>
                    <Icon name="repeat" size={20} color={c.flameDeep} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="bodyMed">{routine.title}</Txt>
                    <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
                      {weekdaysLabel(routine.weekdays ?? [])}
                      {routine.timeOfDay ? ` · ${formatTimeOfDay(routine.timeOfDay)}` : ''}
                    </Txt>
                  </View>
                </View>
                <Txt variant="sub" color={c.muted}>
                  {routine.daysAway === 0 ? 'Today' : routine.daysAway === 1 ? 'Tomorrow' : `in ${routine.daysAway} days`}
                </Txt>
              </Card>
            ))}
          </Animated.View>
        )}

        {/* Already happened — something to look back on, never a failure. */}
        {pastEvents.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(320)} style={{ marginTop: spacing.stackLg, gap: spacing.stackSm }}>
            <View style={styles.sectionHead}>
              <Txt variant="eyebrow" color={c.faint}>Looking back</Txt>
              <View style={[styles.sectionRule, { backgroundColor: c.line }]} />
            </View>

            {pastEvents.map((event) => (
              <Card
                key={event.id}
                pressable
                onPress={() => router.push(`/my-event/edit/${event.id}` as any)}
                style={[styles.rowCard, { opacity: 0.75 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  <Avatar uri={ownAvatarUrl} initials={userName?.charAt(0)?.toUpperCase()} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="bodyMed" color={c.muted}>{event.title}</Txt>
                    <Txt variant="sub" color={c.faint} style={{ marginTop: 2 }}>{event.date}</Txt>
                  </View>
                </View>
                <Txt variant="sub" color={c.faint}>
                  {Math.abs(event.daysAway)} days ago
                </Txt>
              </Card>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      <AddEventSheet visible={addVisible} onClose={() => setAddVisible(false)} onChoose={goAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  featuredEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  flameDot: { width: 8, height: 8, borderRadius: 4 },
  featuredTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 },
  repeatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  nudgeDivider: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.stackLg,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 2 },
  sectionRule: { flex: 1, height: 1 },
  routineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
