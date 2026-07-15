import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { colors, spacing, radius, softShadow, ambientShadow } from '@/theme/tokens';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { currentUser } from '@/data/mock';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type RowProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  sublabel?: string;
  value?: string;
  trailingIcon?: React.ComponentProps<typeof Icon>['name'];
  right?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
};

function Row({ icon, label, sublabel, value, trailingIcon = 'chevron-right', right, last, onPress }: RowProps) {
  return (
    <>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
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
          {value && (
            <Txt variant="labelSm" color={colors.onSurfaceVariant} style={styles.sublabel}>
              {value}
            </Txt>
          )}
          {!right && <Icon name={trailingIcon} size={20} color={colors.onSurfaceVariant} style={{ opacity: 0.6 }} />}
        </View>
      </Pressable>
      {!last && <View style={styles.divider} />}
    </>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: value ? colors.primaryContainer : colors.surfaceVariant }]}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: value ? colors.onPrimaryContainer : colors.outline,
            alignSelf: value ? 'flex-end' : 'flex-start',
          },
        ]}
      />
    </Pressable>
  );
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
  const { user, signOut } = useAuth();

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
      console.error(e);
      Alert.alert(
        'Delete Failed',
        'Could not delete account. Make sure you have created the "delete_user" function in your Supabase SQL editor.\n\nError: ' + e.message
      );
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const userEmail = user?.email || currentUser.email;
  const userName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : currentUser.name);

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
          <View>
            <Image source={{ uri: currentUser.avatar }} style={styles.profileAvatar} contentFit="cover" />
            <View style={styles.editBadge}>
              <Icon name="edit" size={16} color={colors.primary} />
            </View>
          </View>
          <Txt variant="headlineLgMobile" color={colors.onSurface} style={{ marginTop: 8, textTransform: 'capitalize' }}>
            {userName}
          </Txt>
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
          <View style={styles.group}>
            <Row
              icon="notifications-active"
              label="Gentle Nudges"
              sublabel="Soft reminders for important moments"
              right={<Toggle value={nudges} onChange={setNudges} />}
            />
            <Row icon="schedule" label="Global Reminder Times" last />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Appearance</SectionTitle>
          <View style={styles.group}>
            <Row icon="palette" label="Theme" value="System" />
            <Row icon="language" label="Language" value="English" last />
          </View>
        </View>

        <View style={{ gap: spacing.stackSm }}>
          <SectionTitle>Support</SectionTitle>
          <View style={styles.group}>
            <Row icon="help" label="Help Center" />
            <Row icon="chat-bubble" label="Feedback" />
            <Row icon="privacy-tip" label="Privacy Policy" trailingIcon="open-in-new" last />
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
  divider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginHorizontal: 16,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: radius.full,
    padding: 4,
    justifyContent: 'center',
  },
  knob: { width: 20, height: 20, borderRadius: 10 },
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
