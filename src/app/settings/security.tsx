import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Txt>
  );
}

export default function SecuritySettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      if (error) throw error;
      
      Alert.alert('Success', 'Password updated successfully.');
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={26} color={colors.onSurfaceVariant} />
        </Pressable>
        <Txt variant="headlineMd" color={colors.onSurface}>
          Security
        </Txt>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.containerMobile,
            paddingTop: spacing.stackLg,
            paddingBottom: insets.bottom + 140,
            gap: spacing.stackLg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <FieldLabel>New Password</FieldLabel>
            <View style={styles.inputWrap}>
              <Icon name="lock" size={20} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={colors.outline}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <FieldLabel>Confirm New Password</FieldLabel>
            <View style={styles.inputWrap}>
              <Icon name="lock" size={20} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={colors.outline}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Button
          label={loading ? 'Saving...' : 'Update Password'}
          onPress={handleSave}
          disabled={loading || !password.trim() || !confirmPassword.trim()}
          icon="shield"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  fieldLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
    height: '100%',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.containerMobile,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
  },
});
