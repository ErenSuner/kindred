import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDER_HOUR, REMINDER_HOUR_KEY, getReminderHour, syncNotifications } from '@/utils/notifications';
import { useNotificationPermission } from '@/utils/notificationPermission';
import { AvatarPicker } from '@/components/AvatarPicker';
import { FormError } from '@/components/FormError';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { usePeople } from '@/context/PeopleContext';
import { useEvents } from '@/context/EventsContext';
import { useHolidays } from '@/context/HolidaysContext';
import { HOLIDAYS } from '@/data/holidays';
import { Toggle } from '@/components/Toggle';

type RowProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  sublabel?: string;
  value?: string;
  trailingIcon?: React.ComponentProps<typeof Icon>['name'];
  right?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
  // Not built yet. The row stays visible so the shape of the app is honest,
  // but it doesn't pretend to be tappable.
  soon?: boolean;
};

function Row({ icon, label, sublabel, value, trailingIcon = 'chevron-right', right, last, onPress, soon }: RowProps) {
  return (
    <>
      <Pressable
        onPress={soon ? undefined : onPress}
        disabled={soon}
        style={({ pressed }) => [styles.row, soon && styles.rowSoon, !soon && pressed && { backgroundColor: colors.surface }]}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowIcon}>
            <Icon name={icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyMd" color={colors.onSurface}>
              {label}
            </Txt>
            {sublabel && (
              <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.sublabel}>
                {sublabel}
              </Txt>
            )}
          </View>
        </View>
        <View style={styles.rowRight}>
          {right}
          {value && !soon && (
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.sublabel}>
              {value}
            </Txt>
          )}
          {soon ? (
            <View style={styles.soonBadge}>
              <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.soonText}>SOON</Txt>
            </View>
          ) : (
            !right && <Icon name={trailingIcon} size={20} color={colors.onSurfaceVariant} style={{ opacity: 0.6 }} />
          )}
        </View>
      </Pressable>
      {!last && <View style={styles.divider} />}
    </>
  );
}

// 12-hour clock, matching how the rest of the app writes dates in plain English.
function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${suffix}`;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Txt variant="labelSm" color={colors.primary} style={styles.sectionTitle}>
      {children}
    </Txt>
  );
}

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nudges, setNudges] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [hourPickerVisible, setHourPickerVisible] = useState(false);
  const permission = useNotificationPermission();
  const { user, signOut } = useAuth();
  const { people } = usePeople();
  const { events, routines } = useEvents();
  const { enabledIds } = useHolidays();

  // syncNotifications cancels everything and reschedules from scratch, so every
  // caller has to hand over the complete picture. Leaving routines out here
  // silently wiped them until the next app launch.
  const ownEvents = [...events, ...routines];

  useEffect(() => {
    AsyncStorage.getItem('@settings_nudges').then(val => {
      if (val !== null) setNudges(val === 'true');
    });
    getReminderHour().then(setReminderHour);
  }, []);

  const handlePickHour = async (hour: number) => {
    setReminderHour(hour);
    setHourPickerVisible(false);
    await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour));
    // Everything already scheduled is pinned to the old time, so it all has to
    // be laid down again.
    syncNotifications(people, ownEvents, HOLIDAYS.filter(h => enabledIds.includes(h.id)), nudges);
  };

  const handleToggleNudges = async (val: boolean) => {
    setNudges(val);
    await AsyncStorage.setItem('@settings_nudges', String(val));
    // Pass the setting directly to sync — reading it back could race the write.
    syncNotifications(people, ownEvents, HOLIDAYS.filter(h => enabledIds.includes(h.id)), val);
  };

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    setDeleteStep(1);
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user'); 
      if (error) throw error;
      
      // If successful, log out
      await signOut();
    } catch (e: any) {
      // The cause is almost always a missing delete_user RPC, which is a
      // deployment problem — not something the person tapping the button can
      // act on. It goes to the console; they get a plain apology.
      console.error('Account deletion failed', e);
      Alert.alert(
        'Delete Failed',
        "We couldn't delete your account just now. Nothing has been changed. Please try again in a moment.",
      );
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const userEmail = user?.email ?? '';
  const userName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'You');
  // Kept on the auth user rather than a table of its own — it's one field and it
  // travels with the session.
  const ownAvatarUrl: string | null = user?.user_metadata?.avatar_url ?? null;

  const saveOwnAvatar = async (publicUrl: string) => {
    setAvatarError(null);
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    if (error) {
      console.error('Could not save avatar', error);
      setAvatarError('Photo uploaded, but saving it to your profile failed.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Icon name="menu" size={28} color={colors.primary} />
        <Txt variant="headlineMd" color={colors.primary}>
          Kindred
        </Txt>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: spacing.stackMd,
          paddingBottom: insets.bottom + 120,
          gap: spacing.stackLg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.profile}>
          <AvatarPicker
            uri={ownAvatarUrl}
            initials={userName.charAt(0).toUpperCase() || undefined}
            size={96}
            subjectId="me"
            onUploaded={saveOwnAvatar}
            onError={setAvatarError}
          />
          <Txt variant="headlineLgMobile" color={colors.onSurface} style={{ marginTop: 8, textTransform: 'capitalize' }}>
            {userName}
          </Txt>
          <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
            <FormError message={avatarError} />
          </View>
          <Txt variant="bodyMd" color={colors.onSurfaceVariant}>
            {userEmail}
          </Txt>
        </Animated.View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Account</SectionTitle>
          <View style={styles.group}>
            <Row icon="person" label="Profile Information" onPress={() => router.push('/settings/profile')} />
            <Row icon="shield" label="Security" last onPress={() => router.push('/settings/security')} />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Notifications</SectionTitle>

          {/* Without this, someone can set up a dozen reminders, receive none of
              them, and never find out why. */}
          {permission.status === 'denied' && (
            <Pressable onPress={permission.request} style={styles.permissionWarning}>
              <Icon name="notifications-off" size={20} color={colors.onErrorContainer} />
              <View style={{ flex: 1 }}>
                <Txt variant="labelMd" color={colors.onErrorContainer}>Notifications are turned off</Txt>
                <Txt variant="labelSm" color={colors.onErrorContainer} style={{ fontWeight: 'normal', marginTop: 2 }}>
                  Nudges won&apos;t reach you until you allow them. Tap to fix.
                </Txt>
              </View>
              <Icon name="chevron-right" size={20} color={colors.onErrorContainer} />
            </Pressable>
          )}

          <View style={styles.group}>
            <Row
              icon="notifications-active"
              label="Gentle Nudges"
              sublabel="Soft reminders for important moments"
              right={<Toggle value={nudges} onChange={handleToggleNudges} />}
              onPress={() => handleToggleNudges(!nudges)}
            />
            <Row
              icon="public"
              label="Shared Occasions"
              sublabel="Mother's Day, Valentine's Day and more"
              value={`${enabledIds.length} on`}
              onPress={() => router.push('/settings/holidays')}
            />
            <Row
              icon="schedule"
              label="Reminder Time"
              sublabel="When nudges arrive each day"
              value={formatHour(reminderHour)}
              onPress={() => setHourPickerVisible(true)}
              last
            />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Appearance</SectionTitle>
          <View style={styles.group}>
            <Row icon="palette" label="Theme" soon />
            <Row icon="language" label="Language" soon last />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Support</SectionTitle>
          <View style={styles.group}>
            <Row icon="help" label="Help Center" soon />
            <Row icon="chat-bubble" label="Feedback" soon />
            <Row icon="privacy-tip" label="Privacy Policy" soon last />
          </View>
        </View>

        <Button
          label="Log Out"
          variant="tonal"
          icon="logout"
          fullWidth
          style={{ marginTop: spacing.stackSm }}
          onPress={signOut}
        />

        <Button
          label="Delete Account"
          variant="error"
          icon="delete-forever"
          fullWidth
          style={{ marginTop: spacing.stackSm, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error }}
          onPress={handleDeleteAccount}
        />
      </ScrollView>

      <Modal visible={deleteModalVisible} transparent animationType="none" onRequestClose={() => setDeleteModalVisible(false)}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeleteModalVisible(false)} />
          <Animated.View entering={SlideInDown.duration(300).springify()} exiting={SlideOutDown.duration(200)} style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Icon name="warning" size={32} color={colors.error} />
            </View>
            <Txt variant="headlineMd" color={colors.onSurface} style={{ marginTop: 16 }}>
              {deleteStep === 1 ? 'Delete Account' : 'Final Warning'}
            </Txt>
            <Txt variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center', marginBottom: 24 }}>
              {deleteStep === 1 
                ? 'Are you absolutely sure? This will permanently delete your account, contacts, and all saved memories. This action cannot be undone.'
                : 'This is your last chance. All your data will be permanently erased. Are you sure you want to proceed?'}
            </Txt>
            
            <View style={{ width: '100%', gap: 12 }}>
              <Button 
                label={deleteStep === 1 ? 'Delete Everything' : 'Yes, Delete My Account'} 
                variant="error"
                onPress={() => {
                  if (deleteStep === 1) setDeleteStep(2);
                  else executeDelete();
                }}
                disabled={isDeleting}
                fullWidth
              />
              <Button 
                label="Cancel" 
                variant="tonal"
                onPress={() => setDeleteModalVisible(false)} 
                disabled={isDeleting}
                fullWidth
              />
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <ScrollPickerModal
        visible={hourPickerVisible}
        onClose={() => setHourPickerVisible(false)}
        title="Reminder Time"
        options={Array.from({ length: 24 }, (_, h) => ({ label: formatHour(h), value: h }))}
        selectedValue={reminderHour}
        onSelect={(val) => handlePickHour(val as number)}
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
    backgroundColor: colors.background,
  },
  profile: { alignItems: 'center' },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.surfaceContainerLowest,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    padding: 4,
    ...softShadow,
  },
  sectionTitle: { letterSpacing: 1.5, paddingLeft: spacing.unit },
  group: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...softShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.stackMd,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.stackMd, flex: 1 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.unit },
  sublabel: { fontFamily: 'Inter_400Regular' },
  rowSoon: { opacity: 0.45 },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  soonText: { fontSize: 10, letterSpacing: 1 },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  modalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...ambientShadow,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
