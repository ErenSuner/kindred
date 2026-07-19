// Reading the phone's address book so people don't have to be typed in twice.
//
// Deliberately narrow: name, photo and birthday, nothing else. Phone numbers
// are not read at all — Kindred has no use for one, and not holding a copy of
// someone else's number is a smaller promise to keep than holding it safely.

import * as Contacts from 'expo-contacts';
import { File } from 'expo-file-system';
import { SKIPPED_YEAR } from '@/utils/dates';

export type ImportableContact = {
  id: string;
  name: string;
  // Local URI from the address book, not something that can be stored.
  imageUri?: string;
  // 'YYYY-MM-DD'. The year is SKIPPED_YEAR when the contact recorded a day and
  // month but no year, which is common.
  birthday?: string;
  initials: string;
};

export type ContactsResult =
  | { status: 'ok'; contacts: ImportableContact[] }
  | { status: 'denied' };

function initialsFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

// The address book gives back a { day, month, year } object with month counted
// from zero, and year frequently missing.
function birthdayFrom(contact: Contacts.Contact): string | undefined {
  const raw =
    contact.birthday ??
    contact.dates?.find((d) => d.label?.toLowerCase() === 'birthday');
  if (!raw || raw.day === undefined || raw.month === undefined) return undefined;

  const year = raw.year && raw.year > 1000 ? raw.year : SKIPPED_YEAR;
  const month = String(raw.month + 1).padStart(2, '0');
  const day = String(raw.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function loadContacts(): Promise<ContactsResult> {
  const permission = await Contacts.requestPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.Birthday, Contacts.Fields.Dates, Contacts.Fields.Image],
  });

  const contacts = data
    .map((contact): ImportableContact | null => {
      const name = (contact.name ?? '').trim();
      // A contact with no name is a phone number in a suit. Nothing to show.
      if (!name) return null;

      return {
        id: contact.id ?? name,
        name,
        imageUri: contact.image?.uri,
        birthday: birthdayFrom(contact),
        initials: initialsFor(name),
      };
    })
    .filter((c): c is ImportableContact => c !== null);

  // Contacts with a birthday first — those are the ones Kindred can do
  // something with straight away — then alphabetically.
  contacts.sort((a, b) => {
    if (!!a.birthday !== !!b.birthday) return a.birthday ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { status: 'ok', contacts };
}

// The picker hands back a local file path. Uploading needs the bytes, and
// fetch().blob() is unreliable across React Native platforms — the same reason
// the image picker asks for base64 directly.
export async function readContactPhoto(uri: string): Promise<string | null> {
  try {
    return await new File(uri).base64();
  } catch (e) {
    console.warn('Could not read contact photo', e);
    return null;
  }
}
