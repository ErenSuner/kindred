import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const BUCKET = 'avatars';

// React Native's fetch(uri).blob() is unreliable across platforms, so the image
// comes back from the picker as base64 and is decoded by hand. Doing it this way
// also avoids pulling in another dependency just for the conversion.
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64_ALPHABET.indexOf(clean[i]);
    const c1 = B64_ALPHABET.indexOf(clean[i + 1]);
    const c2 = B64_ALPHABET.indexOf(clean[i + 2]);
    const c3 = B64_ALPHABET.indexOf(clean[i + 3]);

    const chunk = (c0 << 18) | (c1 << 12) | ((c2 < 0 ? 0 : c2) << 6) | (c3 < 0 ? 0 : c3);

    if (byteIndex < byteLength) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < byteLength && c2 >= 0) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < byteLength && c3 >= 0) bytes[byteIndex++] = chunk & 0xff;
  }

  return bytes;
}

export type PickResult =
  | { status: 'picked'; base64: string; mimeType: string }
  | { status: 'cancelled' }
  | { status: 'denied' };

// Opens the photo library, cropped square because every avatar is rendered in a
// circle.
export async function pickAvatarImage(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });

  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };

  const asset = result.assets[0];
  if (!asset.base64) return { status: 'cancelled' };

  return {
    status: 'picked',
    base64: asset.base64,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

// Uploads under the signed-in user's folder, which is what the storage policies
// key on. Returns a public URL ready to store on the row.
export async function uploadAvatar(
  userId: string,
  base64: string,
  mimeType: string,
  // Distinguishes one subject's avatar from another's within the same folder.
  subjectId: string,
): Promise<string> {
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  // The timestamp busts any cached copy of a previous avatar for this subject.
  const path = `${userId}/${subjectId}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToBytes(base64), { contentType: mimeType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Best-effort cleanup of the file a public URL points at. A failure here is not
// worth surfacing — the row has already moved on, this just saves space.
export async function removeAvatarByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;

  const path = url.slice(index + marker.length).split('?')[0];
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('Could not remove old avatar', error);
}
