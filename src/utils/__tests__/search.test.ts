import { matchesQuery, normalizeForSearch } from '@/utils/search';

describe('normalizeForSearch', () => {
  it('strips Turkish accents down to their base letters', () => {
    expect(normalizeForSearch('Şükrü')).toBe('sukru');
    expect(normalizeForSearch('Çağla')).toBe('cagla');
    expect(normalizeForSearch('Gökhan')).toBe('gokhan');
  });

  it('folds the dotless i, which has no accent to strip', () => {
    expect(normalizeForSearch('Kılıç')).toBe('kilic');
    expect(normalizeForSearch('İnci')).toBe('inci');
  });

  it('leaves plain names alone apart from case', () => {
    expect(normalizeForSearch('  Ada Lovelace ')).toBe('ada lovelace');
  });
});

describe('matchesQuery', () => {
  it('finds a name typed without its accents', () => {
    expect(matchesQuery('Şükrü Yılmaz', 'sukru')).toBe(true);
    expect(matchesQuery('Şükrü Yılmaz', 'yilmaz')).toBe(true);
  });

  it('finds a name typed with them', () => {
    expect(matchesQuery('Şükrü Yılmaz', 'şükrü')).toBe(true);
  });

  it('matches on part of a word', () => {
    expect(matchesQuery('Ada Lovelace', 'love')).toBe(true);
  });

  it('does not care what order the words come in', () => {
    expect(matchesQuery('Ada Lovelace', 'lovelace ada')).toBe(true);
    expect(matchesQuery('Ada Lovelace', 'ada l')).toBe(true);
  });

  it('needs every word to appear', () => {
    expect(matchesQuery('Ada Lovelace', 'ada byron')).toBe(false);
  });

  it('says yes to an empty query, so an empty box hides nobody', () => {
    expect(matchesQuery('Ada Lovelace', '')).toBe(true);
    expect(matchesQuery('Ada Lovelace', '   ')).toBe(true);
  });

  it('rejects a name that simply is not there', () => {
    expect(matchesQuery('Ada Lovelace', 'grace')).toBe(false);
  });
});
