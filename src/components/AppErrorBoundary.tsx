import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

// A render error anywhere below this used to take the whole app down to a blank
// white screen with no way out. This catches it and offers a way back — the
// data lives on the server, so remounting is almost always enough.
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
          <Icon name="sentiment-dissatisfied" size={32} color={colors.primary} />
        </View>

        <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 20, textAlign: 'center' }}>
          Something went wrong
        </Txt>
        <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={styles.blurb}>
          Nothing has been lost — everything you&apos;ve saved is still there. Try again, and if it keeps
          happening, closing and reopening Kindred usually clears it.
        </Txt>

        <Pressable
          onPress={() => this.setState({ error: null })}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <Icon name="refresh" size={18} color={colors.onPrimary} />
          <Txt variant="labelMd" color={colors.onPrimary}>Try again</Txt>
        </Pressable>

        {/* Only useful while developing, and hidden behind a scroll so it never
            dominates the screen. */}
        {__DEV__ && (
          <ScrollView style={styles.details} contentContainerStyle={{ padding: 12 }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.mono}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </Txt>
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
    backgroundColor: colors.background,
    padding: spacing.containerMobile,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
  },
  blurb: { textAlign: 'center', marginTop: 8, maxWidth: 300, lineHeight: 22 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  details: {
    maxHeight: 180,
    alignSelf: 'stretch',
    marginTop: 24,
    borderRadius: radius.DEFAULT,
    backgroundColor: colors.surfaceContainerLow,
  },
  mono: { fontWeight: 'normal', opacity: 0.8 },
});
