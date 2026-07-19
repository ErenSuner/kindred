import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
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

  const input = [styles.input, { backgroundColor: c.surfaceAlt, color: c.text }];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
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
          <View style={styles.brandRow}>
            <View style={[styles.flameDot, { backgroundColor: c.flame }]} />
            <Txt variant="display">Kindred</Txt>
          </View>
          <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
            Welcome back.
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Card style={styles.card}>
            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: c.dangerWash }]}>
                <Icon name="error-outline" size={20} color={c.danger} />
                <Txt variant="sub" color={c.danger} style={{ flex: 1, marginLeft: 8 }}>
                  {errorMsg}
                </Txt>
              </View>
            ) : null}

            <View style={{ gap: spacing.stackSm }}>
              <Txt variant="eyebrow" color={c.faint} style={styles.label}>Email address</Txt>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. sarah@example.com"
                placeholderTextColor={c.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={input}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              <Txt variant="eyebrow" color={c.faint} style={styles.label}>Password</Txt>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={c.faint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={input}
              />
            </View>

            <Button
              label={loading ? 'Signing in…' : 'Sign in'}
              onPress={handleLogin}
              fullWidth
              style={{ marginTop: spacing.stackLg }}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.footer}>
          <Txt variant="body" color={c.muted}>
            Don&apos;t have an account?{' '}
          </Txt>
          <Pressable onPress={() => router.push('/register')}>
            <Txt variant="bodySemi" color={c.flameDeep} style={{ textDecorationLine: 'underline' }}>
              Sign up
            </Txt>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flameDot: { width: 10, height: 10, borderRadius: 5 },
  card: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    marginLeft: 2,
  },
  input: {
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
