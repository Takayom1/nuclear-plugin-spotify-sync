// English strings are the source of truth: every other locale must provide
// the same keys (enforced by the `Messages` type in ./index.ts).
// Strings used as HTML only ever contain markup written here, never user data.

export type PluralForms = { one: string; few?: string; many?: string; other: string };

export const en = {
  'tab.home': 'Spotify',
  'tab.liked': 'Liked Songs',

  'common.play': 'Play',
  'common.pause': 'Pause',
  'common.shufflePlay': 'Shuffle play',
  'common.more': 'More',
  'common.retry': 'Retry',
  'common.back': '← Back',
  'common.open': 'Open',
  'common.undo': 'Undo',
  'common.add': 'Add',
  'common.copy': 'Copy',
  'common.saveToNuclear': 'Save to Nuclear',
  'common.openInSpotify': 'Open in Spotify',
  'common.copyLink': 'Copy link',
  'common.linkCopied': 'Link copied',
  'common.untitled': 'Untitled',
  'common.tracks': { one: '{count} song', other: '{count} songs' } as PluralForms,
  'common.hoursMinutes': '{hours} hr {minutes} min',
  'common.minutes': '{minutes} min',
  'common.justNow': 'just now',
  'common.updated': 'updated {when}',
  'common.neverUpdated': 'not synced yet',
  'common.syncing': 'syncing…',
  'common.updating': 'updating…',
  'common.playFailed': "Couldn't start playback: {error}",
  'common.nothingToPlay': 'There is nothing to play here',
  'common.explicit': 'Explicit',

  'col.title': 'Title',
  'col.artist': 'Artist',
  'col.album': 'Album',
  'col.dateAdded': 'Date added',
  'col.duration': 'Duration',

  'menu.playFromHere': 'Play from here',
  'menu.playNext': 'Play next',
  'menu.addToQueue': 'Add to queue',
  'menu.addToFavorites': 'Add to Nuclear favorites',
  'menu.like': 'Save to Liked Songs',
  'menu.unlike': 'Remove from Liked Songs',
  'menu.artist': 'Artist: {name}',
  'menu.album': 'Album: {name}',

  'toast.playNext': '“{title}” will play next',
  'toast.queued': '“{title}” added to queue',
  'toast.queuedAll': 'Added to queue: {tracks}',
  'toast.favorited': '“{title}” added to Nuclear favorites',
  'toast.alreadyFavorite': 'Already in Nuclear favorites',
  'toast.liked': '“{title}” saved to Liked Songs',
  'toast.unliked': '“{title}” removed from Liked Songs',
  'toast.likeFailed': 'Something went wrong: {error}',
  'toast.unlikeFailed': "Couldn't remove the song: {error}",
  'toast.relikeFailed': "Couldn't restore the song: {error}",
  'toast.noModifyScope': 'Missing permission to edit your library. Log out and log in again.',
  'toast.loginFirst': 'Log in to Spotify first',
  'toast.playlistSaved': 'Playlist “{name}” saved to Nuclear',
  'toast.playlistUpdated': 'Playlist “{name}” updated: {tracks}',
  'toast.playlistFailed': "Couldn't save the playlist: {error}",
  'toast.connected': 'Spotify connected, loading your Liked Songs',
  'toast.redirectCopied': 'Redirect URI copied',

  'liked.kicker': 'Playlist · Spotify',
  'liked.title': 'Liked Songs',
  'liked.search': 'Search in Liked Songs',
  'liked.refresh': 'Refresh from Spotify',
  'liked.saveHint': 'Create or update the “{name}” playlist in Nuclear',
  'liked.sortBy': 'Sort by: {field}',
  'liked.progress': 'Loading Liked Songs: {loaded} of {total}',
  'liked.loadingTitle': 'Loading your Liked Songs…',
  'liked.loadingHint': 'The first sync can take a few seconds.',
  'liked.emptyTitle': 'Nothing here yet',
  'liked.emptyHint': 'Like songs in Spotify and they will show up in this tab.',
  'liked.noResultsTitle': 'No results',
  'liked.noResultsHint': 'Nothing in Liked Songs matches “{query}”.',
  'liked.reloadAll': 'Reload everything from Spotify',
  'liked.saveAs': 'Save as “{name}”',
  'liked.queueAll': 'Add all to queue',
  'liked.logout': 'Log out of Spotify',
  'liked.logoutAs': 'Log out of Spotify ({name})',
  'liked.playlistName': 'Spotify · Liked Songs',
  'liked.playlistDescription': 'Copy of your Spotify Liked Songs. Updated {date}.',

  'setup.meta': 'Connect your Spotify account to see your Liked Songs here',
  'setup.intro':
    'You need your own app in Spotify for Developers — it is free and takes a couple of minutes. No client secret is needed: login uses OAuth PKCE, and the token is stored only in Nuclear’s settings on this computer.',
  'setup.step1.title': 'Create a Spotify app',
  'setup.step1.html':
    '<li>Open the Dashboard and click <b>Create app</b>.</li><li>Any name and description will do.</li><li>Under <b>Redirect URIs</b> add the address from step 2 and click <b>Add</b>.</li><li>Under “Which API/SDKs are you planning to use?” tick <b>Web API</b>, accept the terms and save.</li><li>Copy the <b>Client ID</b> from the app page.</li>',
  'setup.step1.open': 'Open Spotify Dashboard',
  'setup.step1.hint':
    'Spotify only runs development-mode apps whose owner has Premium. Your account is added as the owner automatically.',
  'setup.step2.title': 'Redirect URI',
  'setup.step2.hint':
    'You can change it in the plugin settings. Nothing has to listen on this port.',
  'setup.step3.title': 'Client ID',
  'setup.step3.placeholder': '32 characters from the Dashboard',
  'setup.step4.title': 'Log in and grant access',
  'setup.step4.button': 'Log in with Spotify',
  'setup.step4.hint':
    'A browser window opens. The plugin asks to read and edit your Liked Songs and to read your saved playlists, followed artists and top artists.',
  'setup.step5.title': 'Paste the address from the browser',
  'setup.step5.html':
    'After you click “Agree”, the browser opens a page that fails to load — that is expected. Copy the address from the address bar (it starts with <code>{uri}</code><code>?code=</code>) and paste it here.',
  'setup.step5.button': 'Connect',
  'setup.step5.hint':
    'If the address is already copied, just switch back to Nuclear — the plugin picks it up from the clipboard.',

  'auth.invalidClient':
    'Spotify did not recognise the Client ID. Check that it was copied completely.',
  'auth.redirectMismatch': 'The Redirect URI does not match the one set in your Spotify app.',
  'auth.codeExpired': 'The authorization code expired or was already used. Click “Log in” again.',
  'auth.rejected': 'Spotify rejected the request ({status}): {message}',
  'auth.unknownError': 'unknown error',
  'auth.clientIdMissing':
    'Paste your Spotify app’s Client ID first (32 characters from the Dashboard).',
  'auth.notStarted': 'Login was not started or has expired. Click “Log in with Spotify”.',
  'auth.accessDenied': 'Access was not granted — “Cancel” was clicked in the browser.',
  'auth.error': 'Spotify returned an error: {error}',
  'auth.noCode':
    'No code found in this address. Copy the whole line from the browser’s address bar — it starts with {uri}',
  'auth.stateMismatch': 'This address belongs to a different login attempt. Click “Log in” again.',
  'auth.needLogin': 'You need to log in to Spotify.',
  'auth.sessionExpired': 'Your Spotify session expired. Please log in again.',

  'api.notRegistered':
    'This account is not added to your app. In the Spotify Dashboard open your app → User Management and add your e-mail.',
  'api.premium': 'Spotify requires the app owner to have Premium in development mode.',
  'api.scope': 'Missing permissions. Log out and log in again to grant access.',
  'api.generic': 'Spotify API ({status}): {message}',
  'api.unavailable': 'Spotify is not responding, try again later.',

  'home.greeting.morning': 'Good morning',
  'home.greeting.afternoon': 'Good afternoon',
  'home.greeting.evening': 'Good evening',
  'home.greeting.night': 'Good night',
  'home.greetingName': '{greeting}, {name}',
  'home.subtitle': 'Mixes, new releases and charts from Spotify',
  'home.reloadAll': 'Reload everything',
  'home.mixes': 'Made for you',
  'home.releases': 'New releases from your artists',
  'home.charts': 'Charts',
  'home.checkingArtists': 'checking artists: {done} of {total}',
  'home.addMixPlaceholder':
    'Add a mix: paste a link to a Daily Mix, Discover Weekly, Release Radar…',
  'home.mixAdded': 'Mix added',
  'home.mixRemoved': 'Mix removed from this tab',
  'home.removeMix': 'Remove from this tab',
  'home.mixesEmpty':
    'No mixes yet. In Spotify open a Daily Mix, Discover Weekly or Release Radar → <b>···</b> → <b>Add to Your Library</b> and it shows up here automatically. Or paste a mix link below.',
  'home.releasesLoggedOut': 'New releases appear after you log in to Spotify.',
  'home.releasesEmpty':
    'Your artists have no new releases lately. The period can be changed in the plugin settings.',
  'home.chartsEmpty': 'No charts configured. Add playlist links in the plugin settings.',
  'home.empty': 'Nothing here',
  'home.showAll': 'Show all ({count})',
  'home.showLess': 'Show less',
  'home.bannerProvider':
    'Charts and mixes are loaded through the official Nuclear <b>Spotify</b> metadata plugin. Install or enable it in Plugins → Store, then click “Reload everything”.',
  'home.bannerLogin':
    'Charts work without an account. Log in to Spotify to see your saved mixes and new releases from your artists.',
  'home.login': 'Log in',
  'home.bannerRelogin':
    'Your saved mixes and releases from followed artists need new Spotify permissions. Log in again — your Liked Songs and cache are kept.',
  'home.relogin': 'Log in again',
  'home.reloginToast': 'Log in again on the “Liked Songs” tab — your library and cache are kept',
  'home.kicker.chart': 'Chart · Spotify',
  'home.kicker.mix': 'Mix · Spotify',
  'home.loadingTracks': 'loading songs…',
  'home.albumPage': 'Album page',
  'home.releaseType.single': 'Single',
  'home.releaseType.album': 'Album',
  'home.releaseType.compilation': 'Compilation',
  'home.releaseType.other': 'Release',
  'home.releaseFailed': "Couldn't load the release: {error}",
  'home.fromSpotify': 'From Spotify, {date}',
  'home.loadFailed': 'Failed to load',
  'home.providerMissing':
    'The Spotify metadata plugin was not found. Install and enable it in Plugins → Store.',
  'home.invalidLink':
    'That is not a Spotify playlist link. Example: https://open.spotify.com/playlist/37i9dQZF1E…',

  'settings.clientId.title': 'Spotify Client ID',
  'settings.clientId.description':
    'Client ID of your app from developer.spotify.com/dashboard. No secret is needed — login uses PKCE.',
  'settings.redirectUri.title': 'Redirect URI',
  'settings.redirectUri.description':
    'Must exactly match the Redirect URI in your Spotify app settings.',
  'settings.autoRefresh.title': 'Liked Songs refresh interval',
  'settings.autoRefresh.description':
    'How often to check Spotify for new likes. 0 means manual only.',
  'settings.minutesUnit': 'min',
  'settings.autoSyncPlaylist.title': 'Keep a copy in Nuclear playlists',
  'settings.autoSyncPlaylist.description':
    'Recreate the “Spotify · Liked Songs” playlist after every change to your likes.',
  'settings.mixLinks.title': 'Mix links',
  'settings.mixLinks.description':
    'Daily Mix, Discover Weekly, Release Radar, daylist, etc. — paste links separated by spaces (Spotify → ··· → Share → Copy link). Mixes saved to your Spotify library are found automatically.',
  'settings.chartLinks.title': 'Charts',
  'settings.chartLinks.description':
    'Playlists for the Charts section, links separated by spaces. Top 50 Global and Top 50 USA by default.',
  'settings.releaseDays.title': 'New releases window',
  'settings.releaseDays.description': 'How many days a release counts as new.',
  'settings.daysUnit': 'days',
  'settings.refreshToken.title': 'Spotify refresh token',
};

export type MessageKey = keyof typeof en;
