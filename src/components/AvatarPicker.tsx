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
};

// Tap-to-replace avatar. Uploads immediately rather than deferring to a form
// save, so the picture is on screen (and in storage) before anything else is
// filled in — and so a failed upload can't silently lose a photo the user
// thought was attached.
export function AvatarPicker({ uri, initials, size = 96, subjectId, onUploaded, onError }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const dim = { width: size, height: size, borderRadius: size / 2 };

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
            <Txt variant="headlineLgMobile" color={colors.onPrimaryContainer}>{initials}</Txt>
          ) : (
            <Icon name="add-a-photo" size={size * 0.3} color={colors.onSurfaceVariant} />
          )}
        </View>
      )}

      {/* Camera badge doubles as the affordance when a picture is already set. */}
      <View style={styles.badge}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Icon name={uri ? 'edit' : 'add-a-photo'} size={16} color={colors.onPrimary} />
        )}
      </View>

      {busy && <View style={[styles.busyVeil, dim]} />}
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  busyVeil: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: radius.full,
  },
});
