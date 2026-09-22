// Data behind the home tab: mixes, charts and new releases.
//
// Spotify-owned playlists (charts, Daily Mix, Discover Weekly…) are hidden
// from Web API apps in development mode, so their contents come from the
// official Nuclear Spotify plugin's playlist provider. Everything personal
// (saved mixes, followed artists, releases) uses the user's own Web API login.
import type {
  MetadataProvider,
  NuclearPluginAPI,
  PlaylistProvider,
  Track,
} from '@nuclearplayer/plugin-sdk';

import {
  DEFAULT_CHART_LINKS,
  SPOTIFY_METADATA_PROVIDER,
  SPOTIFY_PLAYLISTS_PROVIDER,
} from '../constants';
import { t } from '../i18n';
import { albumToTracks, toNuclearTrack } from '../nuclear/mappers';
import { SETTINGS } from '../settings';
import { HOME_SCOPES } from '../spotify/auth';
import type { SpotifyClient } from '../spotify/client';
import {
  formatPlaylistLinks,
  idFromUri,
  parsePlaylistId,
  parsePlaylistLinks,
  playlistUrl,
} from '../spotify/parse';
import { SpotifyError, type SpotifyArtistInfo, type SpotifyRelease } from '../spotify/types';
import { errorMessage, forEachConcurrent } from '../utils/async';
import { parseReleaseDate } from '../utils/format';
import { Store } from '../utils/store';
import { cacheGet, cacheSet } from './cache';
import type { Library } from './library';

const PLAYLIST_TTL = 3 * 60 * 60 * 1000;
const RELEASES_TTL = 6 * 60 * 60 * 1000;
const MAX_RELEASE_ARTISTS = 80;
const MOST_LIKED_ARTISTS = 30;
const MAX_RELEASES = 80;

export type HomePlaylist = {
  id: string;
  url: string;
  name: string;
  description: string;
  image: string | null;
  kind: 'mix' | 'chart';
  tracks: Track[];
  error?: string;
};

export type Section<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
};

export type HomeState = {
  mixes: Section<HomePlaylist>;
  charts: Section<HomePlaylist>;
  releases: Section<SpotifyRelease> & { progress: { done: number; total: number } | null };
  providerMissing: boolean;
  needsRelogin: boolean;
};

type CachedSection<T> = { items: T[]; fetchedAt: number; key: string };

const emptySection = <T>(): Section<T> => ({
  items: [],
  loading: false,
  error: null,
  fetchedAt: null,
});

/** Daily Mix 1–6 first, then the other personal mixes, then everything else. */
export const mixOrder = (name: string) => {
  const daily = name.match(/daily mix\s*(\d+)/i);
  if (daily) return Number(daily[1]);
  if (/discover weekly/i.test(name)) return 20;
  if (/release radar/i.test(name)) return 21;
  if (/daylist/i.test(name)) return 22;
  if (/on repeat/i.test(name)) return 23;
  return 50;
};

/** Releases newer than `days`, newest first, without duplicates. */
export const selectRecentReleases = (
  releases: SpotifyRelease[],
  days: number,
  now = Date.now(),
  limit = MAX_RELEASES,
) => {
  const since = now - days * 86400000;
  const unique = new Map<string, SpotifyRelease>();
  for (const release of releases) {
    if (parseReleaseDate(release.releaseDate) >= since && !unique.has(release.id)) {
      unique.set(release.id, release);
    }
  }
  return [...unique.values()]
    .sort((a, b) => parseReleaseDate(b.releaseDate) - parseReleaseDate(a.releaseDate))
    .slice(0, limit);
};

export class Home extends Store<HomeState> {
  private readonly pending = new Map<string, Promise<void>>();

  constructor(
    private readonly api: NuclearPluginAPI,
    private readonly client: SpotifyClient,
    private readonly library: Library,
  ) {
    super({
      mixes: emptySection(),
      charts: emptySection(),
      releases: { ...emptySection(), progress: null },
      providerMissing: false,
      needsRelogin: false,
    });
  }

  private get auth() {
    return this.client.auth;
  }

  private userKey() {
    return this.library.state.user?.id ?? 'anonymous';
  }

  private playlistProvider() {
    try {
      return this.api.Providers.get<PlaylistProvider>(SPOTIFY_PLAYLISTS_PROVIDER, 'playlists');
    } catch {
      return undefined;
    }
  }

  metadataProvider() {
    try {
      return this.api.Providers.get<MetadataProvider>(SPOTIFY_METADATA_PROVIDER, 'metadata');
    } catch {
      return undefined;
    }
  }

  /** Coalesces concurrent loads of the same section. */
  private once(key: string, run: () => Promise<void>) {
    let promise = this.pending.get(key);
    if (!promise) {
      promise = run().finally(() => this.pending.delete(key));
      this.pending.set(key, promise);
    }
    return promise;
  }

  /** Shows cached sections instantly, then refreshes the stale ones. */
  async load(force = false) {
    await Promise.all([
      this.checkScopes(),
      this.loadMixes(force),
      this.loadCharts(force),
      this.loadReleases(force),
    ]);
  }

  /** Logins made before the home tab existed lack its scopes; cached data would hide that. */
  private async checkScopes() {
    if (!this.auth.isLoggedIn()) {
      this.update({ needsRelogin: false });
      return;
    }
    try {
      await this.auth.getAccessToken();
      this.update({ needsRelogin: !this.auth.hasScopes(HOME_SCOPES) });
    } catch {
      // Token problems surface in the sections themselves.
    }
  }

  /** Runs a call that needs the newer scopes; a 403 means the user must log in again. */
  private async withHomeScopes<T>(run: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof SpotifyError && error.status === 403) {
        this.update({ needsRelogin: true });
        return fallback;
      }
      throw error;
    }
  }

  // --------------------------------------------------------------- playlists

  async fetchPlaylist(id: string, kind: HomePlaylist['kind']): Promise<HomePlaylist> {
    const url = playlistUrl(id);
    const provider = this.playlistProvider();
    if (!provider) {
      throw new SpotifyError(t('home.providerMissing'));
    }
    const playlist = await provider.fetchPlaylistByUrl(url);
    const image =
      [...(playlist.artwork?.items ?? [])]
        .filter((item) => item.url)
        .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
    return {
      id,
      url,
      name: playlist.name,
      description: (playlist.description ?? '').replace(/<[^>]+>/g, ''),
      image,
      kind,
      tracks: playlist.items.map((item) => item.track),
    };
  }

  private async fetchPlaylists(ids: string[], kind: HomePlaylist['kind']) {
    const results = new Map<string, HomePlaylist>();
    await forEachConcurrent(ids, 3, async (id) => {
      try {
        results.set(id, await this.fetchPlaylist(id, kind));
      } catch (error) {
        results.set(id, {
          id,
          url: playlistUrl(id),
          name: t('home.loadFailed'),
          description: errorMessage(error),
          image: null,
          kind,
          tracks: [],
          error: errorMessage(error),
        });
      }
    });
    return ids.map((id) => results.get(id)!);
  }

  private async loadPlaylistSection(
    name: 'mixes' | 'charts',
    cacheKey: string,
    force: boolean,
    fetch: () => Promise<HomePlaylist[]>,
  ) {
    if (!this.state[name].items.length) {
      const cached = await cacheGet<CachedSection<HomePlaylist>>(`home:${name}`);
      if (cached?.key === cacheKey) {
        this.update({
          [name]: { ...this.state[name], items: cached.items, fetchedAt: cached.fetchedAt },
        });
      }
    }
    const current = this.state[name];
    if (!force && current.fetchedAt && Date.now() - current.fetchedAt < PLAYLIST_TTL) {
      return;
    }
    this.update({ [name]: { ...current, loading: true, error: null } });
    try {
      const items = await fetch();
      // Partial failures (e.g. the Spotify plugin still loading) must not be cached for hours.
      const failed = items.some((item) => item.error);
      const now = Date.now();
      this.update({
        [name]: { items, loading: false, error: null, fetchedAt: failed ? null : now },
      });
      if (!failed) {
        await cacheSet(`home:${name}`, {
          items,
          fetchedAt: now,
          key: cacheKey,
        } satisfies CachedSection<HomePlaylist>);
      }
    } catch (error) {
      this.update({
        [name]: { ...this.state[name], loading: false, error: errorMessage(error) },
      });
    }
  }

  /** Unset (not cleared) settings fall back to the default charts. */
  private async chartLinks() {
    return (await this.api.Settings.get<string>(SETTINGS.chartLinks)) ?? DEFAULT_CHART_LINKS;
  }

  loadCharts(force = false) {
    return this.once('charts', async () => {
      const ids = parsePlaylistLinks(await this.chartLinks());
      this.update({ providerMissing: !this.playlistProvider() });
      await this.loadPlaylistSection('charts', ids.join(','), force, () =>
        this.fetchPlaylists(ids, 'chart'),
      );
    });
  }

  loadMixes(force = false) {
    return this.once('mixes', async () => {
      const manual = parsePlaylistLinks(await this.api.Settings.get<string>(SETTINGS.mixLinks));
      const charts = new Set(parsePlaylistLinks(await this.chartLinks()));
      this.update({ providerMissing: !this.playlistProvider() });
      const cacheKey = `${this.userKey()}:${manual.join(',')}`;

      await this.loadPlaylistSection('mixes', cacheKey, force, async () => {
        const ids = [...manual];
        if (this.auth.isLoggedIn() && this.auth.hasScopes(['playlist-read-private'])) {
          // Spotify-owned playlists saved to the library are the user's mixes.
          const saved = await this.withHomeScopes(() => this.client.getMyPlaylists(), []);
          for (const playlist of saved) {
            if (
              playlist.ownerId === 'spotify' &&
              !charts.has(playlist.id) &&
              !ids.includes(playlist.id)
            ) {
              ids.push(playlist.id);
            }
          }
        }
        const mixes = await this.fetchPlaylists(ids, 'mix');
        return mixes.sort(
          (a, b) => mixOrder(a.name) - mixOrder(b.name) || a.name.localeCompare(b.name),
        );
      });
    });
  }

  async addMixLink(text: string) {
    const id = parsePlaylistId(text);
    if (!id) {
      throw new SpotifyError(t('home.invalidLink'));
    }
    const current = parsePlaylistLinks(await this.api.Settings.get<string>(SETTINGS.mixLinks));
    if (!current.includes(id)) {
      await this.api.Settings.set(SETTINGS.mixLinks, formatPlaylistLinks([...current, id]));
    }
    await this.loadMixes(true);
  }

  async removeMixLink(id: string) {
    const current = parsePlaylistLinks(await this.api.Settings.get<string>(SETTINGS.mixLinks));
    await this.api.Settings.set(
      SETTINGS.mixLinks,
      formatPlaylistLinks(current.filter((item) => item !== id)),
    );
    this.update({
      mixes: { ...this.state.mixes, items: this.state.mixes.items.filter((mix) => mix.id !== id) },
    });
    await this.loadMixes(true);
  }

  // ---------------------------------------------------------------- releases

  /** Artists whose releases are shown: followed, top and most-liked ones. */
  private async releaseArtists(): Promise<SpotifyArtistInfo[]> {
    const artists = new Map<string, SpotifyArtistInfo>();
    const add = (artist: SpotifyArtistInfo) => {
      if (artist.id && !artists.has(artist.id)) {
        artists.set(artist.id, artist);
      }
    };
    await this.auth.getAccessToken();
    if (this.auth.hasScopes(['user-follow-read'])) {
      (await this.withHomeScopes(() => this.client.getFollowedArtists(), [])).forEach(add);
    }
    if (this.auth.hasScopes(['user-top-read'])) {
      (await this.withHomeScopes(() => this.client.getTopArtists(), [])).forEach(add);
    }

    const counts = new Map<string, { artist: SpotifyArtistInfo; count: number }>();
    for (const track of this.library.state.tracks) {
      const main = track.artists[0];
      const id = idFromUri(main?.uri);
      if (!main || !id) {
        continue;
      }
      const entry = counts.get(id) ?? { artist: { id, uri: main.uri!, name: main.name }, count: 0 };
      entry.count++;
      counts.set(id, entry);
    }
    [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, MOST_LIKED_ARTISTS)
      .forEach(({ artist }) => add(artist));

    return [...artists.values()].slice(0, MAX_RELEASE_ARTISTS);
  }

  loadReleases(force = false) {
    return this.once('releases', async () => {
      if (!this.auth.isLoggedIn()) {
        return;
      }
      const days = (await this.api.Settings.get<number>(SETTINGS.releaseDays)) ?? 30;
      const cacheKey = `${this.userKey()}:${days}`;
      if (!this.state.releases.items.length) {
        const cached = await cacheGet<CachedSection<SpotifyRelease>>('home:releases');
        if (cached?.key === cacheKey) {
          this.update({
            releases: { ...this.state.releases, items: cached.items, fetchedAt: cached.fetchedAt },
          });
        }
      }
      const current = this.state.releases;
      if (!force && current.fetchedAt && Date.now() - current.fetchedAt < RELEASES_TTL) {
        return;
      }
      this.update({ releases: { ...current, loading: true, error: null, progress: null } });
      try {
        const artists = await this.releaseArtists();
        const found: SpotifyRelease[] = [];
        let done = 0;
        await forEachConcurrent(artists, 4, async (artist) => {
          try {
            found.push(...(await this.client.getArtistReleases(artist.id)));
          } catch (error) {
            this.api.Logger.debug(`Releases of ${artist.name} failed: ${errorMessage(error)}`);
          }
          done++;
          this.update({
            releases: { ...this.state.releases, progress: { done, total: artists.length } },
          });
        });
        const items = selectRecentReleases(found, days);
        const fetchedAt = Date.now();
        this.update({
          releases: { items, loading: false, error: null, fetchedAt, progress: null },
        });
        await cacheSet('home:releases', {
          items,
          fetchedAt,
          key: cacheKey,
        } satisfies CachedSection<SpotifyRelease>);
      } catch (error) {
        this.update({
          releases: {
            ...this.state.releases,
            loading: false,
            error: errorMessage(error),
            progress: null,
          },
        });
      }
    });
  }

  /** Tracks of a release: Web API first, the official plugin as a fallback. */
  async releaseTracks(release: SpotifyRelease): Promise<Track[]> {
    try {
      return (await this.client.getAlbumTracks(release.id)).map(toNuclearTrack);
    } catch (error) {
      const metadata = this.metadataProvider();
      if (!metadata?.fetchAlbumDetails) {
        throw error;
      }
      return albumToTracks(await metadata.fetchAlbumDetails(release.uri));
    }
  }
}
