import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { showHeld } from '@/components/HeldNotice';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";



export default function ProfileSettings() {
    const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useAuth();

  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [surname, setSurname] = useState(user?.user_metadata?.surname || '');

  // Auto-parse on mount if surname is missing but name has space
  useEffect(() => {
    if (!user?.user_metadata?.surname && name.includes(' ')) {
      const parts = name.trim().split(' ');
      if (parts.length > 1) {
        setSurname(parts.pop() || '');
        setName(parts.join(' '));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse birth date "YYYY-MM-DD" or empty
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const bd = user?.user_metadata?.birth_date;
    if (bd && bd.includes('-')) {
      const [y, m, d] = bd.split('-');
      if (y && y !== '1000') setYear(parseInt(y, 10));
      if (m) setMonth(parseInt(m, 10));
      if (d) setDay(parseInt(d, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if ((day && !month) || (month && !day)) {
      Alert.alert(t('incomplete_date'), t('provide_day_month'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() !== user?.email && !emailRegex.test(email.trim())) {
      Alert.alert(t('invalid_email'), t('invalid_email_format'));
      return;
    }

    setLoading(true);
    try {
      let formattedDate = '';
      if (day && month) {
        const y = year || 1000;
        formattedDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      const updates: any = {
        data: {
          name: name.trim(),
          surname: surname.trim(),
          birth_date: formattedDate,
        },
      };

      if (email.trim() !== user?.email) {
        updates.email = email.trim();
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) {
        // More friendly error for email issues
        if (error.message.includes('invalid') && error.message.toLowerCase().includes('email')) {
          throw new Error(t('email_rejected'));
        }
        throw error;
      }

      router.back();
      showHeld(t('profile_updated'));
    } catch (error: any) {
      console.error(error);
      Alert.alert(t('error_title'), error.message || t('profile_update_failed'));
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
        <Txt variant="title">{t('profile')}</Txt>
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
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('name')}</Txt>
            <View style={inputWrap}>
              <Icon name="person" size={20} color={c.faint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('name')}
                placeholderTextColor={c.faint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('surname')}</Txt>
            <View style={inputWrap}>
              <Icon name="person-outline" size={20} color={c.faint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('surname')}
                placeholderTextColor={c.faint}
                value={surname}
                onChangeText={setSurname}
                autoCapitalize="words"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('birth_date_year_optional')}</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => { setPickerType('day'); setPickerVisible(true); }}
                style={[...inputWrap, { flex: 1, paddingHorizontal: 0, justifyContent: 'center' }]}
              >
                <Txt variant="body" color={day ? c.text : c.faint}>{day || t('day')}</Txt>
              </Pressable>
              <Pressable
                onPress={() => { setPickerType('month'); setPickerVisible(true); }}
                style={[...inputWrap, { flex: 1.5, paddingHorizontal: 0, justifyContent: 'center' }]}
              >
                <Txt variant="body" color={month ? c.text : c.faint}>
                  {month ? t(`month_sh_${month - 1}`) : t('month')}
                </Txt>
              </Pressable>
              <Pressable
                onPress={() => { setPickerType('year'); setPickerVisible(true); }}
                style={[...inputWrap, { flex: 1.2, paddingHorizontal: 0, justifyContent: 'center' }]}
              >
                <Txt variant="body" color={year ? c.text : c.faint}>{year || t('year')}</Txt>
              </Pressable>

              {(day || month || year) && (
                <Pressable
                  onPress={() => { setDay(null); setMonth(null); setYear(null); }}
                  style={{ justifyContent: 'center', paddingHorizontal: 8 }}
                >
                  <Icon name="close" size={20} color={c.danger} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Txt variant="eyebrow" color={c.faint} style={styles.fieldLabel}>{t('email')}</Txt>
            <View style={inputWrap}>
              <Icon name="email" size={20} color={c.faint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: c.text }]}
                placeholder={t('email_address')}
                placeholderTextColor={c.faint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: c.bg, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <Button
          label={loading ? i18n.t('saving') : i18n.t('save_changes')}
          onPress={handleSave}
          disabled={loading}
          icon="check"
          fullWidth
        />
      </View>

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={pickerType === 'day' ? t('select_day') : pickerType === 'month' ? t('select_month') : t('select_year')}
        options={
          pickerType === 'day'
            ? Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
            : pickerType === 'month'
            ? Array.from({ length: 12 }, (_, i) => ({ label: t(`month_sh_${i}`), value: i + 1 }))
            : Array.from({ length: 100 }, (_, i) => ({
                label: `${new Date().getFullYear() - i}`,
                value: new Date().getFullYear() - i,
              }))
        }
        selectedValue={pickerType === 'day' ? day ?? undefined : pickerType === 'month' ? month ?? undefined : year ?? undefined}
        onSelect={(val) => {
          if (pickerType === 'day') setDay(val as number);
          if (pickerType === 'month') setMonth(val as number);
          if (pickerType === 'year') setYear(val as number);
        }}
      />
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
