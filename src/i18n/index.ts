import { en, type MessageKey, type PluralForms } from './en';
import { ru } from './ru';

export type { MessageKey } from './en';

/** Every locale must translate every English key, with the same value kind. */
export type Messages = {
  [K in MessageKey]: (typeof en)[K] extends PluralForms ? PluralForms : string;
};

export type Locale = 'en' | 'ru';
type Params = Record<string, string | number>;

const catalogs: Record<Locale, Messages> = { en: en as Messages, ru };

let locale: Locale = 'en';

/** Nuclear stores its UI language as e.g. "en_US" / "ru_RU". */
export const resolveLocale = (value: string | undefined | null): Locale =>
  value?.toLowerCase().startsWith('ru') ? 'ru' : 'en';

export const setLocale = (value: Locale) => {
  locale = value;
};

export const getLocale = () => locale;

/** BCP 47 tag for Intl formatters. */
export const intlLocale = () => (locale === 'ru' ? 'ru-RU' : 'en-US');

const interpolate = (template: string, params?: Params) =>
  params
    ? template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      )
    : template;

export const t = (key: MessageKey, params?: Params): string => {
  const value = catalogs[locale][key] ?? en[key];
  if (typeof value !== 'string') {
    return plural(key, Number(params?.count ?? 0), params);
  }
  return interpolate(value, params);
};

export const plural = (key: MessageKey, count: number, params?: Params): string => {
  const value = (catalogs[locale][key] ?? en[key]) as PluralForms | string;
  if (typeof value === 'string') {
    return interpolate(value, { count, ...params });
  }
  const category = new Intl.PluralRules(intlLocale()).select(count) as keyof PluralForms;
  const template = value[category] ?? value.other;
  return interpolate(template, { ...params, count: count.toLocaleString(intlLocale()) });
};
