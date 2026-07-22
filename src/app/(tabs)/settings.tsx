import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Linking, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '@/lib/links';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { spacing, radius } from '@/theme/tokens';
import { useTheme, type ThemePref } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDER_HOUR, REMINDER_HOUR_KEY, birthdaysAsPeople, getReminderHour, syncNotifications } from '@/utils/notifications';
import { formatClockHour } from '@/utils/dates';
import { useNotificationPermission } from '@/utils/notificationPermission';
import { AvatarPicker } from '@/components/AvatarPicker';
import { FormError } from '@/components/FormError';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { usePeople } from '@/context/PeopleContext';
import { useEvents } from '@/context/EventsContext';
import { useBirthdays } from '@/context/BirthdaysContext';
import { useHolidays } from '@/context/HolidaysContext';
import { HOLIDAYS } from '@/data/holidays';
import { Toggle } from '@/components/Toggle';
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

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
    const { t } = useTranslation();
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
              <Txt variant="eyebrow" color={c.faint} style={{ fontSize: 9 }}>{t('soon')}</Txt>
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

function SectionTitle({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <Txt variant="eyebrow" color={c.faint} style={styles.sectionTitle}>
      {children}
    </Txt>
  );
}

const THEME_LABELS: Record<ThemePref, string> = {
  system: i18n.t('match_phone'),
  light: i18n.t('light'),
  dark: i18n.t('dark'),
};

export default function Settings() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, cardShadow, pref, setPref } = useTheme();
  const [nudges, setNudges] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [hourPickerVisible, setHourPickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const permission = useNotificationPermission();
  const { user, signOut } = useAuth();
  const { people } = usePeople();
  const { events, routines } = useEvents();
  const { birthdays } = useBirthdays();
  const { enabledIds } = useHolidays();

  // syncNotifications cancels everything and reschedules from scratch, so every
  // caller has to hand over the complete picture. Leaving routines out here
  // silently wiped them until the next app launch — and standalone birthdays,
  // which carry no Person, went the same way until they were added here too.
  const ownEvents = [...events, ...routines];
  const allPeople = [...people, ...birthdaysAsPeople(birthdays)];

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
    syncNotifications(allPeople, ownEvents, HOLIDAYS.filter(h => enabledIds.includes(h.id)), nudges);
  };

  const handleToggleNudges = async (val: boolean) => {
    setNudges(val);
    await AsyncStorage.setItem('@settings_nudges', String(val));
    // Pass the setting directly to sync — reading it back could race the write.
    syncNotifications(allPeople, ownEvents, HOLIDAYS.filter(h => enabledIds.includes(h.id)), val);
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
      setAvatarError(t('avatar_save_failed'));
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
          <SectionTitle>{t('account')}</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row icon="person" label={t('profile_information')} onPress={() => router.push('/settings/profile')} />
            <Row icon="shield" label={t('security')} last onPress={() => router.push('/settings/security')} />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>{t('notifications')}</SectionTitle>

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
                <Txt variant="subMed" color={c.danger}>{t('notifications_are_turned_off')}</Txt>
                <Txt variant="sub" color={c.danger} style={{ marginTop: 2 }}>
                  {t('nudges_won_apos_t_reach')}</Txt>
              </View>
              <Icon name="chevron-right" size={20} color={c.danger} />
            </Pressable>
          )}

          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row
              icon="notifications-active"
              label={t('gentle_nudges')}
              sublabel={i18n.t('soft_reminders_for_important_m')}
              right={<Toggle value={nudges} onChange={handleToggleNudges} />}
              onPress={() => handleToggleNudges(!nudges)}
            />
            <Row
              icon="public"
              label={t('shared_occasions')}
              sublabel={i18n.t('mother_s_day_valentine_s_day_a')}
              value={t('n_on', { count: enabledIds.length })}
              onPress={() => router.push('/settings/holidays')}
            />
            <Row
              icon="schedule"
              label={t('reminder_time')}
              sublabel={i18n.t('when_nudges_arrive_each_day')}
              value={formatClockHour(reminderHour)}
              onPress={() => setHourPickerVisible(true)}
              last
            />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>{t('appearance')}</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row
              icon="palette"
              label={t('theme')}
              sublabel={i18n.t('lamplight_in_light_or_dark')}
              value={THEME_LABELS[pref]}
              onPress={() => setThemePickerVisible(true)}
            />
            <Row 
              icon="language" 
              label={t('language')} 
              value={i18n.language.startsWith('tr') ? 'Türkçe' : 'English'} 
              onPress={() => setLanguagePickerVisible(true)} 
              last 
            />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>{t('support')}</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row icon="help" label={t('help_center')} onPress={() => router.push('/settings/help')} />
            <Row
              icon="chat-bubble"
              label={t('feedback')}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Kindred%20feedback`)}
            />
            <Row
              icon="share"
              label={t('share_app')}
              onPress={() => Share.share({ message: t('share_message', { url: PRIVACY_POLICY_URL }) })}
            />
            <Row
              icon="privacy-tip"
              label={t('privacy_policy')}
              onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
              last
            />
          </View>
        </View>

        {/* Quiet and small: leaving is a normal thing to do, not the loudest
            thing on the screen. Deleting the account lives behind Security. */}
        <Button
          label={t('log_out')}
          variant="quiet"
          icon="logout"
          small
          style={{ alignSelf: 'center', marginTop: spacing.stackSm }}
          onPress={signOut}
        />

        <Txt variant="sub" color={c.faint} style={{ textAlign: 'center', marginTop: spacing.stackMd }}>
          {t('app_version', { version: Constants.expoConfig?.version ?? '' })}
        </Txt>
      </ScrollView>

      <ScrollPickerModal
        visible={hourPickerVisible}
        onClose={() => setHourPickerVisible(false)}
        title={t('reminder_time')}
        options={Array.from({ length: 24 }, (_, h) => ({ label: formatClockHour(h), value: h }))}
        selectedValue={reminderHour}
        onSelect={(val) => handlePickHour(val as number)}
      />

      <ScrollPickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
        title={t('theme')}
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

      <ScrollPickerModal
        visible={languagePickerVisible}
        onClose={() => setLanguagePickerVisible(false)}
        title={t('language')}
        options={[
          { label: 'English', value: 'en' },
          { label: 'Türkçe', value: 'tr' },
        ]}
        selectedValue={i18n.language.startsWith('tr') ? 'tr' : 'en'}
        onSelect={async (val) => {
          const lang = val as string;
          await i18n.changeLanguage(lang);
          await AsyncStorage.setItem('app_language', lang);
          setLanguagePickerVisible(false);
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
});
