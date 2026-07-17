import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { Card } from '@/components/Card';
import { currentUser } from '@/data/mock';
import { usePeople } from '@/context/PeopleContext';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { people } = usePeople();
  const { user } = useAuth();

  const userName = user?.email ? user.email.split('@')[0] : currentUser.name;

  const activePeople = people.filter(p => p.specialDays && p.specialDays.length > 0);
  const featuredPeople = activePeople.filter((p, i) => i === 0 || p.daysAway <= 7);
  const rest = activePeople.filter((p, i) => i !== 0 && p.daysAway > 7);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky title header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Txt variant="headlineMd" color={colors.primary} style={{ fontFamily: 'Literata_700Bold', fontSize: 28, letterSpacing: -0.5 }}>
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
        {/* Welcome */}
        <Animated.View entering={FadeInDown.duration(500)} style={{ marginBottom: spacing.stackXl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: 4, textTransform: 'capitalize' }}>
              Welcome back, {userName}
            </Txt>
            <Txt variant="headlineLgMobile" color={colors.onSurface}>
              Here is what&apos;s coming up.
            </Txt>
          </View>
          <Pressable
            onPress={() => router.push('/birthdays')}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.primaryContainer,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: radius.full,
                marginTop: 4,
              },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Icon name="cake" size={20} color={colors.onPrimaryContainer} />
            <Txt variant="labelMd" color={colors.onPrimaryContainer}>Birthdays</Txt>
          </Pressable>
        </Animated.View>

        {/* Empty state */}
        {people.length === 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.emptyState}>
            <Icon name="people" size={48} color={colors.outlineVariant} />
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16, textAlign: 'center' }}>
              No connections yet
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center', maxWidth: 280 }}>
              Add someone special to start tracking the moments that matter.
            </Txt>
          </Animated.View>
        )}

        {/* Empty special days state */}
        {people.length > 0 && activePeople.length === 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(150)}>
            <Card style={styles.emptyDaysCard}>
              <View style={styles.emptyDaysAccent} />
              <View style={styles.emptyDaysContent}>
                <View style={styles.emptyDaysIconWrap}>
                  <Icon name="event" size={32} color={colors.primary} />
                </View>
                <Txt variant="headlineMd" color={colors.onSurface} style={{ textAlign: 'center', marginTop: 20 }}>
                  No special days yet
                </Txt>
                <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 8, maxWidth: 260, lineHeight: 22 }}>
                  Birthdays, anniversaries, milestones — add a special day to someone you care about and never miss a moment.
                </Txt>
                <Pressable
                  onPress={() => {
                    if (people.length > 0) {
                      router.push(`/person/${people[0].id}` as any);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.emptyDaysBtn,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Icon name="add" size={18} color={colors.onPrimary} />
                  <Txt variant="labelMd" color={colors.onPrimary}>
                    Add a special day
                  </Txt>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Featured events */}
        {featuredPeople.map((featured, index) => {
          const nextDay = featured.specialDays && featured.specialDays.length > 1 ? featured.specialDays[1] : null;
          return (
            <Animated.View key={featured.id} entering={FadeInDown.duration(500).delay(120 + index * 50)} style={{ marginBottom: spacing.gutter }}>
              <Card pressable onPress={() => router.push(`/person/${featured.id}` as any)} style={styles.featured}>
                <View style={[styles.blur, { pointerEvents: 'none' } as any]} />
                <View style={styles.featuredTop}>
                  <Avatar uri={featured.avatar} initials={featured.initials} size={64} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Chip label={featured.eventTag} tone="secondary" role={featured.eventTag} />
                    <Txt variant="headlineMd" color={colors.onSurface}>
                      {featured.eventTitle}
                    </Txt>
                  </View>
                </View>
                <View style={{ marginTop: spacing.stackLg, marginBottom: nextDay ? 0 : spacing.stackSm }}>
                  <View style={styles.daysRow}>
                    <Txt variant="headlineXl" color={colors.primary}>
                      {featured.daysAway === 0 ? 'Today!' : featured.daysAway}
                    </Txt>
                    {featured.daysAway !== 0 && (
                      <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginBottom: 6 }}>
                        days away
                      </Txt>
                    )}
                  </View>
                  <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 4 }}>
                    {featured.eventDate}
                  </Txt>
                </View>
                {nextDay && (
                  <View style={styles.nextEventDivider}>
                    <View style={styles.nextEventInner}>
                      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ opacity: 0.8 }}>
                        Next: {nextDay.title}
                      </Txt>
                      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={{ opacity: 0.8 }}>
                        {nextDay.date} ({nextDay.daysAway === 0 ? 'Today!' : `${nextDay.daysAway}d`})
                      </Txt>
                    </View>
                  </View>
                )}
              </Card>
            </Animated.View>
          );
        })}

        {/* Remaining people */}
        {rest.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ marginTop: spacing.gutter, gap: spacing.gutter }}>
            {rest.map((person) => (
              <Card key={person.id} pressable onPress={() => router.push(`/person/${person.id}`)} style={styles.rowCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                  <Avatar uri={person.avatar} initials={person.initials} size={48} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyLg" color={colors.onSurface} style={{ fontFamily: 'Inter_500Medium' }}>
                      {person.name}
                    </Txt>
                    <Txt variant="bodyMd" color={colors.onSurfaceVariant}>
                      {person.eventTitle}
                    </Txt>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="headlineMd" color={colors.onSurface}>
                    {person.daysAway === 0 ? 'Today!' : person.daysAway}
                  </Txt>
                  {person.daysAway !== 0 && (
                    <Txt variant="labelSm" color={colors.onSurfaceVariant}>
                      days
                    </Txt>
                  )}
                </View>
              </Card>
            ))}
          </Animated.View>
        )}

        {/* Quick add */}
        <Animated.View entering={FadeInDown.duration(500).delay(280)}>
          <Pressable
            onPress={() => router.push('/new-connection')}
            style={({ pressed }) => [styles.addBtn, pressed && { backgroundColor: colors.surfaceContainerHigh }]}
          >
            <Icon name="add" size={22} color={colors.primary} />
            <Txt variant="labelMd" color={colors.primary}>
              Add a new connection
            </Txt>
          </Pressable>
        </Animated.View>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.stackXl * 2,
  },
  featured: {
    minHeight: 260,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  featuredTop: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  daysRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blur: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(217,142,142,0.18)',
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
  nextEventDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  nextEventInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyDaysCard: {
    overflow: 'hidden',
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginBottom: spacing.gutter,
  },
  emptyDaysAccent: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(217,142,142,0.12)',
  },
  emptyDaysContent: {
    alignItems: 'center',
  },
  emptyDaysIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDaysBtn: {
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
