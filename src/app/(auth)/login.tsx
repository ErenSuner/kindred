import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;
      
      // router.replace('/home') will be handled by the route guard in _layout.tsx
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: insets.top + spacing.stackXl,
          paddingBottom: insets.bottom + spacing.stackMd,
          justifyContent: 'center',
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', marginBottom: spacing.stackXl }}>
          <Txt variant="headlineXl" color={colors.primary} style={{ fontFamily: 'Literata_600SemiBold' }}>
            Kindred
          </Txt>
          <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
            Sign in to remember the moments that build lifelong connections.
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Icon name="error" size={20} color={colors.error} />
              <Txt variant="labelSm" color={colors.error} style={{ flex: 1, marginLeft: 8 }}>
                {errorMsg}
              </Txt>
            </View>
          ) : null}

          <View style={{ gap: spacing.stackSm }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.label}>
              EMAIL ADDRESS
            </Txt>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. sarah@example.com"
              placeholderTextColor={colors.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.label}>
              PASSWORD
            </Txt>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.outline}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <Button
            label={loading ? 'Signing In...' : 'Sign In'}
            onPress={handleLogin}
            fullWidth
            style={{ marginTop: spacing.stackLg }}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.footer}>
          <Txt variant="bodyMd" color={colors.onSurfaceVariant}>
            Don&apos;t have an account?{' '}
          </Txt>
          <Pressable onPress={() => router.push('/register')}>
            <Txt variant="labelMd" color={colors.primary} style={{ textDecorationLine: 'underline' }}>
              Sign Up
            </Txt>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: 24,
    ...softShadow,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    letterSpacing: 1,
    marginLeft: 2,
  },
  input: {
    backgroundColor: 'rgba(228,226,225,0.4)',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: radius.DEFAULT,
    padding: 12,
    marginBottom: spacing.stackMd,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.stackLg,
  },
});
