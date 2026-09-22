import { intlLocale, plural, t } from '../i18n';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ESCAPES[char]);

/** Combining diacritical marks left after NFD normalisation. */
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

export const formatTrackCount = (count: number) => plural('common.tracks', count);

/** 3:07 */
export const formatDuration = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** 5 hr 12 min */
export const formatTotalDuration = (ms: number) => {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? t('common.hoursMinutes', { hours, minutes })
    : t('common.minutes', { minutes });
};

const relative = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
  new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' }).format(value, unit);

/** "3 days ago" for recent dates, a short absolute date otherwise. */
export const formatAddedAt = (iso: string, now = Date.now()) => {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) {
    return '';
  }
  const hours = Math.floor((now - time) / 3600000);
  const days = Math.floor(hours / 24);
  if (days < 1) {
    return hours < 1 ? t('common.justNow') : relative(-hours, 'hour');
  }
  if (days < 7) {
    return relative(-days, 'day');
  }
  if (days < 29) {
    return relative(-Math.floor(days / 7), 'week');
  }
  return new Date(time).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatUpdatedAgo = (timestamp: number | null, now = Date.now()) => {
  if (!timestamp) {
    return t('common.neverUpdated');
  }
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) {
    return t('common.updated', { when: t('common.justNow') });
  }
  if (minutes < 60) {
    return t('common.updated', { when: relative(-minutes, 'minute') });
  }
  return t('common.updated', {
    when: new Date(timestamp).toLocaleString(intlLocale(), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
  });
};

/** Release dates come as "2026", "2026-09" or "2026-09-18". */
export const parseReleaseDate = (date: string) => {
  const [year, month = '01', day = '01'] = date.split('-');
  return Date.parse(`${year}-${month}-${day}T00:00:00Z`) || 0;
};

export const formatReleaseDate = (date: string) => {
  const [year, month, day] = date.split('-');
  if (!month) {
    return year;
  }
  return new Date(parseReleaseDate(date)).toLocaleDateString(intlLocale(), {
    day: day ? 'numeric' : undefined,
    month: 'short',
    timeZone: 'UTC',
  });
};

/** Case-, accent- and ё-insensitive form for search. */
export const normalizeForSearch = (value: string) =>
  value.toLocaleLowerCase().normalize('NFD').replace(DIACRITICS, '').replace(/ё/g, 'е');
