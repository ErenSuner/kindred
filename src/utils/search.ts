// Matching a typed query against a name.
//
// Names are the only thing there is to search, and they are the one field the
// app cannot normalise on the way in — people write them the way they write
// them. So the comparison is what has to be forgiving: someone looking for
// "Şükrü" should find them by typing "sukru", on a keyboard that may not have
// the letters at all.

// The combining marks NFD leaves behind once a letter has been split from its
// accent.
const COMBINING_MARKS = /[̀-ͯ]/g;

// Accents off, case off, Turkish dotless i folded onto i.
//
// NFD splits a letter into its base and its accent, and the accent is then
// dropped: "ş" becomes "s", "ğ" becomes "g", "ö" becomes "o". The dotless "ı"
// has no decomposition — it is its own letter, not an "i" wearing something —
// so it is mapped by hand. Without that, "sukru" finds Şükrü but "kilic" never
// finds Kılıç.
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .trim();
}

// True when every word typed appears somewhere in the name, in any order, so
// "ada l" finds "Ada Lovelace" and so does "lovelace ada".
export function matchesQuery(name: string, query: string): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const haystack = normalizeForSearch(name);
  return words.every((word) => haystack.includes(word));
}
