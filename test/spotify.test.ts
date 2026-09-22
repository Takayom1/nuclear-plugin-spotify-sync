import { describe, expect, it } from 'vitest';

import { codeChallenge, looksLikeCallback, parseCallback } from '../src/spotify/auth';
import { idFromUri, parsePlaylistId, parsePlaylistLinks, parseTrack } from '../src/spotify/parse';

describe('playlist links', () => {
  it('extracts ids from URLs and URIs', () => {
    expect(parsePlaylistId('https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF?si=abc')).toBe(
      '37i9dQZEVXbMDoHDwVN2tF',
    );
    expect(parsePlaylistId('spotify:playlist:37i9dQZEVXbLRQDuF5jeBp')).toBe(
      '37i9dQZEVXbLRQDuF5jeBp',
    );
    expect(parsePlaylistId('https://open.spotify.com/album/37i9dQZEVXbLRQDuF5jeBp')).toBeNull();
  });

  it('parses a list of links without duplicates', () => {
    const text = `https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF
      junk, spotify:playlist:37i9dQZEVXbLRQDuF5jeBp
      https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF`;
    expect(parsePlaylistLinks(text)).toEqual(['37i9dQZEVXbMDoHDwVN2tF', '37i9dQZEVXbLRQDuF5jeBp']);
    expect(parsePlaylistLinks(undefined)).toEqual([]);
  });

  it('reads ids from URIs', () => {
    expect(idFromUri('spotify:artist:abc123')).toBe('abc123');
    expect(idFromUri(null)).toBeNull();
  });
});

describe('OAuth callback', () => {
  const url = 'http://127.0.0.1:8888/callback?code=AQBx_very-long-code-value-123&state=xyz';

  it('recognises redirect URLs', () => {
    expect(looksLikeCallback(url)).toBe(true);
    expect(looksLikeCallback('http://127.0.0.1:8888/callback?error=access_denied')).toBe(true);
    expect(looksLikeCallback('https://example.com')).toBe(false);
  });

  it('extracts code, state and error', () => {
    expect(parseCallback(url)).toEqual({
      code: 'AQBx_very-long-code-value-123',
      state: 'xyz',
      error: null,
    });
    expect(parseCallback('AQBx_very-long-code-value-123').code).toBe(
      'AQBx_very-long-code-value-123',
    );
    expect(parseCallback('?error=access_denied').error).toBe('access_denied');
  });

  it('computes the RFC 7636 code challenge', async () => {
    // Test vector from RFC 7636, appendix B.
    await expect(codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
});

describe('parseTrack', () => {
  it('normalises a Web API track', () => {
    const track = parseTrack(
      {
        uri: 'spotify:track:1',
        id: '1',
        name: 'Song',
        duration_ms: 1000,
        explicit: true,
        artists: [{ name: 'A', uri: 'spotify:artist:a' }],
        album: {
          name: 'Al',
          uri: 'spotify:album:x',
          images: [{ url: 'u', width: 64, height: 64 }],
        },
      },
      '2026-01-01T00:00:00Z',
    );
    expect(track).toEqual({
      uri: 'spotify:track:1',
      id: '1',
      name: 'Song',
      artists: [{ name: 'A', uri: 'spotify:artist:a' }],
      album: { name: 'Al', uri: 'spotify:album:x', images: [{ url: 'u', width: 64, height: 64 }] },
      durationMs: 1000,
      addedAt: '2026-01-01T00:00:00Z',
      explicit: true,
      isLocal: false,
    });
  });
});
