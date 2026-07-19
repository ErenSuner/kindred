import { Tabs } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';

type TabDef = { name: string; label: string; icon: React.ComponentProps<typeof Icon>['name'] };

const TABS: TabDef[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'add', label: 'People', icon: 'people' },
  { name: 'events', label: 'Events', icon: 'event' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

// The floating ink bar — the app's dark anchor, present on every tab. Active
// tab glows candle-amber.
function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { c, floatShadow } = useTheme();
  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.bar, { backgroundColor: c.ink }, floatShadow]}>
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
              style={({ pressed }) => [
                styles.item,
                focused && { backgroundColor: c.inkSoft },
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <Icon name={def.icon} size={22} color={focused ? c.flame : c.onInkFaint} />
              <Txt
                variant="eyebrow"
                color={focused ? c.onInk : c.onInkFaint}
                style={{ marginTop: 3 }}
              >
                {def.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
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
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    maxWidth: 560,
    marginHorizontal: 'auto',
    borderRadius: radius.xl,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
});
