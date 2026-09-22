import { describe, expect, it } from 'vitest';

import {
  escapeHtml,
  formatAddedAt,
  formatDuration,
  formatTotalDuration,
  formatUpdatedAgo,
  normalizeForSearch,
  parseReleaseDate,
} from '../src/utils/format';

describe('format', () => {
  it('formats track durations', () => {
    expect(formatDuration(187_000)).toBe('3:07');
    expect(formatDuration(59_600)).toBe('1:00');
  });

  it('formats total durations', () => {
    expect(formatTotalDuration(42 * 60_000)).toBe('42 min');
    expect(formatTotalDuration(125 * 60_000)).toBe('2 hr 5 min');
  });

  it('formats recent and old dates', () => {
    const now = Date.parse('2026-09-22T12:00:00Z');
    expect(formatAddedAt('2026-09-22T11:30:00Z', now)).toBe('just now');
    expect(formatAddedAt('2026-09-20T12:00:00Z', now)).toBe('2 days ago');
    expect(formatAddedAt('2025-01-05T12:00:00Z', now)).toMatch(/2025/);
    expect(formatAddedAt('not a date', now)).toBe('');
  });

  it('describes sync time', () => {
    const now = Date.parse('2026-09-22T12:00:00Z');
    expect(formatUpdatedAgo(null, now)).toBe('not synced yet');
    expect(formatUpdatedAgo(now - 10_000, now)).toBe('updated just now');
    expect(formatUpdatedAgo(now - 5 * 60_000, now)).toBe('updated 5 minutes ago');
  });

  it('parses partial release dates', () => {
    expect(parseReleaseDate('2026-09-18')).toBe(Date.parse('2026-09-18T00:00:00Z'));
    expect(parseReleaseDate('2026-09')).toBe(Date.parse('2026-09-01T00:00:00Z'));
    expect(parseReleaseDate('2026')).toBe(Date.parse('2026-01-01T00:00:00Z'));
    expect(parseReleaseDate('')).toBe(0);
  });

  it('escapes HTML', () => {
    expect(escapeHtml(`<b title="x">'&'</b>`)).toBe(
      '&lt;b title=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;',
    );
  });

  it('normalises text for search', () => {
    expect(normalizeForSearch('Björk ЁЛКА')).toBe('bjork елка');
  });
});
