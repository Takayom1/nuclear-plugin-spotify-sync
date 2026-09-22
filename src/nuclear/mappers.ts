import type { Album, ArtworkSet, Playlist, Track } from '@nuclearplayer/plugin-sdk';

import { SPOTIFY_METADATA_PROVIDER } from '../constants';
import type { LikedTrack, SpotifyImage } from '../spotify/types';

export const toArtwork = (images: SpotifyImage[]): ArtworkSet | undefined =>
  images.length
    ? {
        items: images.map((image) => ({
          url: image.url,
          width: image.width ?? undefined,
          height: image.height ?? undefined,
          purpose: 'cover' as const,
        })),
      }
    : undefined;

/** Smallest image at least `size` px wide (or the largest available). */
export const pickImage = (images: SpotifyImage[], size: number) => {
  if (!images.length) {
    return null;
  }
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((image) => (image.width ?? 0) >= size) ?? sorted[sorted.length - 1]).url;
};

/** Same provider ids as the official Spotify plugin so its pages open from these tracks. */
export const toNuclearTrack = (track: LikedTrack): Track => {
  const artwork = toArtwork(track.album.images);
  return {
    title: track.name,
    artists: track.artists.map((artist) => ({
      name: artist.name,
      roles: [],
      source: artist.uri ? { provider: SPOTIFY_METADATA_PROVIDER, id: artist.uri } : undefined,
    })),
    album: track.album.name
      ? {
          title: track.album.name,
          artwork,
          source: {
            provider: SPOTIFY_METADATA_PROVIDER,
            id: track.album.uri ?? `local:${track.album.name}`,
          },
        }
      : undefined,
    durationMs: track.durationMs,
    artwork,
    source: {
      provider: SPOTIFY_METADATA_PROVIDER,
      id: track.uri,
      url: track.id ? `https://open.spotify.com/track/${track.id}` : undefined,
    },
  };
};

/** Tracks of an album fetched through the official plugin's metadata provider. */
export const albumToTracks = (album: Album): Track[] =>
  (album.tracks ?? []).map((track) => ({
    title: track.title,
    artists: track.artists.map((artist) => ({
      name: artist.name,
      roles: [],
      source: artist.source,
    })),
    durationMs: track.durationMs,
    artwork: track.artwork ?? album.artwork,
    album: { title: album.title, artwork: album.artwork, source: album.source },
    source: track.source,
  }));

export const buildPlaylist = (options: {
  name: string;
  description: string;
  tracks: Track[];
  artwork?: ArtworkSet;
  addedAt?: (index: number) => string;
  origin?: Playlist['origin'];
}): Playlist => {
  const now = new Date().toISOString();
  return {
    id: '',
    name: options.name,
    description: options.description,
    artwork: options.artwork,
    createdAtIso: now,
    lastModifiedIso: now,
    origin: options.origin,
    isReadOnly: false,
    items: options.tracks.map((track, index) => ({
      id: crypto.randomUUID(),
      track,
      addedAtIso: options.addedAt?.(index) ?? now,
    })),
  };
};

/** Best thumbnail URL of a Nuclear track, around 64px. */
export const trackThumbnail = (track: Track) => {
  const items = track.artwork?.items ?? track.album?.artwork?.items ?? [];
  const sorted = [...items]
    .filter((item) => item.url)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((item) => (item.width ?? 0) >= 60) ?? sorted[sorted.length - 1])?.url ?? null;
};
