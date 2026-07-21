import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { showHeld } from '@/components/HeldNotice';
import { describeWriteError } from '@/utils/loadError';
import { supabase } from '@/lib/supabase';
import { useTranslation } from "react-i18next";

export default function SecuritySettings() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);

    if (!password.trim() || !confirmPassword.trim()) {
      setError(t('fill_all_fields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwords_no_match'));
      return;
    }

    if (password.length < 6) {
      setError(t('password_min'));
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: password.trim() });
      if (err) throw err;

      router.back();
      showHeld(t('password_updated'));
    } catch (e) {
      console.error(e);
      setError(describeWriteError(e));
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = [styles.inputWrap, { backgroundColor: c.surface, borderColor: c.line }];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.line }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Icon name="arrow-back" size={26} color={c.muted} />
        </Pressable>
        <Txt variant="title">{t('security')}</Txt>
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
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('new_password')}</Txt>
            <View style={inputWrap}>
              <Icon name="lock" size={20} color={c.faint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('enter_new_password')}
                placeholderTextColor={c.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('confirm_new_password')}</Txt>
            <View style={inputWrap}>
              <Icon name="lock" size={20} color={c.faint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('confirm_new_password')}
                placeholderTextColor={c.faint}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </Animated.View>

          <FormError message={error} />

        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: c.bg, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <Button
          label={loading ? t('saving') : t('update_password')}
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
  },
  fieldLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
    height: '100%',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.containerMobile,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
