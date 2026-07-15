import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radius } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

function FieldLabel({ children, extra }: { children: React.ReactNode, extra?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
      <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.fieldLabel}>
        {typeof children === 'string' ? children.toUpperCase() : children}
      </Txt>
      {extra}
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ProfileSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  }, []);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'day' | 'month' | 'year'>('day');

  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if ((day && !month) || (month && !day)) {
      Alert.alert('Incomplete Date', 'Please provide both Day and Month for the birth date.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() !== user?.email && !emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address format.');
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
          throw new Error('This email address is invalid or not accepted by the server.');
        }
        throw error;
      }
      
      Alert.alert('Success', 'Profile updated successfully.');
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
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
          Profile Info
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
            <FieldLabel>Name</FieldLabel>
            <View style={styles.inputWrap}>
              <Icon name="person" size={20} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.outline}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <FieldLabel>Surname</FieldLabel>
            <View style={styles.inputWrap}>
              <Icon name="person-outline" size={20} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Surname"
                placeholderTextColor={colors.outline}
                value={surname}
                onChangeText={setSurname}
                autoCapitalize="words"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <FieldLabel extra={<Txt variant="labelSm" color={colors.onSurfaceVariant} style={{fontWeight: 'normal', marginLeft: 6}}>(Year optional)</Txt>}>
              Birth Date
            </FieldLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { setPickerType('day'); setPickerVisible(true); }} style={[styles.inputWrap, { flex: 1, paddingHorizontal: 0, justifyContent: 'center' }]}>
                <Txt variant="bodyMd" color={day ? colors.onSurface : colors.outline}>{day || 'Day'}</Txt>
              </Pressable>
              <Pressable onPress={() => { setPickerType('month'); setPickerVisible(true); }} style={[styles.inputWrap, { flex: 1.5, paddingHorizontal: 0, justifyContent: 'center' }]}>
                <Txt variant="bodyMd" color={month ? colors.onSurface : colors.outline}>
                  {month ? MONTHS[month - 1] : 'Month'}
                </Txt>
              </Pressable>
              <Pressable onPress={() => { setPickerType('year'); setPickerVisible(true); }} style={[styles.inputWrap, { flex: 1.2, paddingHorizontal: 0, justifyContent: 'center' }]}>
                <Txt variant="bodyMd" color={year ? colors.onSurface : colors.outline}>{year || 'Year'}</Txt>
              </Pressable>
              
              {(day || month || year) && (
                <Pressable 
                  onPress={() => { setDay(null); setMonth(null); setYear(null); }} 
                  style={{ justifyContent: 'center', paddingHorizontal: 8 }}
                >
                  <Icon name="close" size={20} color={colors.error} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <FieldLabel>Email</FieldLabel>
            <View style={styles.inputWrap}>
              <Icon name="email" size={20} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.outline}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Button
          label={loading ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={loading}
          icon="check"
          fullWidth
        />
      </View>

      <ScrollPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title={`Select ${pickerType}`}
        options={
          pickerType === 'day'
            ? Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
            : pickerType === 'month'
            ? MONTHS.map((m, i) => ({ label: m, value: i + 1 }))
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
    borderBottomColor: colors.surfaceVariant,
  },
  fieldLabel: {
    letterSpacing: 1,
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
  agePill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  agePillActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
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
