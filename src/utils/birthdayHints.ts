// Kindred keeps birthdays in their own card so it can count ages and default to
// a yearly cycle. People still reach for the free-text "important date" field to
// enter one, so screens use this to notice and point them at the right place.

const BIRTHDAY_WORDS = [
  'birthday',
  'bday',
  'b-day',
  'b day',
  'birth day',
  'dogum gunu',
  'doğum günü',
  'dogumgunu',
  'doğumgünü',
  'yas gunu',
  'yaş günü',
];

export function looksLikeBirthday(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  return BIRTHDAY_WORDS.some((word) => normalized.includes(word));
}
