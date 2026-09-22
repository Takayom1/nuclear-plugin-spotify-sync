export type SpotifyImage = {
  url: string;
  width: number | null;
  height: number | null;
};

export type ArtistLink = { name: string; uri: string | null };

/** A song from the user's Liked Songs (or any Web API track normalised the same way). */
export type LikedTrack = {
  uri: string;
  id: string | null;
  name: string;
  artists: ArtistLink[];
  album: { name: string; uri: string | null; images: SpotifyImage[] };
  durationMs: number;
  addedAt: string;
  explicit: boolean;
  isLocal: boolean;
};

export type SpotifyUser = {
  id: string;
  displayName: string;
  image: string | null;
};

export type SpotifyPlaylistInfo = {
  id: string;
  uri: string;
  name: string;
  description: string;
  image: string | null;
  ownerId: string;
};

export type SpotifyArtistInfo = { id: string; uri: string; name: string };

export type SpotifyRelease = {
  id: string;
  uri: string;
  name: string;
  type: string;
  releaseDate: string;
  totalTracks: number;
  artists: ArtistLink[];
  images: SpotifyImage[];
};

export type LikedPage = { total: number; items: LikedTrack[] };

export class SpotifyError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SpotifyError';
  }
}
