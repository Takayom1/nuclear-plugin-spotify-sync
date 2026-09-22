import type { NuclearPluginAPI } from '@nuclearplayer/plugin-sdk';

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Spotify's Web API and token endpoint send CORS headers, so the webview's own
 * fetch is used first (it handles every status code). Nuclear's host fetch is
 * the fallback for networks where the direct request fails.
 */
export const createFetch =
  (api: NuclearPluginAPI): Fetch =>
  async (url, init) => {
    try {
      return await fetch(url, init);
    } catch (error) {
      api.Logger.debug(
        `Direct fetch failed for ${url}, retrying through Nuclear: ${String(error)}`,
      );
      return api.Http.fetch(url, init);
    }
  };
