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

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const full = name.trim();
    const parts = full.split(' ');
    let finalName = full;
    let finalSurname = '';

    if (parts.length > 1) {
      finalSurname = parts.pop() || '';
      finalName = parts.join(' ');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: finalName,
            surname: finalSurname,
          },
        },
      });

      if (error) throw error;

      if (data?.session) {
        // Logged in immediately (email confirmation disabled)
        setSuccessMsg('Account created successfully!');
      } else {
        // Email confirmation enabled
        setSuccessMsg('Registration successful! Please check your email inbox.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const input = [styles.input, { backgroundColor: c.surfaceAlt, color: c.text }];
  const label = (text: string) => (
    <Txt variant="eyebrow" color={c.faint} style={styles.label}>{text}</Txt>
  );

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
            <Txt variant="display">Join Kindred</Txt>
          </View>
          <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
            Save the dates that matter, then stop worrying about them.
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Card style={styles.card}>
            {errorMsg ? (
              <View style={[styles.msgBox, { backgroundColor: c.dangerWash }]}>
                <Icon name="error-outline" size={20} color={c.danger} />
                <Txt variant="sub" color={c.danger} style={{ flex: 1, marginLeft: 8 }}>
                  {errorMsg}
                </Txt>
              </View>
            ) : null}

            {successMsg ? (
              <View style={[styles.msgBox, { backgroundColor: c.goodWash }]}>
                <Icon name="check-circle" size={20} color={c.good} />
                <Txt variant="sub" color={c.good} style={{ flex: 1, marginLeft: 8 }}>
                  {successMsg}
                </Txt>
              </View>
            ) : null}

            <View style={{ gap: spacing.stackSm }}>
              {label('Full name')}
              <TextInput
                style={input}
                placeholder="Jane Doe"
                placeholderTextColor={c.faint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading && !successMsg}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              {label('Email address')}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. sarah@example.com"
                placeholderTextColor={c.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={input}
                editable={!loading && !successMsg}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              {label('Password')}
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={c.faint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={input}
                editable={!loading && !successMsg}
              />
            </View>

            <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
              {label('Confirm password')}
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={c.faint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={input}
                editable={!loading && !successMsg}
              />
            </View>

            <Button
              label={loading ? 'Creating account…' : 'Sign up'}
              onPress={handleRegister}
              fullWidth
              style={{ marginTop: spacing.stackLg }}
              disabled={loading || !!successMsg}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.footer}>
          <Txt variant="body" color={c.muted}>
            Already have an account?{' '}
          </Txt>
          <Pressable onPress={() => router.push('/login')}>
            <Txt variant="bodySemi" color={c.flameDeep} style={{ textDecorationLine: 'underline' }}>
              Sign in
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
  msgBox: {
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
