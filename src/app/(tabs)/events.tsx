import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/Card';
import { FormError } from '@/components/FormError';
import { useEvents } from '@/context/EventsContext';
import { parseNudges } from '@/utils/nudges';
import { recurrenceIcon, recurrenceShortLabel } from '@/utils/recurrence';
import type { MyEvent } from '@/data/mock';

function daysLabel(daysAway: number) {
  if (daysAway === 0) return 'Today!';
  if (daysAway === 1) return 'Tomorrow';
  return String(daysAway);
}

function NudgeSummary({ event }: { event: MyEvent }) {
  const nudges = parseNudges(event.nudges);
  if (nudges.length === 0) {
    return (
      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ opacity: 0.7 }}>
        No nudges set
      </Txt>
    );
  }
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ opacity: 0.8 }}>
      {nudges.map((n) => n.label).join(' · ')}
    </Txt>
  );
}

export default function MyEvents() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { events, pastEvents, loadError, refreshEvents } = useEvents();

  const featured = events[0];
  const rest = events.slice(1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Txt variant="headlineMd" color={colors.primary}>My Events</Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: spacing.stackMd,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loadError && (
          <View style={{ marginBottom: spacing.stackMd }}>
            <FormError message={loadError} onRetry={refreshEvents} retryLabel="Retry" />
          </View>
        )}

        {/* The empty card is suppressed on a failed load — an empty list there
            means "couldn't fetch", not "you have nothing". */}
        {events.length === 0 && !loadError ? (
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Card style={styles.emptyCard}>
              <View style={styles.emptyAccent} />
              <View style={{ alignItems: 'center' }}>
                <View style={styles.emptyIconWrap}>
                  <Icon name="self-improvement" size={32} color={colors.primary} />
                </View>
                <Txt variant="headlineMd" color={colors.onSurface} style={{ textAlign: 'center', marginTop: 20 }}>
                  Nothing for you yet
                </Txt>
                <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 8, maxWidth: 260, lineHeight: 22 }}>
                  Kindred keeps track of the people you care about. This is the one place that&apos;s just for you — appointments, renewals, anything you&apos;d rather not carry in your head.
                </Txt>
                <Pressable
                  onPress={() => router.push('/my-event/add' as any)}
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                >
                  <Icon name="add" size={18} color={colors.onPrimary} />
                  <Txt variant="labelMd" color={colors.onPrimary}>Add a reminder</Txt>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(500)} style={{ marginBottom: spacing.stackXl }}>
              <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: 4 }}>
                {events.length} {events.length === 1 ? 'reminder' : 'reminders'}
              </Txt>
              <Txt variant="headlineLgMobile" color={colors.onSurface}>
                Just for you.
              </Txt>
            </Animated.View>

            {/* Nearest event, given room to breathe */}
            <Animated.View entering={FadeInDown.duration(500).delay(120)} style={{ marginBottom: spacing.gutter }}>
              <Card pressable onPress={() => router.push(`/my-event/edit/${featured.id}` as any)} style={styles.featured}>
                <View style={[styles.blur, { pointerEvents: 'none' } as any]} />
                <View style={styles.featuredTop}>
                  <View style={styles.iconBadge}>
                    <Icon name={featured.icon as any} size={28} color={colors.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={styles.repeatChip}>
                      <Icon name={recurrenceIcon(featured.recurrence)} size={12} color={colors.onSecondaryContainer} />
                      <Txt variant="labelSm" color={colors.onSecondaryContainer}>
                        {recurrenceShortLabel(featured.recurrence)}
                      </Txt>
                    </View>
                    <Txt variant="headlineMd" color={colors.onSurface}>{featured.title}</Txt>
                  </View>
                </View>

                <View style={{ marginTop: spacing.stackLg }}>
                  <View style={styles.daysRow}>
                    <Txt variant="headlineXl" color={colors.primary}>{daysLabel(featured.daysAway)}</Txt>
                    {featured.daysAway > 1 && (
                      <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginBottom: 6 }}>
                        days away
                      </Txt>
                    )}
                  </View>
                  <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
                    {featured.date}
                  </Txt>
                </View>

                <View style={styles.nudgeDivider}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="notifications-active" size={14} color={colors.onSurfaceVariant} />
                    <NudgeSummary event={featured} />
                  </View>
                </View>
              </Card>
            </Animated.View>

            {rest.length > 0 && (
              <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ gap: spacing.gutter }}>
                {rest.map((event) => (
                  <Card
                    key={event.id}
                    pressable
                    onPress={() => router.push(`/my-event/edit/${event.id}` as any)}
                    style={styles.rowCard}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                      <View style={styles.iconBadgeSm}>
                        <Icon name={event.icon as any} size={20} color={colors.onPrimaryContainer} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyLg" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                          {event.title}
                        </Txt>
                        <Txt variant="bodyMd" color={colors.onSurfaceVariant}>{event.date}</Txt>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Txt variant="headlineMd" color={colors.onSurface}>{daysLabel(event.daysAway)}</Txt>
                      {event.daysAway > 1 && (
                        <Txt variant="labelSm" color={colors.onSurfaceVariant}>days</Txt>
                      )}
                    </View>
                  </Card>
                ))}
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.duration(500).delay(280)}>
              <Pressable
                onPress={() => router.push('/my-event/add' as any)}
                style={({ pressed }) => [styles.addBtn, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
              >
                <Icon name="add" size={22} color={colors.primary} />
                <Txt variant="labelMd" color={colors.primary}>Add a reminder</Txt>
              </Pressable>
            </Animated.View>
          </>
        )}

        {/* Reminders that have already happened, kept rather than deleted */}
        {pastEvents.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(320)} style={{ marginTop: spacing.stackLg, gap: spacing.stackSm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 2 }}>
              <Icon name="history" size={18} color={colors.onSurfaceVariant} />
              <Txt variant="labelSm" color={colors.onSurfaceVariant}>ALREADY HAPPENED</Txt>
            </View>

            {pastEvents.map((event) => (
              <Card
                key={event.id}
                pressable
                onPress={() => router.push(`/my-event/edit/${event.id}` as any)}
                style={[styles.rowCard, styles.pastCard]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                  <View style={[styles.iconBadgeSm, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Icon name={event.icon as any} size={20} color={colors.onSurfaceVariant} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ fontFamily: 'Inter_500Medium' }}>
                      {event.title}
                    </Txt>
                    <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ opacity: 0.8 }}>{event.date}</Txt>
                  </View>
                </View>
                <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ opacity: 0.8 }}>
                  {Math.abs(event.daysAway)}d ago
                </Txt>
              </Card>
            ))}
          </Animated.View>
        )}
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
  featured: {
    minHeight: 260,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  featuredTop: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  daysRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeSm: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  blur: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(217,142,142,0.18)',
  },
  nudgeDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  addBtn: {
    marginTop: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
  },
  pastCard: { opacity: 0.75 },
  emptyCard: {
    overflow: 'hidden',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
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
