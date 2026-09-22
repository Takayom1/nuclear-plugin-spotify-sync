import { describe, expect, it } from 'vitest';

import { mixOrder, selectRecentReleases } from '../src/data/home';
import { pickImage, toNuclearTrack } from '../src/nuclear/mappers';
import type { SpotifyRelease } from '../src/spotify/types';
import { forEachConcurrent, shuffled } from '../src/utils/async';

const release = (id: string, releaseDate: string): SpotifyRelease => ({
  id,
  uri: `spotify:album:${id}`,
  name: id,
  type: 'single',
  releaseDate,
  totalTracks: 1,
  artists: [],
  images: [],
});

describe('home data', () => {
  it('orders personal mixes like Spotify does', () => {
    const names = ['Chill Mix', 'Release Radar', 'Daily Mix 2', 'Discover Weekly', 'Daily Mix 1'];
    expect([...names].sort((a, b) => mixOrder(a) - mixOrder(b))).toEqual([
      'Daily Mix 1',
      'Daily Mix 2',
      'Discover Weekly',
      'Release Radar',
      'Chill Mix',
    ]);
  });

  it('keeps recent releases, newest first, without duplicates', () => {
    const now = Date.parse('2026-09-22T00:00:00Z');
    const result = selectRecentReleases(
      [
        release('old', '2026-01-01'),
        release('a', '2026-09-10'),
        release('b', '2026-09-20'),
        release('a', '2026-09-10'),
        release('year-only', '2026'),
      ],
      30,
      now,
    );
    expect(result.map((item) => item.id)).toEqual(['b', 'a']);
  });
});

describe('mappers', () => {
  it('maps a liked track to a Nuclear track with Spotify ids', () => {
    const track = toNuclearTrack({
      uri: 'spotify:track:1',
      id: '1',
      name: 'Song',
      artists: [{ name: 'A', uri: 'spotify:artist:a' }],
      album: { name: 'Al', uri: 'spotify:album:x', images: [] },
      durationMs: 1000,
      addedAt: '',
      explicit: false,
      isLocal: false,
    });
    expect(track.source).toEqual({
      provider: 'spotify',
      id: 'spotify:track:1',
      url: 'https://open.spotify.com/track/1',
    });
    expect(track.artists[0].source).toEqual({ provider: 'spotify', id: 'spotify:artist:a' });
    expect(track.album?.source.id).toBe('spotify:album:x');
  });

  it('picks the smallest image that is large enough', () => {
    const images = [
      { url: '640', width: 640, height: 640 },
      { url: '64', width: 64, height: 64 },
      { url: '300', width: 300, height: 300 },
    ];
    expect(pickImage(images, 100)).toBe('300');
    expect(pickImage(images, 1000)).toBe('640');
    expect(pickImage([], 100)).toBeNull();
  });
});

describe('async utils', () => {
  it('limits concurrency', async () => {
    let running = 0;
    let peak = 0;
    await forEachConcurrent([1, 2, 3, 4, 5, 6], 2, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
    });
    expect(peak).toBe(2);
  });

  it('shuffles into a permutation', () => {
    const items = [1, 2, 3, 4, 5];
    expect([...shuffled(items)].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
