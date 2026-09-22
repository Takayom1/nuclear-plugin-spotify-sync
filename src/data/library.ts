import type { NuclearPluginAPI } from '@nuclearplayer/plugin-sdk';

import { STORAGE_PREFIX } from '../constants';
import { intlLocale, t } from '../i18n';
import { buildPlaylist, toArtwork, toNuclearTrack } from '../nuclear/mappers';
import { SETTINGS } from '../settings';
import type { SpotifyClient } from '../spotify/client';
import type { LikedTrack, SpotifyUser } from '../spotify/types';
import { errorMessage } from '../utils/async';
import { Store } from '../utils/store';
import { cacheDelete, cacheGet, cacheSet } from './cache';

const LAST_USER_KEY = 'lastUser';
const PLAYLIST_ID_KEY = `${STORAGE_PREFIX}:likedPlaylistId`;

type CachedLibrary = {
  user: SpotifyUser;
  tracks: LikedTrack[];
  fetchedAt: number;
};

export type LibraryState = {
  user: SpotifyUser | null;
  tracks: LikedTrack[];
  fetchedAt: number | null;
  syncing: boolean;
  progress: { loaded: number; total: number } | null;
  error: string | null;
};

const libraryKey = (userId: string) => `library:${userId}`;

/** The user's Liked Songs: cached in IndexedDB, synced from Spotify on demand. */
export class Library extends Store<LibraryState> {
  private pendingSync: Promise<boolean> | null = null;

  constructor(
    private readonly api: NuclearPluginAPI,
    private readonly client: SpotifyClient,
  ) {
    super({
      user: null,
      tracks: [],
      fetchedAt: null,
      syncing: false,
      progress: null,
      error: null,
    });
  }

  likedUris() {
    return new Set(this.state.tracks.map((track) => track.uri));
  }

  async loadCache() {
    const userId = await cacheGet<string>(LAST_USER_KEY);
    const cached = userId ? await cacheGet<CachedLibrary>(libraryKey(userId)) : undefined;
    if (cached) {
      this.update({ user: cached.user, tracks: cached.tracks, fetchedAt: cached.fetchedAt });
    }
  }

  private async persist() {
    const { user, tracks, fetchedAt } = this.state;
    if (!user) {
      return;
    }
    await cacheSet(LAST_USER_KEY, user.id);
    await cacheSet(libraryKey(user.id), {
      user,
      tracks,
      fetchedAt: fetchedAt ?? Date.now(),
    } satisfies CachedLibrary);
  }

  async clear() {
    if (this.state.user) {
      await cacheDelete(libraryKey(this.state.user.id));
    }
    await cacheDelete(LAST_USER_KEY);
    this.update({ user: null, tracks: [], fetchedAt: null, progress: null, error: null });
  }

  /**
   * Pulls Liked Songs from Spotify. A cheap first-page check skips the full
   * download when nothing changed. Resolves to true when the list changed.
   */
  sync(options: { full?: boolean } = {}): Promise<boolean> {
    if (!this.pendingSync) {
      this.pendingSync = this.runSync(options.full ?? false).finally(() => {
        this.pendingSync = null;
      });
    }
    return this.pendingSync;
  }

  private async runSync(full: boolean): Promise<boolean> {
    if (!this.client.auth.isLoggedIn()) {
      return false;
    }
    this.update({ syncing: true, error: null });
    try {
      const user = await this.client.getMe();
      const sameUser = this.state.user?.id === user.id;
      this.update(sameUser ? { user } : { user, tracks: [], fetchedAt: null });

      if (!full && sameUser && this.state.tracks.length && (await this.isUnchanged())) {
        this.update({ fetchedAt: Date.now() });
        await this.persist();
        return false;
      }

      this.update({ progress: { loaded: 0, total: 0 } });
      const tracks = await this.client.getAllLiked((loaded, total) =>
        this.update({ progress: { loaded, total } }),
      );
      this.update({ tracks, fetchedAt: Date.now() });
      await this.persist();

      if (await this.api.Settings.get<boolean>(SETTINGS.autoSyncPlaylist)) {
        await this.saveToPlaylist().catch((error) =>
          this.api.Logger.warn(`Liked Songs playlist sync failed: ${errorMessage(error)}`),
        );
      }
      return true;
    } catch (error) {
      this.api.Logger.error(`Liked Songs sync failed: ${errorMessage(error)}`);
      this.update({ error: errorMessage(error) });
      return false;
    } finally {
      this.update({ syncing: false, progress: null });
    }
  }

  private async isUnchanged() {
    const head = await this.client.getLikedPage(0);
    const cached = this.state.tracks;
    return (
      head.total === cached.length &&
      head.items.every(
        (track, index) =>
          track.uri === cached[index]?.uri && track.addedAt === cached[index]?.addedAt,
      )
    );
  }

  /** Saves a song to Liked Songs and puts it on top, as Spotify does. */
  async like(track: LikedTrack) {
    await this.client.saveToLibrary([track.uri]);
    this.insert({ ...track, addedAt: new Date().toISOString() }, 0);
    await this.persist();
  }

  /** Saves by URI only (e.g. from a chart) and refreshes to get full metadata. */
  async likeUri(uri: string) {
    await this.client.saveToLibrary([uri]);
    void this.sync();
  }

  /** Optimistically removes a song; restores it if Spotify refuses. */
  async unlike(track: LikedTrack) {
    const index = this.state.tracks.findIndex((item) => item.uri === track.uri);
    if (index === -1) {
      return;
    }
    this.update({ tracks: this.state.tracks.filter((item) => item.uri !== track.uri) });
    try {
      await this.client.removeFromLibrary([track.uri]);
      await this.persist();
    } catch (error) {
      this.insert(track, index);
      throw error;
    }
  }

  private insert(track: LikedTrack, index: number) {
    if (this.state.tracks.some((item) => item.uri === track.uri)) {
      return;
    }
    const tracks = [...this.state.tracks];
    tracks.splice(Math.min(index, tracks.length), 0, track);
    this.update({ tracks });
  }

  /** Recreates the Liked Songs copy in Nuclear's playlists. Returns its id. */
  async saveToPlaylist(): Promise<string> {
    const name = t('liked.playlistName');
    const knownId = localStorage.getItem(PLAYLIST_ID_KEY);
    for (const entry of await this.api.Playlists.getIndex()) {
      if (entry.id === knownId || entry.name === name) {
        await this.api.Playlists.deletePlaylist(entry.id);
      }
    }
    const { tracks } = this.state;
    const cover = tracks.find((track) => track.album.images.length);
    const id = await this.api.Playlists.importPlaylist(
      buildPlaylist({
        name,
        description: t('liked.playlistDescription', {
          date: new Date().toLocaleString(intlLocale()),
        }),
        tracks: tracks.map(toNuclearTrack),
        artwork: cover ? toArtwork(cover.album.images) : undefined,
        addedAt: (index) => tracks[index].addedAt,
        origin: { provider: 'spotify', id: 'liked-songs' },
      }),
    );
    localStorage.setItem(PLAYLIST_ID_KEY, id);
    return id;
  }
}
