# Home & Liked Songs for Spotify

A [Nuclear](https://github.com/nukeop/nuclear) plugin that brings the Spotify home screen and your Liked Songs into the player as two sidebar tabs.

## Features

### Spotify tab

- **Made for you**: your Daily Mixes, Discover Weekly, Release Radar, daylist and other Spotify mixes. Mixes saved to your Spotify library are found automatically; any other mix can be added by pasting its link.
- **New releases from your artists**: albums and singles from the last 30 days by artists you follow, your top artists and the artists you like most.
- **Charts**: Top 50 Global and Top 50 USA as cards and a switchable track list. Any other playlist can be added as a chart in the settings.
- **Playback from cards**: the ▶ button on a card plays the whole mix, chart or release. Clicking the card opens its track list inside the tab, with Play, Shuffle, Save to Nuclear and Open in Spotify.
- **Nuclear Dashboard**: the same mixes, charts and releases also show up on Nuclear's built-in Dashboard page.

### Liked Songs tab

- Your Spotify Liked Songs as a Spotify-style playlist page: cover, song count, total length and last sync time.
- Play, shuffle, search by title, artist or album, and sort by any column.
- ♥ removes a song from Liked Songs in Spotify, with an undo option. In the Spotify tab, ♥ adds a song to Liked Songs.
- Right-click on a song: play next, add to queue, add to Nuclear favorites, go to the artist or album, open in Spotify.
- Optional copy of Liked Songs in Nuclear's playlists, kept up to date automatically.
- Cached locally, so the tab opens instantly and new likes are synced in the background.

The interface is in English, or in Russian when Nuclear's language is set to Russian.

## Requirements

- **The official Spotify metadata plugin for Nuclear** (`nuclear-plugin-something`), installed from the plugin store and enabled. Spotify-owned playlists (charts and mixes) are not available to third-party Web API apps, so their contents are loaded through that plugin. It also provides the artist and album pages.
- **Your own free app in Spotify for Developers.** Personal data (Liked Songs, saved mixes, followed artists) comes from the official Spotify Web API through your account.
- **Spotify Premium on the account that owns the app.** Spotify requires this for apps in development mode since February 2026.
- **A streaming plugin that provides audio**, such as YouTube, SoundCloud or OmniSource. Nuclear finds each song there by artist and title; Spotify itself does not stream audio to third-party apps.

## Setup

1. Install the plugin from **Plugins → Store** and enable it.
2. Open the **Liked Songs** tab and follow the steps on screen:
   1. On [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) click **Create app**. Add `http://127.0.0.1:8888/callback` under **Redirect URIs**, tick **Web API** and save.
   2. Paste the app's **Client ID** into the tab. No client secret is needed: login uses OAuth PKCE.
   3. Click **Log in with Spotify** and approve access in the browser.
   4. The browser then opens `http://127.0.0.1:8888/callback?code=…`, which fails to load. This is expected. Copy that address and switch back to Nuclear: the plugin picks it up from the clipboard. You can also paste it into the field manually.

Nothing has to run on port 8888. The redirect address only carries the one-time login code back to the plugin.

## Settings

Available under **Settings → Spotify Home**.

| Setting | Default | Description |
| --- | --- | --- |
| Spotify Client ID | – | Client ID of your Spotify app |
| Redirect URI | `http://127.0.0.1:8888/callback` | Must match your Spotify app settings |
| Mix links | – | Extra mixes for the Made for you section, links separated by spaces |
| Charts | Top 50 Global, Top 50 USA | Playlists shown in the Charts section |
| New releases window | 30 days | How long a release counts as new |
| Liked Songs refresh interval | 15 min | Background sync interval; 0 turns it off |
| Keep a copy in Nuclear playlists | off | Recreates the "Spotify · Liked Songs" playlist after each change |

## Privacy

- **Spotify token.** It is kept only in Nuclear's local settings, and requests go straight from Nuclear to Spotify.
- **Permissions requested:** read and edit Liked Songs, read saved playlists, followed artists and top artists.
- **Clipboard.** The plugin reads it only while a login is waiting for the redirect address, and only when Nuclear regains focus.
- **Cache.** Liked Songs, mixes and releases are cached in the player's IndexedDB.

## How it works

Nuclear's plugin API has no way to add sidebar entries or pages. The plugin therefore adds its tabs to the sidebar with the same styles as the built-in items and shows its pages over the main content area. Any navigation hides them again.

Tracks are queued with the `spotify` provider ids that the official Spotify plugin uses, so its artist and album pages open from them.

## Development

```bash
npm install
npm run check     # typecheck, lint, formatting, tests
npm run build     # bundles src/index.ts to dist/index.js
npm run package   # build + plugin.zip and release/ folder
```

To try local changes, run `npm run package`, then in Nuclear choose **Plugins → Add Plugin** and select the generated `release/` folder. After each `npm run package`, use the reload button on the plugin.

Pushing a `v*` tag runs the release workflow, which checks, builds and attaches `plugin.zip` to a GitHub release.

## License

[AGPL-3.0-only](LICENSE). Not affiliated with or endorsed by Spotify.
