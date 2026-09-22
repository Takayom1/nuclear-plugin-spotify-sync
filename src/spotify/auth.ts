// OAuth 2.0 Authorization Code flow with PKCE against the user's own Spotify
// app. Nuclear cannot receive redirects, so the user pastes the redirect URL
// (or the plugin picks it up from the clipboard) to finish the login.
import type { NuclearPluginAPI } from '@nuclearplayer/plugin-sdk';

import { DEFAULT_REDIRECT_URI, STORAGE_PREFIX } from '../constants';
import { t } from '../i18n';
import { SETTINGS } from '../settings';
import type { Fetch } from './http';
import { SpotifyError } from './types';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const PENDING_LOGIN_KEY = `${STORAGE_PREFIX}:pkce`;
/** Authorization codes live 10 minutes; the verifier is kept a little longer. */
const PENDING_LOGIN_TTL = 30 * 60 * 1000;

export const SCOPES = [
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'user-follow-read',
  'user-top-read',
];

/** Scopes added for the home tab; older logins may lack them. */
export const HOME_SCOPES = ['playlist-read-private', 'user-follow-read', 'user-top-read'];

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

type PendingLogin = {
  verifier: string;
  state: string;
  clientId: string;
  redirectUri: string;
  createdAt: number;
};

const randomString = (length: number) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
};

const base64Url = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const codeChallenge = async (verifier: string) =>
  base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));

const formBody = (params: Record<string, string>) => new URLSearchParams(params).toString();

/** True when the text looks like the redirect Spotify sent the browser to. */
export const looksLikeCallback = (text: string) =>
  /[?&]code=[\w-]{20,}/.test(text) || /[?&]error=/.test(text);

/** Pulls `code`, `state` and `error` out of a pasted redirect URL (or a bare code). */
export const parseCallback = (input: string) => {
  const text = input.trim();
  const queryStart = text.indexOf('?');
  if (queryStart !== -1) {
    const params = new URLSearchParams(text.slice(queryStart + 1).split('#')[0]);
    return { code: params.get('code'), state: params.get('state'), error: params.get('error') };
  }
  return { code: /^[\w-]{20,}$/.test(text) ? text : null, state: null, error: null };
};

const describeTokenError = (data: Record<string, string>, status: number) => {
  switch (data.error) {
    case 'invalid_client':
      return t('auth.invalidClient');
    case 'invalid_grant':
      return data.error_description?.includes('redirect')
        ? t('auth.redirectMismatch')
        : t('auth.codeExpired');
    default:
      return t('auth.rejected', {
        status,
        message: data.error_description || data.error || t('auth.unknownError'),
      });
  }
};

export class SpotifyAuth {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshToken: string | null = null;
  private grantedScopes: string[] = [];
  private pendingRefresh: Promise<string> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly api: NuclearPluginAPI,
    private readonly fetch: Fetch,
  ) {}

  async init() {
    this.refreshToken = (await this.api.Settings.get<string>(SETTINGS.refreshToken)) || null;
  }

  isLoggedIn() {
    return this.refreshToken !== null;
  }

  /** Scopes are only known once a token was issued in this session; unknown counts as granted. */
  hasScopes(scopes: string[]) {
    return (
      this.grantedScopes.length === 0 || scopes.every((scope) => this.grantedScopes.includes(scope))
    );
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange() {
    this.listeners.forEach((listener) => listener());
  }

  async getClientId() {
    return ((await this.api.Settings.get<string>(SETTINGS.clientId)) ?? '').trim();
  }

  async setClientId(clientId: string) {
    await this.api.Settings.set(SETTINGS.clientId, clientId.trim());
  }

  async getRedirectUri() {
    const value = ((await this.api.Settings.get<string>(SETTINGS.redirectUri)) ?? '').trim();
    return value || DEFAULT_REDIRECT_URI;
  }

  hasPendingLogin() {
    return this.readPendingLogin() !== null;
  }

  private readPendingLogin(): PendingLogin | null {
    try {
      const raw = localStorage.getItem(PENDING_LOGIN_KEY);
      if (!raw) {
        return null;
      }
      const pending = JSON.parse(raw) as PendingLogin;
      if (Date.now() - pending.createdAt > PENDING_LOGIN_TTL) {
        localStorage.removeItem(PENDING_LOGIN_KEY);
        return null;
      }
      return pending;
    } catch {
      return null;
    }
  }

  /** Opens Spotify's consent page in the system browser. */
  async beginLogin() {
    const clientId = await this.getClientId();
    if (!/^[0-9a-zA-Z]{16,64}$/.test(clientId)) {
      throw new SpotifyError(t('auth.clientIdMissing'));
    }
    const pending: PendingLogin = {
      verifier: randomString(64),
      state: randomString(16),
      clientId,
      redirectUri: await this.getRedirectUri(),
      createdAt: Date.now(),
    };
    localStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(pending));

    const url = new URL(AUTHORIZE_URL);
    url.search = formBody({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: pending.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: await codeChallenge(pending.verifier),
      scope: SCOPES.join(' '),
      state: pending.state,
      show_dialog: 'true',
    });
    await this.api.Shell.openExternal(url.toString());
  }

  /** Exchanges the pasted redirect URL for tokens. */
  async completeLogin(input: string) {
    const pending = this.readPendingLogin();
    if (!pending) {
      throw new SpotifyError(t('auth.notStarted'));
    }
    const { code, state, error } = parseCallback(input);
    if (error) {
      throw new SpotifyError(
        error === 'access_denied' ? t('auth.accessDenied') : t('auth.error', { error }),
      );
    }
    if (!code) {
      throw new SpotifyError(t('auth.noCode', { uri: pending.redirectUri }));
    }
    if (state && state !== pending.state) {
      throw new SpotifyError(t('auth.stateMismatch'));
    }

    const token = await this.tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: pending.redirectUri,
      client_id: pending.clientId,
      code_verifier: pending.verifier,
    });
    localStorage.removeItem(PENDING_LOGIN_KEY);
    await this.applyToken(token);
  }

  async logout() {
    this.accessToken = null;
    this.expiresAt = 0;
    this.refreshToken = null;
    this.grantedScopes = [];
    await this.api.Settings.set(SETTINGS.refreshToken, '');
    this.emitChange();
  }

  /** Forgets the cached access token so the next request refreshes it. */
  invalidateAccessToken() {
    this.accessToken = null;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }
    if (!this.refreshToken) {
      throw new SpotifyError(t('auth.needLogin'), 401);
    }
    if (!this.pendingRefresh) {
      this.pendingRefresh = this.refreshAccessToken().finally(() => {
        this.pendingRefresh = null;
      });
    }
    return this.pendingRefresh;
  }

  private async refreshAccessToken(): Promise<string> {
    try {
      const token = await this.tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken ?? '',
        client_id: await this.getClientId(),
      });
      await this.applyToken(token);
      return token.access_token;
    } catch (error) {
      if (error instanceof SpotifyError && (error.status === 400 || error.status === 401)) {
        // Revoked refresh token or a different client: a new login is required.
        await this.logout();
        throw new SpotifyError(t('auth.sessionExpired'), 401);
      }
      throw error;
    }
  }

  private async tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
    const response = await this.fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody(params),
    });
    const text = await response.text();
    let data: Record<string, string> = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON error page, described by status below.
    }
    if (!response.ok) {
      throw new SpotifyError(describeTokenError(data, response.status), response.status);
    }
    return data as unknown as TokenResponse;
  }

  private async applyToken(token: TokenResponse) {
    const wasLoggedIn = this.isLoggedIn();
    this.accessToken = token.access_token;
    this.expiresAt = Date.now() + (token.expires_in - 60) * 1000;
    if (token.scope) {
      this.grantedScopes = token.scope.split(' ');
    }
    if (token.refresh_token && token.refresh_token !== this.refreshToken) {
      this.refreshToken = token.refresh_token;
      await this.api.Settings.set(SETTINGS.refreshToken, token.refresh_token);
    }
    if (!wasLoggedIn) {
      this.emitChange();
    }
  }
}
