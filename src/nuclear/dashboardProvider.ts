// Feeds mixes, charts and new releases into Nuclear's built-in Dashboard page.
import type { AlbumRef, DashboardProvider, PlaylistRef } from '@nuclearplayer/plugin-sdk';

import { DASHBOARD_PROVIDER_ID, SPOTIFY_METADATA_PROVIDER } from '../constants';
import type { Home, HomePlaylist } from '../data/home';
import type { SpotifyRelease } from '../spotify/types';
import { toArtwork } from './mappers';

const toPlaylistRef = (playlist: HomePlaylist): PlaylistRef => ({
  id: playlist.id,
  name: playlist.name,
  artwork: playlist.image
    ? { items: [{ url: playlist.image, width: 300, height: 300, purpose: 'cover' }] }
    : undefined,
  source: {
    provider: SPOTIFY_METADATA_PROVIDER,
    id: `spotify:playlist:${playlist.id}`,
    url: playlist.url,
  },
});

const toAlbumRef = (release: SpotifyRelease): AlbumRef => ({
  title: release.name,
  artists: release.artists
    .filter((artist) => artist.uri)
    .map((artist) => ({
      name: artist.name,
      source: { provider: SPOTIFY_METADATA_PROVIDER, id: artist.uri! },
    })),
  artwork: toArtwork(release.images),
  source: { provider: SPOTIFY_METADATA_PROVIDER, id: release.uri },
});

export const createDashboardProvider = (home: Home): DashboardProvider => ({
  id: DASHBOARD_PROVIDER_ID,
  kind: 'dashboard',
  name: 'Spotify',
  // Artist/album cards open the official plugin's pages when it is installed.
  metadataProviderId: home.metadataProvider() ? SPOTIFY_METADATA_PROVIDER : undefined,
  capabilities: ['topTracks', 'editorialPlaylists', 'newReleases'],
  fetchTopTracks: async () => {
    await home.loadCharts();
    return home.state.charts.items[0]?.tracks ?? [];
  },
  fetchEditorialPlaylists: async () => {
    await Promise.all([home.loadMixes(), home.loadCharts()]);
    return [...home.state.mixes.items, ...home.state.charts.items]
      .filter((playlist) => !playlist.error)
      .map(toPlaylistRef);
  },
  fetchNewReleases: async () => {
    await home.loadReleases();
    return home.state.releases.items.map(toAlbumRef);
  },
});
