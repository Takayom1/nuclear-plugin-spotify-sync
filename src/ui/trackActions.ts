// Playback, navigation and context-menu actions shared by both tabs.
import type { NuclearPluginAPI, Track } from '@nuclearplayer/plugin-sdk';

import { SPOTIFY_METADATA_PROVIDER } from '../constants';
import type { Library } from '../data/library';
import { t } from '../i18n';
import { navigateTo, type NavigateOptions } from '../nuclear/router';
import type { SpotifyAuth } from '../spotify/auth';
import { idFromUri } from '../spotify/parse';
import { errorMessage } from '../utils/async';
import { icons } from './icons';
import type { MenuItem, Popups } from './popups';

export type ViewContext = {
  api: NuclearPluginAPI;
  auth: SpotifyAuth;
  library: Library;
  popups: Popups;
  /** Closes the tab before navigating to a player route. */
  leaveTab: () => void;
};

export const toast = (
  ctx: ViewContext,
  message: string,
  action?: { label: string; run: () => unknown },
) => ctx.popups.toast(message, action);

/** Replaces the queue with `tracks` and starts playing at `index`. */
export const playTracks = async (ctx: ViewContext, tracks: Track[], index = 0) => {
  if (!tracks.length) {
    toast(ctx, t('common.nothingToPlay'));
    return;
  }
  try {
    await ctx.api.Queue.clearQueue();
    await ctx.api.Queue.addToQueue(tracks);
    if (index > 0) {
      await ctx.api.Queue.goToIndex(index);
    }
    await ctx.api.Playback.play();
  } catch (error) {
    toast(ctx, t('common.playFailed', { error: errorMessage(error) }));
  }
};

export const goTo = (ctx: ViewContext, to: string, options?: NavigateOptions) => {
  ctx.leaveTab();
  navigateTo(to, options);
};

const hasSpotifyMetadata = (ctx: ViewContext) => {
  try {
    return !!ctx.api.Providers.get(SPOTIFY_METADATA_PROVIDER, 'metadata');
  } catch {
    return false;
  }
};

/** Opens the artist page via the official Spotify plugin, or searches by name. */
export const openArtist = (ctx: ViewContext, track: Track, index = 0) => {
  const artist = track.artists[index];
  if (!artist) {
    return;
  }
  if (artist.source?.provider === SPOTIFY_METADATA_PROVIDER && hasSpotifyMetadata(ctx)) {
    goTo(ctx, '/artist/$providerId/$artistId', {
      params: { providerId: SPOTIFY_METADATA_PROVIDER, artistId: artist.source.id },
    });
  } else {
    goTo(ctx, '/search', { search: { q: artist.name.slice(0, 100) } });
  }
};

export const openAlbumUri = (ctx: ViewContext, albumUri: string) =>
  goTo(ctx, '/album/$providerId/$albumId', {
    params: { providerId: SPOTIFY_METADATA_PROVIDER, albumId: albumUri },
  });

export const canOpenAlbumPages = hasSpotifyMetadata;

export const openAlbum = (ctx: ViewContext, track: Track) => {
  const album = track.album;
  if (!album) {
    return;
  }
  if (album.source.id.startsWith('spotify:album:') && hasSpotifyMetadata(ctx)) {
    openAlbumUri(ctx, album.source.id);
  } else {
    const query = `${track.artists[0]?.name ?? ''} ${album.title}`.trim();
    goTo(ctx, '/search', { search: { q: query.slice(0, 100) } });
  }
};

/** Adds or removes a song from Spotify Liked Songs, with an undo toast on removal. */
export const toggleLike = async (ctx: ViewContext, track: Track) => {
  if (!ctx.auth.isLoggedIn()) {
    toast(ctx, t('toast.loginFirst'));
    return;
  }
  if (!ctx.auth.hasScopes(['user-library-modify'])) {
    toast(ctx, t('toast.noModifyScope'));
    return;
  }
  const liked = ctx.library.state.tracks.find((item) => item.uri === track.source.id);
  try {
    if (liked) {
      await ctx.library.unlike(liked);
      toast(ctx, t('toast.unliked', { title: track.title }), {
        label: t('common.undo'),
        run: () =>
          ctx.library
            .like(liked)
            .catch((error) => toast(ctx, t('toast.relikeFailed', { error: errorMessage(error) }))),
      });
    } else {
      await ctx.library.likeUri(track.source.id);
      toast(ctx, t('toast.liked', { title: track.title }));
    }
  } catch (error) {
    toast(
      ctx,
      t(liked ? 'toast.unlikeFailed' : 'toast.likeFailed', { error: errorMessage(error) }),
    );
  }
};

export const trackMenu = (
  ctx: ViewContext,
  track: Track,
  playFromHere: () => unknown,
): MenuItem[] => {
  const isLiked = ctx.library.likedUris().has(track.source.id);
  const isLocal = track.source.id.startsWith('spotify:local:');
  const items: MenuItem[] = [
    { icon: icons.play(16), label: t('menu.playFromHere'), run: playFromHere },
    {
      icon: icons.next(16),
      label: t('menu.playNext'),
      run: async () => {
        await ctx.api.Queue.addNext([track]);
        toast(ctx, t('toast.playNext', { title: track.title }));
      },
    },
    {
      icon: icons.queue(16),
      label: t('menu.addToQueue'),
      run: async () => {
        await ctx.api.Queue.addToQueue([track]);
        toast(ctx, t('toast.queued', { title: track.title }));
      },
    },
    {
      icon: icons.star(16),
      label: t('menu.addToFavorites'),
      run: async () => {
        if (await ctx.api.Favorites.isTrackFavorite(track.source)) {
          toast(ctx, t('toast.alreadyFavorite'));
          return;
        }
        await ctx.api.Favorites.addTrack(track);
        toast(ctx, t('toast.favorited', { title: track.title }));
      },
    },
    'separator',
  ];
  track.artists.forEach((artist, index) =>
    items.push({
      icon: icons.user(16),
      label: t('menu.artist', { name: artist.name }),
      run: () => openArtist(ctx, track, index),
    }),
  );
  if (track.album?.title) {
    items.push({
      icon: icons.disc(16),
      label: t('menu.album', { name: track.album.title }),
      run: () => openAlbum(ctx, track),
    });
  }
  const id = idFromUri(track.source.id);
  if (id && !isLocal) {
    const url = `https://open.spotify.com/track/${id}`;
    items.push(
      'separator',
      {
        icon: icons.external(16),
        label: t('common.openInSpotify'),
        run: () => ctx.api.Shell.openExternal(url),
      },
      {
        icon: icons.copy(16),
        label: t('common.copyLink'),
        run: async () => {
          await navigator.clipboard.writeText(url);
          toast(ctx, t('common.linkCopied'));
        },
      },
    );
  }
  if (!isLocal) {
    items.push('separator', {
      icon: isLiked ? icons.heartFilled(16) : icons.heart(16),
      label: t(isLiked ? 'menu.unlike' : 'menu.like'),
      run: () => toggleLike(ctx, track),
    });
  }
  return items;
};

/** Saves an arbitrary track list as a new Nuclear playlist and offers to open it. */
export const saveAsNuclearPlaylist = async (
  ctx: ViewContext,
  playlist: Parameters<NuclearPluginAPI['Playlists']['importPlaylist']>[0],
) => {
  try {
    const id = await ctx.api.Playlists.importPlaylist(playlist);
    toast(ctx, t('toast.playlistSaved', { name: playlist.name }), {
      label: t('common.open'),
      run: () => goTo(ctx, '/playlists/$playlistId', { params: { playlistId: id } }),
    });
  } catch (error) {
    toast(ctx, t('toast.playlistFailed', { error: errorMessage(error) }));
  }
};
