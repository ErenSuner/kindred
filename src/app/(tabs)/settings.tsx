import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme, type ThemePref } from '@/theme/ThemeContext';
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
  const { c } = useTheme();
  return (
    <>
      <Pressable
        onPress={soon ? undefined : onPress}
        disabled={soon}
        style={({ pressed }) => [
          styles.row,
          soon && { opacity: 0.45 },
          !soon && pressed && { backgroundColor: c.surfaceAlt },
        ]}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
            <Icon name={icon} size={20} color={c.flameDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyMed">{label}</Txt>
            {sublabel && (
              <Txt variant="sub" color={c.muted} style={{ marginTop: 1 }}>
                {sublabel}
              </Txt>
            )}
          </View>
        </View>
        <View style={styles.rowRight}>
          {right}
          {value && !soon && (
            <Txt variant="sub" color={c.muted}>
              {value}
            </Txt>
          )}
          {soon ? (
            <View style={[styles.soonBadge, { borderColor: c.lineStrong }]}>
              <Txt variant="eyebrow" color={c.faint} style={{ fontSize: 9 }}>Soon</Txt>
            </View>
          ) : (
            !right && <Icon name={trailingIcon} size={20} color={c.faint} />
          )}
        </View>
      </Pressable>
      {!last && <View style={[styles.divider, { backgroundColor: c.line }]} />}
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
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.sectionTitle}>
      {children}
    </Txt>
  );
}

const THEME_LABELS: Record<ThemePref, string> = {
  system: 'Match phone',
  light: 'Light',
  dark: 'Dark',
};

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, cardShadow, floatShadow, pref, setPref } = useTheme();
  const [nudges, setNudges] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [hourPickerVisible, setHourPickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 130,
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
          <Txt variant="title" style={{ marginTop: 12, textTransform: 'capitalize' }}>
            {userName}
          </Txt>
          <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
            {userEmail}
          </Txt>
          <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
            <FormError message={avatarError} />
          </View>
        </Animated.View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Account</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row icon="person" label="Profile information" onPress={() => router.push('/settings/profile')} />
            <Row icon="shield" label="Security" last onPress={() => router.push('/settings/security')} />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Notifications</SectionTitle>

          {/* The one alarm this app earns: without permission, the promise
              cannot be kept. Without this, someone can set up a dozen reminders,
              receive none of them, and never find out why. */}
          {permission.status === 'denied' && (
            <Pressable
              onPress={permission.request}
              style={[styles.permissionWarning, { backgroundColor: c.dangerWash, borderColor: c.danger }]}
            >
              <Icon name="notifications-off" size={20} color={c.danger} />
              <View style={{ flex: 1 }}>
                <Txt variant="subMed" color={c.danger}>Notifications are turned off</Txt>
                <Txt variant="sub" color={c.danger} style={{ marginTop: 2 }}>
                  Nudges won&apos;t reach you until you allow them. Tap to fix.
                </Txt>
              </View>
              <Icon name="chevron-right" size={20} color={c.danger} />
            </Pressable>
          )}

          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row
              icon="notifications-active"
              label="Gentle nudges"
              sublabel="Soft reminders for important moments"
              right={<Toggle value={nudges} onChange={handleToggleNudges} />}
              onPress={() => handleToggleNudges(!nudges)}
            />
            <Row
              icon="public"
              label="Shared occasions"
              sublabel="Mother's Day, Valentine's Day and more"
              value={`${enabledIds.length} on`}
              onPress={() => router.push('/settings/holidays')}
            />
            <Row
              icon="schedule"
              label="Reminder time"
              sublabel="When nudges arrive each day"
              value={formatHour(reminderHour)}
              onPress={() => setHourPickerVisible(true)}
              last
            />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Appearance</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row
              icon="palette"
              label="Theme"
              sublabel="Lamplight in light or dark"
              value={THEME_LABELS[pref]}
              onPress={() => setThemePickerVisible(true)}
            />
            <Row icon="language" label="Language" soon last />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Support</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row icon="help" label="Help center" soon />
            <Row icon="chat-bubble" label="Feedback" soon />
            <Row icon="privacy-tip" label="Privacy policy" soon last />
          </View>
        </View>

        <Button
          label="Log out"
          variant="quiet"
          icon="logout"
          fullWidth
          style={{ marginTop: spacing.stackSm }}
          onPress={signOut}
        />

        <Button
          label="Delete account"
          variant="danger"
          icon="delete-forever"
          fullWidth
          style={{ marginTop: spacing.stackSm }}
          onPress={handleDeleteAccount}
        />
      </ScrollView>

      <Modal visible={deleteModalVisible} transparent animationType="none" onRequestClose={() => setDeleteModalVisible(false)}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDeleteModalVisible(false)} />
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
            style={[styles.modalContent, { backgroundColor: c.surface }, floatShadow]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: c.dangerWash }]}>
              <Icon name="warning" size={30} color={c.danger} />
            </View>
            <Txt variant="heading" style={{ marginTop: 16 }}>
              {deleteStep === 1 ? 'Delete account' : 'Final warning'}
            </Txt>
            <Txt variant="body" color={c.muted} style={{ marginTop: 8, textAlign: 'center', marginBottom: 24 }}>
              {deleteStep === 1
                ? 'Are you absolutely sure? This will permanently delete your account, your people, and all saved memories. This action cannot be undone.'
                : 'This is your last chance. All your data will be permanently erased. Are you sure you want to proceed?'}
            </Txt>

            <View style={{ width: '100%', gap: 12 }}>
              <Button
                label={deleteStep === 1 ? 'Delete everything' : 'Yes, delete my account'}
                variant="dangerSolid"
                onPress={() => {
                  if (deleteStep === 1) setDeleteStep(2);
                  else executeDelete();
                }}
                disabled={isDeleting}
                fullWidth
              />
              <Button
                label="Cancel"
                variant="quiet"
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
        title="Reminder time"
        options={Array.from({ length: 24 }, (_, h) => ({ label: formatHour(h), value: h }))}
        selectedValue={reminderHour}
        onSelect={(val) => handlePickHour(val as number)}
      />

      <ScrollPickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
        title="Theme"
        options={(['system', 'light', 'dark'] as ThemePref[]).map((p) => ({
          label: THEME_LABELS[p],
          value: p,
        }))}
        selectedValue={pref}
        onSelect={(val) => {
          setPref(val as ThemePref);
          setThemePickerVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center' },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: { paddingLeft: spacing.unit },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.unit },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.containerMobile,
  },
  modalContent: {
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
