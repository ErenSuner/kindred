import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/theme/tokens';
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
      onError?.('You need to be signed in to add a photo.');
      return;
    }

    try {
      const picked = await pickAvatarImage();

      if (picked.status === 'denied') {
        onError?.('Kindred needs access to your photos to set a picture.');
        return;
      }
      if (picked.status === 'cancelled') return;

      setBusy(true);
      const publicUrl = await uploadAvatar(user.id, picked.base64, picked.mimeType, subjectId);
      await onUploaded(publicUrl);
    } catch (e) {
      console.error('Avatar upload failed', e);
      onError?.('Could not upload that photo. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy}
      style={({ pressed }) => [styles.wrap, dim, pressed && !busy && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
    >
      {uri ? (
        <Image source={{ uri }} style={[dim, styles.img]} contentFit="cover" transition={200} />
      ) : (
        <View style={[dim, styles.placeholder]}>
          {initials ? (
            <Txt color={colors.onPrimaryContainer} style={{ fontSize: size * 0.36, fontFamily: 'Inter_500Medium' }}>
              {initials}
            </Txt>
          ) : (
            <Icon name="add-a-photo" size={size * 0.3} color={colors.onSurfaceVariant} />
          )}
        </View>
      )}

      {/* Doubles as the affordance: an invitation when empty, an edit hint when set. */}
      {showBadge && (
        <View style={[styles.badge, badgeDim]}>
          <Icon name={uri ? 'edit' : 'add-a-photo'} size={badgeSize * 0.55} color={colors.onPrimary} />
        </View>
      )}

      {busy && (
        <View style={[styles.busyVeil, dim]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  img: { width: '100%', height: '100%' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  busyVeil: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
