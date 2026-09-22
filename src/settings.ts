import type { NuclearPluginAPI } from '@nuclearplayer/plugin-sdk';

import { DEFAULT_CHART_LINKS, DEFAULT_REDIRECT_URI } from './constants';
import { t } from './i18n';

export const SETTINGS = {
  clientId: 'clientId',
  redirectUri: 'redirectUri',
  autoRefreshMinutes: 'autoRefreshMinutes',
  autoSyncPlaylist: 'autoSyncPlaylist',
  mixLinks: 'mixLinks',
  chartLinks: 'chartLinks',
  releaseDays: 'releaseDays',
  refreshToken: 'refreshToken',
} as const;

const CATEGORY = 'Spotify Home';

export const registerSettings = (api: NuclearPluginAPI) =>
  api.Settings.register([
    {
      id: SETTINGS.clientId,
      title: t('settings.clientId.title'),
      description: t('settings.clientId.description'),
      category: CATEGORY,
      kind: 'string',
      default: '',
      widget: { type: 'text', placeholder: '1a2b3c4d5e6f…' },
    },
    {
      id: SETTINGS.redirectUri,
      title: t('settings.redirectUri.title'),
      description: t('settings.redirectUri.description'),
      category: CATEGORY,
      kind: 'string',
      default: DEFAULT_REDIRECT_URI,
      widget: { type: 'text', placeholder: DEFAULT_REDIRECT_URI },
    },
    {
      id: SETTINGS.mixLinks,
      title: t('settings.mixLinks.title'),
      description: t('settings.mixLinks.description'),
      category: CATEGORY,
      kind: 'string',
      default: '',
      widget: { type: 'textarea', rows: 4, placeholder: 'https://open.spotify.com/playlist/…' },
    },
    {
      id: SETTINGS.chartLinks,
      title: t('settings.chartLinks.title'),
      description: t('settings.chartLinks.description'),
      category: CATEGORY,
      kind: 'string',
      default: DEFAULT_CHART_LINKS,
      widget: { type: 'textarea', rows: 3 },
    },
    {
      id: SETTINGS.releaseDays,
      title: t('settings.releaseDays.title'),
      description: t('settings.releaseDays.description'),
      category: CATEGORY,
      kind: 'number',
      default: 30,
      min: 7,
      max: 180,
      step: 1,
      unit: t('settings.daysUnit'),
      widget: { type: 'number-input', min: 7, max: 180, step: 1, unit: t('settings.daysUnit') },
    },
    {
      id: SETTINGS.autoRefreshMinutes,
      title: t('settings.autoRefresh.title'),
      description: t('settings.autoRefresh.description'),
      category: CATEGORY,
      kind: 'number',
      default: 15,
      min: 0,
      max: 240,
      step: 5,
      unit: t('settings.minutesUnit'),
      widget: {
        type: 'number-input',
        min: 0,
        max: 240,
        step: 5,
        unit: t('settings.minutesUnit'),
      },
    },
    {
      id: SETTINGS.autoSyncPlaylist,
      title: t('settings.autoSyncPlaylist.title'),
      description: t('settings.autoSyncPlaylist.description'),
      category: CATEGORY,
      kind: 'boolean',
      default: false,
      widget: { type: 'toggle' },
    },
    {
      id: SETTINGS.refreshToken,
      title: t('settings.refreshToken.title'),
      category: CATEGORY,
      kind: 'string',
      default: '',
      hidden: true,
    },
  ]);
