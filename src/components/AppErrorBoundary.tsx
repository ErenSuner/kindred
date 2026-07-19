import React from 'react';
import { View, StyleSheet, Pressable, ScrollView, Text } from 'react-native';
import { light, radius, spacing } from '@/theme/tokens';
import { type as typeScale } from '@/theme/type';
import { Icon } from '@/components/Icon';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

// A render error anywhere below this used to take the whole app down to a blank
// white screen with no way out. This catches it and offers a way back — the
// data lives on the server, so remounting is almost always enough.
//
// Sits outside every provider (including ThemeProvider), so it styles itself
// with the static light palette rather than the theme hook.
const c = light;

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          <Icon name="sentiment-dissatisfied" size={32} color={c.flameDeep} />
        </View>

        <Text style={[typeScale.heading, styles.title]}>Something went wrong</Text>
        <Text style={[typeScale.body, styles.blurb]}>
          Nothing has been lost — everything you&apos;ve saved is still there. Try again, and if it
          keeps happening, closing and reopening Kindred usually clears it.
        </Text>

        <Pressable
          onPress={() => this.setState({ error: null })}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <Icon name="refresh" size={18} color={c.onFlame} />
          <Text style={[typeScale.bodySemi, { color: c.onFlame }]}>Try again</Text>
        </Pressable>

        {/* Only useful while developing, and hidden behind a scroll so it never
            dominates the screen. */}
        {__DEV__ && (
          <ScrollView style={styles.details} contentContainerStyle={{ padding: 12 }}>
            <Text style={[typeScale.sub, styles.mono]}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </Text>
          </ScrollView>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bg,
    padding: spacing.containerMobile,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.flameWash,
  },
  title: { marginTop: 20, textAlign: 'center', color: c.text },
  blurb: { textAlign: 'center', marginTop: 8, maxWidth: 300, color: c.muted },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: c.flame,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  details: {
    maxHeight: 180,
    alignSelf: 'stretch',
    marginTop: 24,
    borderRadius: radius.DEFAULT,
    backgroundColor: c.surfaceAlt,
  },
  mono: { opacity: 0.8, color: c.muted },
});
