import { useState } from 'react';
import i18n from '@/lib/i18n';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { pickAvatarImage, uploadAvatar } from '@/utils/avatars';
import { useAuth } from '@/context/AuthContext';

type Props = {
  // Current image, if any.
  uri?: string | null;
  // Shown while there's no image.
  initials?: string;
  size?: number;
  // Keeps one subject's uploads distinct from another's inside the user folder.
  subjectId: string;
  onUploaded: (publicUrl: string) => void | Promise<void>;
  onError?: (message: string) => void;
  // In a list, the badge is an invitation to add a missing photo — once one is
  // set it just adds noise, so it can be hidden.
  hideBadgeWhenSet?: boolean;
};

// Tap-to-replace avatar. Uploads immediately rather than deferring to a form
// save, so the picture is on screen (and in storage) before anything else is
// filled in — and so a failed upload can't silently lose a photo the user
// thought was attached.
export function AvatarPicker({
  uri,
  initials,
  size = 96,
  subjectId,
  onUploaded,
  onError,
  hideBadgeWhenSet = false,
}: Props) {
  const { c } = useTheme();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const dim = { width: size, height: size, borderRadius: size / 2 };
  // The badge and initials track the avatar's size so this works equally well at
  // 96px on a profile and 52px in a list row.
  const badgeSize = Math.max(20, Math.round(size * 0.33));
  const badgeDim = { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 };
  const showBadge = !busy && !(hideBadgeWhenSet && uri);

  const handlePress = async () => {
    if (busy) return;
    if (!user) {
      onError?.(i18n.t('need_sign_in_photo'));
      return;
    }

    try {
      const picked = await pickAvatarImage();

      if (picked.status === 'denied') {
        onError?.(i18n.t('photos_access_picture'));
        return;
      }
      if (picked.status === 'cancelled') return;

      setBusy(true);
      const publicUrl = await uploadAvatar(user.id, picked.base64, picked.mimeType, subjectId);
      await onUploaded(publicUrl);
    } catch (e) {
      console.error('Avatar upload failed', e);
      onError?.(i18n.t('photo_upload_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      style={({ pressed }) => [
        styles.wrap,
        dim,
        { backgroundColor: c.surfaceAlt },
        pressed && !busy && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={[dim, styles.img]} contentFit="cover" transition={200} />
      ) : (
        <View style={[dim, styles.placeholder, { backgroundColor: c.flameWash }]}>
          {initials ? (
            <Txt color={c.flameDeep} style={{ fontSize: size * 0.36, fontFamily: fonts.frauncesSemiBold }}>
              {initials}
            </Txt>
          ) : (
            <Icon name="add-a-photo" size={size * 0.3} color={c.flameDeep} />
          )}
        </View>
      )}

      {/* Doubles as the affordance: an invitation when empty, an edit hint when set. */}
      {showBadge && (
        <View style={[styles.badge, badgeDim, { backgroundColor: c.flame, borderColor: c.bg }]}>
          <Icon name={uri ? 'edit' : 'add-a-photo'} size={badgeSize * 0.55} color={c.onFlame} />
        </View>
      )}

      {busy && (
        <View style={[styles.busyVeil, dim, { backgroundColor: c.overlay }]}>
          <ActivityIndicator size="small" color={c.flame} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  busyVeil: {
    position: 'absolute',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
