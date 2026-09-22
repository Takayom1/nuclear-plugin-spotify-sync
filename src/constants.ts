/** Prefix for localStorage / IndexedDB keys owned by this plugin. */
export const STORAGE_PREFIX = 'nuclear-plugin-spotify-home';

/** Provider ids of the official Nuclear Spotify plugin, reused so its artist/album pages open from our tracks. */
export const SPOTIFY_METADATA_PROVIDER = 'spotify';
export const SPOTIFY_PLAYLISTS_PROVIDER = 'spotify-playlists';

/** Our provider for Nuclear's built-in Dashboard page. */
export const DASHBOARD_PROVIDER_ID = 'spotify-home-dashboard';

/** Global setting where Nuclear keeps its UI language (e.g. "en_US"). */
export const NUCLEAR_LANGUAGE_SETTING = 'core.general.language';

export const TAB_KEYS = {
  home: 'nsp-home',
  liked: 'nsp-liked',
} as const;

export const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:8888/callback';

export const DEFAULT_CHART_LINKS = [
  'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF', // Top 50 - Global
  'https://open.spotify.com/playlist/37i9dQZEVXbLRQDuF5jeBp', // Top 50 - USA
].join('\n');
