import type { NuclearPluginAPI } from '@nuclearplayer/plugin-sdk';

import { SPOTIFY_METADATA_PROVIDER } from '../constants';
import { Store } from '../utils/store';

export type NowPlayingState = {
  /** Spotify URI of the current queue item, if it is a Spotify track. */
  currentUri: string | null;
  playing: boolean;
};

/** Tracks the player's current Spotify track and play state for all views. */
export class NowPlaying extends Store<NowPlayingState> {
  private readonly cleanups: (() => void)[] = [];

  constructor(private readonly api: NuclearPluginAPI) {
    super({ currentUri: null, playing: false });
  }

  start() {
    const setSource = (source?: { provider: string; id: string }) => {
      const currentUri = source?.provider === SPOTIFY_METADATA_PROVIDER ? source.id : null;
      if (currentUri !== this.state.currentUri) {
        this.update({ currentUri });
      }
    };
    const setPlaying = (playing: boolean) => {
      if (playing !== this.state.playing) {
        this.update({ playing });
      }
    };
    this.cleanups.push(
      this.api.Queue.subscribeToCurrentItem((item) => setSource(item?.track.source)),
      this.api.Playback.subscribe((state) => setPlaying(state.status === 'playing')),
    );
    void this.api.Queue.getCurrentItem().then((item) => setSource(item?.track.source));
    void this.api.Playback.getState().then((state) => setPlaying(state.status === 'playing'));
  }

  stop() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.length = 0;
  }
}
