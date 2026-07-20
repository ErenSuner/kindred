import { Tabs } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { useTranslation } from 'react-i18next';

type TabDef = { name: string; label: string; icon: React.ComponentProps<typeof Icon>['name'] };

const TABS: (Omit<TabDef, 'label'> & { labelKey: string })[] = [
  { name: 'home', labelKey: 'tab_home', icon: 'home' },
  { name: 'add', labelKey: 'tab_people', icon: 'people' },
  { name: 'events', labelKey: 'tab_events', icon: 'event' },
  { name: 'settings', labelKey: 'tab_settings', icon: 'settings' },
];

// How the active pill and its neighbours resize when the tab changes. One
// unhurried spring — the small delight the whole bar is built around.
const SLIDE = LinearTransition.springify().damping(20).stiffness(180);

// The floating ink bar — the app's dark anchor, present on every tab. Only the
// active tab carries a label: it expands into an amber pill, the others stay
// quiet icons. That keeps the bar from being a row of cramped micro-captions,
// and gives switching tabs something that moves.
function TabBar({ state, navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <Animated.View layout={SLIDE} style={[styles.bar, { backgroundColor: c.ink }, floatShadow]}>
        {state.routes.map((route: any, i: number) => {
          const def = TABS.find((t) => t.name === route.name);
          if (!def) return null;

          const focused = state.index === i;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(def.labelKey)}
              hitSlop={6}
            >
              <Animated.View
                layout={SLIDE}
                style={[
                  styles.item,
                  focused ? { backgroundColor: c.flame } : styles.itemIdle,
                ]}
              >
                <Icon name={def.icon} size={23} color={focused ? c.onFlame : c.onInkFaint} />
                {focused && (
                  <Animated.View entering={FadeIn.duration(160)}>
                    <Txt variant="label" color={c.onFlame} numberOfLines={1}>
                      {t(def.labelKey)}
                    </Txt>
                  </Animated.View>
                )}
              </Animated.View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  // Content-sized and centred, so the active pill genuinely expands and nudges
  // the others aside rather than lighting up a fixed cell.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    padding: 7,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radius.full,
  },
  // An idle tab is a plain icon — no background, tighter width.
  itemIdle: { paddingHorizontal: 16 },
});
