import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { PRIVACY_POLICY_URL } from '@/lib/links';
import { radius, spacing } from '@/theme/tokens';
import { useTheme, type ThemePref } from '@/theme/ThemeContext';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Toggle } from '@/components/Toggle';
import { ScrollPickerModal } from '@/components/ScrollPickerModal';
import { useAuth } from '@/context/AuthContext';
import { useBirthdays } from '@/context/BirthdaysContext';
import { NUDGES_KEY, REMINDER_HOUR, syncBirthdayNotifications } from '@/utils/notifications';
import { useNotificationPermission } from '@/utils/notificationPermission';

type RowProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  sublabel?: string;
  value?: string;
  right?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
};

function Row({ icon, label, sublabel, value, right, last, onPress }: RowProps) {
  const { c } = useTheme();
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.surfaceAlt }]}
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
          {value && (
            <Txt variant="sub" color={c.muted}>
              {value}
            </Txt>
          )}
          {!right && <Icon name="chevron-right" size={20} color={c.faint} />}
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

export default function Settings() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, cardShadow, pref, setPref } = useTheme();
  const permission = useNotificationPermission();
  const { user, signOut } = useAuth();
  const { birthdays } = useBirthdays();

  const [nudges, setNudges] = useState(true);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);

  const themeLabels: Record<ThemePref, string> = {
    system: t('match_phone'),
    light: t('light'),
    dark: t('dark'),
  };

  useEffect(() => {
    AsyncStorage.getItem(NUDGES_KEY).then((val) => {
      if (val !== null) setNudges(val === 'true');
    });
  }, []);

  const handleToggleNudges = async (val: boolean) => {
    setNudges(val);
    await AsyncStorage.setItem(NUDGES_KEY, String(val));
    // Passed directly rather than read back, which could race the write.
    syncBirthdayNotifications(birthdays, val);
  };

  const userEmail = user?.email ?? '';
  const userName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : t('you'));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('back')}>
          <Icon name="arrow-back" size={24} color={c.muted} />
        </Pressable>
        <Txt variant="title" style={styles.headerTitle}>
          {t('settings')}
        </Txt>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.containerMobile,
          paddingBottom: insets.bottom + 60,
          gap: spacing.stackLg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.identity}>
          <Txt variant="title" style={{ textTransform: 'capitalize' }}>
            {userName}
          </Txt>
          <Txt variant="sub" color={c.muted} style={{ marginTop: 2 }}>
            {userEmail}
          </Txt>
        </Animated.View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>{t('notifications')}</SectionTitle>

          {/* The one alarm this app earns: without permission, the promise
              cannot be kept. Without this, someone can add a dozen birthdays,
              be told about none of them, and never find out why. */}
          {permission.status === 'denied' && (
            <Pressable
              onPress={permission.request}
              style={[styles.permissionWarning, { backgroundColor: c.dangerWash, borderColor: c.danger }]}
            >
              <Icon name="notifications-off" size={20} color={c.danger} />
              <View style={{ flex: 1 }}>
                <Txt variant="subMed" color={c.danger}>
                  {t('notifications_are_turned_off')}
                </Txt>
                <Txt variant="sub" color={c.danger} style={{ marginTop: 2 }}>
                  {t('nudges_won_apos_t_reach')}
                </Txt>
              </View>
              <Icon name="chevron-right" size={20} color={c.danger} />
            </Pressable>
          )}

          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row
              icon="notifications-active"
              label={t('reminders')}
              sublabel={t('reminders_arrive_at', { time: `${String(REMINDER_HOUR).padStart(2, '0')}:00` })}
              right={<Toggle value={nudges} onChange={handleToggleNudges} />}
              onPress={() => handleToggleNudges(!nudges)}
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
              value={themeLabels[pref]}
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
          <SectionTitle>{t('account')}</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row icon="person" label={t('profile_information')} onPress={() => router.push('/settings/profile')} />
            <Row icon="shield" label={t('security')} last onPress={() => router.push('/settings/security')} />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>{t('support')}</SectionTitle>
          <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }, cardShadow]}>
            <Row icon="help" label={t('help_center')} onPress={() => router.push('/settings/help')} />
            {/* Was a mailto: link, which Android 11+ can't resolve without a
                <queries> manifest entry — so it opened a blank browser tab.
                Now a screen that writes straight to the database. */}
            <Row icon="chat-bubble" label={t('feedback')} onPress={() => router.push('/settings/feedback')} />
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

        <Txt variant="sub" color={c.faint} style={{ textAlign: 'center' }}>
          {t('app_version', { version: Constants.expoConfig?.version ?? '' })}
        </Txt>
      </ScrollView>

      <ScrollPickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
        title={t('theme')}
        options={(['system', 'light', 'dark'] as ThemePref[]).map((p) => ({
          label: themeLabels[p],
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMobile,
    paddingBottom: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', marginRight: 24 },
  identity: { alignItems: 'center', paddingTop: spacing.stackSm },
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
  divider: { height: 1, marginHorizontal: 16 },
});
