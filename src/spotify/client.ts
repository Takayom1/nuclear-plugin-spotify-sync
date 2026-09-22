import { t } from '../i18n';
import { forEachConcurrent, sleep } from '../utils/async';
import type { SpotifyAuth } from './auth';
import type { Fetch } from './http';
import { parseArtist, parsePlaylist, parseRelease, parseTrack, parseUser } from './parse';
import {
  SpotifyError,
  type LikedPage,
  type LikedTrack,
  type SpotifyArtistInfo,
  type SpotifyPlaylistInfo,
  type SpotifyRelease,
  type SpotifyUser,
} from './types';

const API_URL = 'https://api.spotify.com/v1';
const LIKED_PAGE_SIZE = 50;
const LIKED_PAGE_CONCURRENCY = 4;
/** PUT/DELETE /me/library accept at most 40 URIs per call. */
const LIBRARY_BATCH = 40;
/** Development-mode apps get at most 10 albums per artist page. */
const ARTIST_ALBUMS_LIMIT = 10;
const MAX_ATTEMPTS = 6;

/* eslint-disable @typescript-eslint/no-explicit-any -- raw API JSON */

const describeApiError = (message: string, status: number) => {
  if (status === 403 && /not registered|developer dashboard/i.test(message)) {
    return t('api.notRegistered');
  }
  if (status === 403 && /premium/i.test(message)) {
    return t('api.premium');
  }
  if (status === 403 && /scope/i.test(message)) {
    return t('api.scope');
  }
  return t('api.generic', { status, message });
};

/** Thin wrapper over the Spotify Web API endpoints the plugin needs. */
export class SpotifyClient {
  constructor(
    readonly auth: SpotifyAuth,
    private readonly fetch: Fetch,
  ) {}

  /** Authenticated request with token refresh, 429 back-off and 5xx retries. */
  private async request<T>(path: string, method = 'GET'): Promise<T | null> {
    let refreshed = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const token = await this.auth.getAccessToken();
      const response = await this.fetch(`${API_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 && !refreshed) {
        refreshed = true;
        this.auth.invalidateAccessToken();
        continue;
      }
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after')) || 2;
        await sleep(Math.min(retryAfter, 30) * 1000);
        continue;
      }
      if (response.status >= 500 && attempt < 3) {
        await sleep(1000 * (attempt + 1));
        continue;
      }

      const text = await response.text();
      if (!response.ok) {
        let message = text || response.statusText;
        try {
          message = JSON.parse(text).error?.message ?? message;
        } catch {
          // Keep the raw text.
        }
        throw new SpotifyError(describeApiError(message, response.status), response.status);
      }
      return text ? (JSON.parse(text) as T) : null;
    }
    throw new SpotifyError(t('api.unavailable'));
  }

  private async get<T>(path: string): Promise<T> {
    return (await this.request<T>(path)) as T;
  }

  async getMe(): Promise<SpotifyUser> {
    return parseUser(await this.get('/me'));
  }

  // ------------------------------------------------------------ Liked Songs

  async getLikedPage(offset: number, limit = LIKED_PAGE_SIZE): Promise<LikedPage> {
    const data = await this.get<{ total: number; items: any[] }>(
      `/me/tracks?limit=${limit}&offset=${offset}`,
    );
    return {
      total: data.total,
      items: data.items
        .filter((item) => item.track?.uri)
        .map((item) => parseTrack(item.track, item.added_at)),
    };
  }

  /** All Liked Songs, newest first; pages after the first are fetched in parallel. */
  async getAllLiked(onProgress?: (loaded: number, total: number) => void) {
    const first = await this.getLikedPage(0);
    const pages: LikedTrack[][] = [first.items];
    let loaded = first.items.length;
    onProgress?.(loaded, first.total);

    const offsets: number[] = [];
    for (let offset = LIKED_PAGE_SIZE; offset < first.total; offset += LIKED_PAGE_SIZE) {
      offsets.push(offset);
    }
    await forEachConcurrent(offsets, LIKED_PAGE_CONCURRENCY, async (offset, index) => {
      const page = await this.getLikedPage(offset);
      pages[index + 1] = page.items;
      loaded += page.items.length;
      onProgress?.(loaded, first.total);
    });

    // Pages can overlap if the library changed during the sync.
    const seen = new Set<string>();
    return pages.flat().filter((track) => !seen.has(track.uri) && seen.add(track.uri));
  }

  private async libraryCall(method: 'PUT' | 'DELETE', uris: string[]) {
    for (let i = 0; i < uris.length; i += LIBRARY_BATCH) {
      const batch = uris
        .slice(i, i + LIBRARY_BATCH)
        .map(encodeURIComponent)
        .join(',');
      await this.request(`/me/library?uris=${batch}`, method);
    }
  }

  saveToLibrary(uris: string[]) {
    return this.libraryCall('PUT', uris);
  }

  removeFromLibrary(uris: string[]) {
    return this.libraryCall('DELETE', uris);
  }

  // --------------------------------------------------------------- home tab

  async getMyPlaylists(): Promise<SpotifyPlaylistInfo[]> {
    const result: SpotifyPlaylistInfo[] = [];
    for (let offset = 0; offset < 1000; offset += 50) {
      const page = await this.get<{ items: any[]; next: string | null }>(
        `/me/playlists?limit=50&offset=${offset}`,
      );
      result.push(...(page.items ?? []).filter((item) => item?.id).map(parsePlaylist));
      if (!page.next) {
        break;
      }
    }
    return result;
  }

  async getFollowedArtists(max = 200): Promise<SpotifyArtistInfo[]> {
    const result: SpotifyArtistInfo[] = [];
    let after = '';
    while (result.length < max) {
      const { artists } = await this.get<{ artists: any }>(
        `/me/following?type=artist&limit=50${after ? `&after=${after}` : ''}`,
      );
      result.push(...(artists.items ?? []).map(parseArtist));
      after = artists.cursors?.after ?? '';
      if (!after || !artists.items?.length) {
        break;
      }
    }
    return result;
  }

  async getTopArtists(limit = 20): Promise<SpotifyArtistInfo[]> {
    const page = await this.get<{ items: any[] }>(
      `/me/top/artists?limit=${limit}&time_range=short_term`,
    );
    return (page.items ?? []).map(parseArtist);
  }

  /** Latest albums and singles of an artist. */
  async getArtistReleases(artistId: string): Promise<SpotifyRelease[]> {
    const releases: SpotifyRelease[] = [];
    for (const group of ['album', 'single']) {
      const page = await this.get<{ items: any[] }>(
        `/artists/${artistId}/albums?include_groups=${group}&limit=${ARTIST_ALBUMS_LIMIT}`,
      );
      releases.push(...(page.items ?? []).map((album) => parseRelease(album, group)));
    }
    return releases;
  }

  async getAlbumTracks(albumId: string): Promise<LikedTrack[]> {
    const album = await this.get<any>(`/albums/${albumId}`);
    return (album.tracks?.items ?? []).map((track: any) =>
      parseTrack(
        { ...track, album: { name: album.name, uri: album.uri, images: album.images } },
        album.release_date ?? '',
      ),
    );
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
