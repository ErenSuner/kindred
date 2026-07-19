import type { Person, SpecialDay } from '@/data/mock';
import { NO_UPCOMING_DAYS } from '@/utils/upcoming';

// Matching ignores case and accents, so "dogum" finds "Doğum", "cigdem" finds
// "Çiğdem" and "rene" finds "René". Turkish dotted/dotless I is folded to plain
// "i" in both directions, which is what someone typing on a non-Turkish
// keyboard expects.
const FOLD: Record<string, string> = {
  ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g',
  ç: 'c', Ç: 'c', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u',
};

export function normalize(input: string): string {
  return input
    .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (ch) => FOLD[ch])
    .toLowerCase()
    // Decompose, then drop the combining marks — this is what turns é into e,
    // ñ into n and so on for anything the table above doesn't cover.
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

export type SearchHit =
  | { kind: 'person'; id: string; person: Person; score: number; matchedOn: string }
  | { kind: 'day'; id: string; person: Person; day: SpecialDay; score: number; matchedOn: string };

// Higher is better. A name that starts with the query beats one that merely
// contains it, and the person themselves outranks their individual days.
const SCORE = {
  personNamePrefix: 100,
  personNameContains: 80,
  personRole: 50,
  dayTitlePrefix: 70,
  dayTitleContains: 60,
  dayDate: 40,
  noteBody: 30,
};

function matchStrength(haystack: string | undefined, needle: string, prefixScore: number, containsScore: number): number {
  if (!haystack) return 0;
  const value = normalize(haystack);
  if (value.startsWith(needle)) return prefixScore;
  // The start of any word counts as a prefix too — "gun" should hit "Doğum Günü".
  if (value.split(/\s+/).some((word) => word.startsWith(needle))) return prefixScore - 5;
  if (value.includes(needle)) return containsScore;
  return 0;
}

export function searchPeople(people: Person[], rawQuery: string): SearchHit[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const hits: SearchHit[] = [];

  for (const person of people) {
    const nameScore = matchStrength(person.name, query, SCORE.personNamePrefix, SCORE.personNameContains);
    const roleScore = matchStrength(person.role, query, SCORE.personRole, SCORE.personRole - 10);

    if (nameScore || roleScore) {
      hits.push({
        kind: 'person',
        id: person.id,
        person,
        score: Math.max(nameScore, roleScore),
        matchedOn: nameScore >= roleScore ? 'name' : 'role',
      });
    }

    for (const day of person.specialDays ?? []) {
      const titleScore = matchStrength(day.title, query, SCORE.dayTitlePrefix, SCORE.dayTitleContains);
      const dateScore = matchStrength(day.date, query, SCORE.dayDate, SCORE.dayDate - 5);
      const noteHit = (day.notes ?? []).find((n) => normalize(n.body).includes(query));
      const noteScore = noteHit ? SCORE.noteBody : 0;

      const best = Math.max(titleScore, dateScore, noteScore);
      if (!best) continue;

      hits.push({
        kind: 'day',
        id: day.id,
        person,
        day,
        score: best,
        matchedOn: best === titleScore ? 'title' : best === dateScore ? 'date' : 'note',
      });
    }
  }

  // Same score: whatever happens sooner is more useful.
  return hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDays = a.kind === 'day' ? a.day.daysAway ?? NO_UPCOMING_DAYS : a.person.daysAway ?? NO_UPCOMING_DAYS;
    const bDays = b.kind === 'day' ? b.day.daysAway ?? NO_UPCOMING_DAYS : b.person.daysAway ?? NO_UPCOMING_DAYS;
    return aDays - bDays;
  });
}
