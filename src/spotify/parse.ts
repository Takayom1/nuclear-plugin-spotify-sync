// Normalises Spotify Web API payloads into the plugin's own types.
import { t } from '../i18n';
import type {
  ArtistLink,
  LikedTrack,
  SpotifyArtistInfo,
  SpotifyImage,
  SpotifyPlaylistInfo,
  SpotifyRelease,
  SpotifyUser,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- raw API JSON */

const images = (list: any[] | undefined): SpotifyImage[] =>
  (list ?? []).map((image) => ({
    url: image.url,
    width: image.width ?? null,
    height: image.height ?? null,
  }));

const artists = (list: any[] | undefined): ArtistLink[] =>
  (list ?? []).map((artist) => ({ name: artist.name, uri: artist.uri ?? null }));

export const parseTrack = (track: any, addedAt: string): LikedTrack => ({
  uri: track.uri,
  id: track.id ?? null,
  name: track.name || t('common.untitled'),
  artists: artists(track.artists),
  album: {
    name: track.album?.name ?? '',
    uri: track.album?.uri ?? null,
    images: images(track.album?.images),
  },
  durationMs: track.duration_ms ?? 0,
  addedAt,
  explicit: !!track.explicit,
  isLocal: !!track.is_local,
});

export const parseUser = (user: any): SpotifyUser => ({
  id: user.id,
  displayName: user.display_name || user.id,
  image: user.images?.[user.images.length - 1]?.url ?? null,
});

export const parsePlaylist = (playlist: any): SpotifyPlaylistInfo => ({
  id: playlist.id,
  uri: playlist.uri,
  name: playlist.name ?? '',
  description: playlist.description ?? '',
  image: playlist.images?.[0]?.url ?? null,
  ownerId: playlist.owner?.id ?? '',
});

export const parseArtist = (artist: any): SpotifyArtistInfo => ({
  id: artist.id,
  uri: artist.uri,
  name: artist.name,
});

export const parseRelease = (album: any, fallbackType: string): SpotifyRelease => ({
  id: album.id,
  uri: album.uri,
  name: album.name,
  type: album.album_type ?? fallbackType,
  releaseDate: album.release_date ?? '',
  totalTracks: album.total_tracks ?? 0,
  artists: artists(album.artists),
  images: images(album.images),
});

/* eslint-enable @typescript-eslint/no-explicit-any */

/** Extracts a playlist id from an open.spotify.com URL or spotify: URI. */
export const parsePlaylistId = (text: string) =>
  text.match(/playlist[/:]([A-Za-z0-9]{22})/)?.[1] ?? null;

/**
 * Unique playlist ids from free text. Any separator works, even none at all:
 * Nuclear renders multi-line settings as a single-line input, so pasted links
 * can end up glued together.
 */
export const parsePlaylistLinks = (value: string | undefined) => {
  const ids: string[] = [];
  for (const [, id] of (value ?? '').matchAll(/playlist[/:]([A-Za-z0-9]{22})/g)) {
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
};

/** Settings value for a list of playlist ids. */
export const formatPlaylistLinks = (ids: string[]) => ids.map(playlistUrl).join(' ');

export const playlistUrl = (id: string) => `https://open.spotify.com/playlist/${id}`;

/** "spotify:artist:abc" → "abc" */
export const idFromUri = (uri: string | null | undefined) => uri?.split(':')[2] ?? null;
