import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
            Join Kindred
          </Txt>
          <Txt variant="bodyLg" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
            Create an account to save birthdays, anniversaries, and notes.
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

          {successMsg ? (
            <View style={styles.successBox}>
              <Icon name="check-circle" size={20} color={colors.secondary} />
              <Txt variant="bodyMd" color={colors.onSecondaryFixedVariant} style={{ flex: 1, marginLeft: 8 }}>
                {successMsg}
              </Txt>
            </View>
          ) : null}

          <View style={{ gap: spacing.stackSm }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.label}>
              FULL NAME
            </Txt>
            <TextInput
              style={styles.input}
              placeholder="Jane Doe"
              placeholderTextColor={colors.outline}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading && !successMsg}
            />
          </View>

          <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
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
              editable={!loading && !successMsg}
            />
          </View>

          <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.label}>
              PASSWORD
            </Txt>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.outline}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              editable={!loading && !successMsg}
            />
          </View>

          <View style={{ gap: spacing.stackSm, marginTop: spacing.stackMd }}>
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.label}>
              CONFIRM PASSWORD
            </Txt>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={colors.outline}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              editable={!loading && !successMsg}
            />
          </View>

          <Button
            label={loading ? 'Registering...' : 'Sign Up'}
            onPress={handleRegister}
            fullWidth
            style={{ marginTop: spacing.stackLg }}
            disabled={loading || !!successMsg}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.footer}>
          <Txt variant="bodyMd" color={colors.onSurfaceVariant}>
            Already have an account?{' '}
          </Txt>
          <Pressable onPress={() => router.push('/login')}>
            <Txt variant="labelMd" color={colors.primary} style={{ textDecorationLine: 'underline' }}>
              Sign In
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryContainer,
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
