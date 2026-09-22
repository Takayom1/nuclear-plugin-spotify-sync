import { afterEach, describe, expect, it } from 'vitest';

import { plural, resolveLocale, setLocale, t } from '../src/i18n';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';

const placeholders = (value: unknown) =>
  JSON.stringify(value)
    .match(/\{\w+\}/g)
    ?.sort() ?? [];

describe('i18n', () => {
  afterEach(() => setLocale('en'));

  it('maps Nuclear language codes to supported locales', () => {
    expect(resolveLocale('ru_RU')).toBe('ru');
    expect(resolveLocale('en_US')).toBe('en');
    expect(resolveLocale('de_DE')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('interpolates parameters', () => {
    expect(t('menu.artist', { name: 'Björk' })).toBe('Artist: Björk');
    setLocale('ru');
    expect(t('menu.artist', { name: 'Björk' })).toBe('Исполнитель: Björk');
  });

  it('picks plural forms per locale', () => {
    expect(plural('common.tracks', 1)).toBe('1 song');
    expect(plural('common.tracks', 5)).toBe('5 songs');
    setLocale('ru');
    expect(plural('common.tracks', 1)).toBe('1 трек');
    expect(plural('common.tracks', 3)).toBe('3 трека');
    expect(plural('common.tracks', 11)).toBe('11 треков');
    expect(plural('common.tracks', 21)).toBe('21 трек');
  });

  it('translates every key with the same placeholders', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(ru[key], key).toBeTruthy();
      expect(typeof ru[key], key).toBe(typeof en[key]);
      expect(placeholders(ru[key]), key).toEqual(
        // Plural forms may use {count} in some forms only.
        typeof en[key] === 'string' ? placeholders(en[key]) : placeholders(ru[key]),
      );
    }
  });
});
