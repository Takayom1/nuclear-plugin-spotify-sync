import type { NuclearPlugin, NuclearPluginAPI } from '@nuclearplayer/plugin-sdk';

import { DASHBOARD_PROVIDER_ID, NUCLEAR_LANGUAGE_SETTING, TAB_KEYS } from './constants';
import { Home } from './data/home';
import { Library } from './data/library';
import { getLocale, resolveLocale, setLocale, t } from './i18n';
import { createDashboardProvider } from './nuclear/dashboardProvider';
import { registerSettings, SETTINGS } from './settings';
import { SpotifyAuth } from './spotify/auth';
import { SpotifyClient } from './spotify/client';
import { createFetch } from './spotify/http';
import { HomeView } from './ui/homeView';
import { icons } from './ui/icons';
import { LikedView } from './ui/likedView';
import { NowPlaying } from './ui/nowPlaying';
import { Popups } from './ui/popups';
import { SidebarTab } from './ui/sidebar';
import { removeStyles } from './ui/styles';

const BACKGROUND_SYNC_INTERVAL = 60 * 1000;
const STARTUP_SYNC_DELAY = 5 * 1000;

type Instance = { dispose: () => void };

let instance: Instance | null = null;

/** Follows Nuclear's UI language; returns true when it changed. */
const syncLocale = async (api: NuclearPluginAPI) => {
  const previous = getLocale();
  try {
    setLocale(resolveLocale(await api.Settings.getGlobal<string>(NUCLEAR_LANGUAGE_SETTING)));
  } catch {
    setLocale(resolveLocale(navigator.language));
  }
  return getLocale() !== previous;
};

const start = async (api: NuclearPluginAPI): Promise<Instance> => {
  await syncLocale(api);
  await registerSettings(api);

  const fetch = createFetch(api);
  const auth = new SpotifyAuth(api, fetch);
  await auth.init();
  const client = new SpotifyClient(auth, fetch);
  const library = new Library(api, client);
  await library.loadCache();
  const home = new Home(api, client, library);
  const nowPlaying = new NowPlaying(api);
  nowPlaying.start();
  const popups = new Popups();

  // Re-render in the new language if the user switched it while we were hidden.
  const refreshLocale = async () => {
    if (await syncLocale(api)) {
      homeTab.setLabel(t('tab.home'));
      likedTab.setLabel(t('tab.liked'));
      homeView.rebuild();
      likedView.rebuild();
    }
  };

  const homeTab = new SidebarTab({
    key: TAB_KEYS.home,
    label: t('tab.home'),
    iconHtml: icons.spotify(),
    insertAfter: 'a[href="/favorites/tracks"]',
    onShow: () => {
      homeView.show();
      void refreshLocale();
    },
    onHide: () => homeView.hide(),
    onReselect: () => homeView.reselect(),
  });
  const likedTab = new SidebarTab({
    key: TAB_KEYS.liked,
    label: t('tab.liked'),
    iconHtml: icons.heart(),
    insertAfter: `[data-nsp-nav="${TAB_KEYS.home}"]`,
    onShow: () => {
      likedView.show();
      void refreshLocale();
    },
    onHide: () => likedView.hide(),
    onReselect: () => likedView.scrollToTop(),
  });

  // Views are created after the tabs; the tab callbacks only run later.
  const homeView = new HomeView(
    { api, auth, library, popups, leaveTab: () => homeTab.deactivate() },
    home,
    library,
    nowPlaying,
    () => likedTab.activate(),
  );
  const likedView = new LikedView(
    { api, auth, library, popups, leaveTab: () => likedTab.deactivate() },
    library,
    nowPlaying,
  );
  homeView.mount(homeTab.container);
  likedView.mount(likedTab.container);
  homeTab.mount();
  likedTab.mount();

  api.Providers.register(createDashboardProvider(home));

  // Keeps Liked Songs fresh so the tab is up to date before it is opened.
  const backgroundSync = async () => {
    const minutes = (await api.Settings.get<number>(SETTINGS.autoRefreshMinutes)) ?? 15;
    const { fetchedAt, syncing } = library.state;
    const stale = !fetchedAt || Date.now() - fetchedAt >= minutes * 60000;
    if (auth.isLoggedIn() && !syncing && minutes > 0 && stale) {
      await library.sync();
    }
  };
  const interval = window.setInterval(() => void backgroundSync(), BACKGROUND_SYNC_INTERVAL);
  const startup = window.setTimeout(() => void backgroundSync(), STARTUP_SYNC_DELAY);

  api.Logger.info('Spotify Home enabled');

  return {
    dispose: () => {
      window.clearInterval(interval);
      window.clearTimeout(startup);
      homeTab.unmount();
      likedTab.unmount();
      homeView.destroy();
      likedView.destroy();
      popups.destroy();
      nowPlaying.stop();
      removeStyles();
      try {
        api.Providers.unregister(DASHBOARD_PROVIDER_ID);
      } catch {
        // Already unregistered.
      }
    },
  };
};

const stop = () => {
  instance?.dispose();
  instance = null;
};

const plugin: NuclearPlugin = {
  async onEnable(api) {
    stop();
    instance = await start(api);
  },
  onDisable: stop,
  onUnload: stop,
};

export default plugin;
