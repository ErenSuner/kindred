// Relationships are stored as a fixed English enum (Family, Friend, …) so the
// data stays stable across languages. This turns the stored value into the
// label the user should see. Unknown values fall through unchanged.

import i18n from '@/lib/i18n';

export function relationshipLabel(role: string): string {
  return i18n.t(`rel_${role}`, { defaultValue: role });
}
