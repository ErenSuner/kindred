// Case changes that respect the language being read.
//
// Turkish has two i's, and the mapping between them is not the one JavaScript
// uses by default: uppercasing "bildirimler" the ordinary way gives BILDIRIMLER
// with a dotless I, which is a different letter and reads as a typo. The locale
// overloads of toUpperCase/toLowerCase know the rule; they just have to be told
// which language to apply.

import i18n from '@/lib/i18n';

function locale(): string {
  return i18n.language === 'tr' ? 'tr-TR' : 'en-US';
}

export function upperCase(value: string): string {
  return value.toLocaleUpperCase(locale());
}

export function lowerCase(value: string): string {
  return value.toLocaleLowerCase(locale());
}

// First letter up, the rest untouched — for a name typed in whatever case the
// person felt like. Only the first word, so "eren suner" keeps its own shape
// beyond the initial rather than being title-cased into something it isn't.
export function capitalizeFirst(value: string): string {
  if (!value) return value;
  return upperCase(value.charAt(0)) + value.slice(1);
}
