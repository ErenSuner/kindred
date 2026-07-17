import { Tabs } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, softShadow } from '@/theme/tokens';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';

type TabDef = { name: string; label: string; icon: React.ComponentProps<typeof Icon>['name'] };

const TABS: TabDef[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'add', label: 'Connections', icon: 'people' },
  { name: 'events', label: 'My Events', icon: 'event' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
              focused && styles.itemActive,
              pressed && { transform: [{ scale: 0.92 }] },
            ]}
          >
            <Icon
              name={def.icon}
              size={24}
              color={focused ? colors.onPrimaryContainer : colors.onSurfaceVariant}
            />
            <Txt
              variant="labelSm"
              color={focused ? colors.onPrimaryContainer : colors.onSurfaceVariant}
              style={{ marginTop: 2 }}
            >
              {def.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
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
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 10,
    paddingHorizontal: 16,
    ...softShadow,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  itemActive: {
    backgroundColor: colors.primaryContainer,
  },
});
