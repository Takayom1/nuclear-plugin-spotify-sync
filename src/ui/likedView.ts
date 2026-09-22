// "Liked Songs" tab: the user's Spotify likes as a Spotify-style playlist page,
// plus the login flow shown while no account is connected.
import type { Library } from '../data/library';
import { t } from '../i18n';
import { pickImage, toNuclearTrack } from '../nuclear/mappers';
import { looksLikeCallback } from '../spotify/auth';
import type { LikedTrack } from '../spotify/types';
import { errorMessage, shuffled } from '../utils/async';
import {
  escapeHtml as esc,
  formatAddedAt,
  formatDuration,
  formatTotalDuration,
  formatTrackCount,
  formatUpdatedAgo,
  normalizeForSearch,
} from '../utils/format';
import { icons } from './icons';
import type { NowPlaying } from './nowPlaying';
import type { MenuItem } from './popups';
import { ensureStyles } from './styles';
import {
  openAlbum,
  openArtist,
  playTracks,
  toast,
  toggleLike,
  trackMenu,
  type ViewContext,
} from './trackActions';

type SortKey = 'added' | 'title' | 'artist' | 'album' | 'duration';

const SORT_LABELS: Record<SortKey, () => string> = {
  added: () => t('col.dateAdded'),
  title: () => t('col.title'),
  artist: () => t('col.artist'),
  album: () => t('col.album'),
  duration: () => t('col.duration'),
};

/** Rows are rendered in chunks as the user scrolls; libraries can be huge. */
const CHUNK = 120;

export class LikedView {
  private root: HTMLElement | null = null;
  private mode: 'setup' | 'library' | null = null;
  private query = '';
  private sort: { key: SortKey; dir: 1 | -1 } = { key: 'added', dir: -1 };
  private visible: LikedTrack[] = [];
  private uris = new Set<string>();
  private rendered = 0;
  private renderedTracks: readonly LikedTrack[] | null = null;
  private selectedUri: string | null = null;
  private searchKeys = new WeakMap<LikedTrack, string>();
  private sentinelObserver: IntersectionObserver | null = null;
  private clockTimer: number | undefined;
  private shown = false;
  private setupError: string | null = null;
  private setupBusy = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly ctx: ViewContext,
    private readonly library: Library,
    private readonly nowPlaying: NowPlaying,
  ) {}

  private get auth() {
    return this.ctx.auth;
  }

  mount(root: HTMLElement) {
    this.root = root;
    root.classList.add('nsp-root');
    ensureStyles();
    this.cleanups.push(
      this.library.subscribe(() => this.render()),
      this.auth.onChange(() => this.render()),
      this.nowPlaying.subscribe(() => this.renderNowPlaying()),
    );
    window.addEventListener('focus', this.onWindowFocus);
    this.cleanups.push(() => window.removeEventListener('focus', this.onWindowFocus));
    this.render();
  }

  destroy() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.length = 0;
    this.sentinelObserver?.disconnect();
    window.clearInterval(this.clockTimer);
    this.root?.replaceChildren();
    this.root = null;
  }

  /** Rebuilds everything, e.g. after the UI language changed. */
  rebuild() {
    this.mode = null;
    this.render();
  }

  show() {
    this.shown = true;
    this.render();
    window.clearInterval(this.clockTimer);
    this.clockTimer = window.setInterval(() => this.renderMeta(), 30000);
    const { fetchedAt } = this.library.state;
    if (this.auth.isLoggedIn() && (!fetchedAt || Date.now() - fetchedAt > 60000)) {
      void this.library.sync();
    }
  }

  hide() {
    this.shown = false;
    window.clearInterval(this.clockTimer);
    this.ctx.popups.closeMenu();
  }

  scrollToTop() {
    this.root?.parentElement?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private $<T extends Element = HTMLElement>(selector: string) {
    return this.root?.querySelector<T>(selector) ?? null;
  }

  // ---------------------------------------------------------------- render

  private render() {
    if (!this.root) {
      return;
    }
    const mode = this.auth.isLoggedIn() ? 'library' : 'setup';
    if (mode !== this.mode) {
      this.mode = mode;
      this.renderedTracks = null;
      this.sentinelObserver?.disconnect();
      if (mode === 'setup') {
        this.buildSetup();
      } else {
        this.buildLibrary();
      }
    }
    if (mode === 'setup') {
      this.updateSetup();
      return;
    }
    this.renderMeta();
    this.renderStatus();
    if (this.renderedTracks !== this.library.state.tracks) {
      this.renderedTracks = this.library.state.tracks;
      this.uris = this.library.likedUris();
      this.renderRows();
    }
    this.renderNowPlaying();
  }

  private hero(meta: string) {
    return `
      <section class="nsp-hero">
        <div class="nsp-cover">${icons.heartFilled(96)}</div>
        <div class="nsp-hero-text">
          <div class="nsp-kicker">${esc(t('liked.kicker'))}</div>
          <h1 class="nsp-title">${esc(t('liked.title'))}</h1>
          <div class="nsp-meta">${meta}</div>
        </div>
      </section>`;
  }

  private buildLibrary() {
    const root = this.root!;
    const playlistName = t('liked.playlistName');
    root.innerHTML = `
      ${this.hero('')}
      <div class="nsp-toolbar">
        <button class="nsp-btn nsp-play" data-tb="play" title="${esc(t('common.play'))}">${icons.play()}</button>
        <button class="nsp-btn is-icon" data-tb="shuffle" title="${esc(t('common.shufflePlay'))}">${icons.shuffle()}</button>
        <button class="nsp-btn is-icon" data-tb="refresh" title="${esc(t('liked.refresh'))}">${icons.refresh()}</button>
        <button class="nsp-btn" data-tb="playlist" title="${esc(t('liked.saveHint', { name: playlistName }))}">${icons.listPlus()}<span>${esc(t('common.saveToNuclear'))}</span></button>
        <div class="nsp-spacer"></div>
        <label class="nsp-search">${icons.search()}<input type="search" placeholder="${esc(t('liked.search'))}" spellcheck="false" /></label>
        <button class="nsp-btn is-icon" data-tb="more" title="${esc(t('common.more'))}">${icons.more()}</button>
      </div>
      <div class="nsp-status"></div>
      <div class="nsp-table">
        <div class="nsp-head">
          <div class="nsp-c-num">#</div>
          <div class="nsp-c-title"><button class="nsp-sort" data-sort="title">${esc(t('col.title'))}</button></div>
          <div class="nsp-c-album"><button class="nsp-sort" data-sort="album">${esc(t('col.album'))}</button></div>
          <div class="nsp-c-added"><button class="nsp-sort" data-sort="added">${esc(t('col.dateAdded'))}</button></div>
          <div></div>
          <div class="nsp-c-dur"><button class="nsp-sort" data-sort="duration" title="${esc(t('col.duration'))}">${icons.clock()}</button></div>
        </div>
        <div class="nsp-rows"></div>
        <div class="nsp-sentinel"></div>
      </div>
      <div class="nsp-empty" hidden></div>`;

    const search = this.$<HTMLInputElement>('.nsp-search input')!;
    search.value = this.query;
    search.addEventListener('input', () => {
      this.query = search.value;
      this.renderRows();
    });

    this.$('.nsp-toolbar')!.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-tb]');
      if (button) {
        this.onToolbar(button.dataset.tb!, button);
      }
    });
    this.$('.nsp-head')!.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-sort]');
      if (button) {
        this.toggleSort(button.dataset.sort as SortKey);
      }
    });

    const rows = this.$('.nsp-rows')!;
    rows.addEventListener('click', this.onRowsClick);
    rows.addEventListener('dblclick', this.onRowsDoubleClick);
    rows.addEventListener('contextmenu', this.onRowsContextMenu);

    this.sentinelObserver = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && this.renderMore(),
      { rootMargin: '800px 0px' },
    );
    this.sentinelObserver.observe(this.$('.nsp-sentinel')!);
  }

  private renderMeta() {
    const meta = this.$('.nsp-meta');
    if (!meta || this.mode !== 'library') {
      return;
    }
    const { user, tracks, fetchedAt, syncing } = this.library.state;
    const totalMs = tracks.reduce((sum, track) => sum + track.durationMs, 0);
    const parts: string[] = [];
    if (user) {
      const avatar = user.image ? `<img class="nsp-avatar" src="${esc(user.image)}" alt="" />` : '';
      parts.push(`${avatar}<b>${esc(user.displayName)}</b>`);
    }
    if (tracks.length) {
      parts.push(
        `<span>${esc(formatTrackCount(tracks.length))}, ${esc(formatTotalDuration(totalMs))}</span>`,
      );
    }
    parts.push(
      `<span class="nsp-sub">${esc(syncing ? t('common.syncing') : formatUpdatedAgo(fetchedAt))}</span>`,
    );
    meta.innerHTML = parts.join('<span class="nsp-dot">•</span>');
  }

  private renderStatus() {
    const status = this.$('.nsp-status');
    if (!status) {
      return;
    }
    const { progress, error, syncing } = this.library.state;
    let html = '';
    if (progress && progress.total > 0) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      const text = t('liked.progress', {
        loaded: progress.loaded.toLocaleString(),
        total: progress.total.toLocaleString(),
      });
      html += `<div class="nsp-progress">${esc(text)}<div class="nsp-progress-bar"><i style="width:${percent}%"></i></div></div>`;
    }
    if (error) {
      html += `<div class="nsp-banner"><span>${esc(error)}</span><button class="nsp-btn" data-status="retry">${icons.refresh(16)}${esc(t('common.retry'))}</button></div>`;
    }
    status.innerHTML = html;
    status.querySelector('[data-status="retry"]')?.addEventListener('click', () => {
      void this.library.sync({ full: true });
    });
    const refresh = this.$('[data-tb="refresh"]');
    refresh?.classList.toggle('nsp-spin', syncing);
    refresh?.toggleAttribute('disabled', syncing);
    this.renderEmpty();
  }

  private renderNowPlaying() {
    if (!this.root || this.mode !== 'library') {
      return;
    }
    const { currentUri, playing } = this.nowPlaying.state;
    this.root.classList.toggle('is-playing', playing);
    this.root.querySelectorAll<HTMLElement>('.nsp-row').forEach((row) => {
      row.classList.toggle('is-current', row.dataset.uri === currentUri);
    });
    const button = this.$('[data-tb="play"]');
    if (button) {
      const pause = playing && currentUri !== null && this.uris.has(currentUri);
      button.innerHTML = pause ? icons.pause() : icons.play();
      button.title = t(pause ? 'common.pause' : 'common.play');
      const empty = !this.library.state.tracks.length;
      button.toggleAttribute('disabled', empty);
      this.$('[data-tb="shuffle"]')?.toggleAttribute('disabled', empty);
      this.$('[data-tb="playlist"]')?.toggleAttribute('disabled', empty);
    }
  }

  // ------------------------------------------------------ filtering & rows

  private searchKey(track: LikedTrack) {
    let key = this.searchKeys.get(track);
    if (key === undefined) {
      key = normalizeForSearch(
        [track.name, track.album.name, ...track.artists.map((artist) => artist.name)].join(' '),
      );
      this.searchKeys.set(track, key);
    }
    return key;
  }

  private computeVisible(): LikedTrack[] {
    let list = [...this.library.state.tracks];
    const terms = normalizeForSearch(this.query).split(/\s+/).filter(Boolean);
    if (terms.length) {
      list = list.filter((track) => terms.every((term) => this.searchKey(track).includes(term)));
    }
    const { key, dir } = this.sort;
    if (key === 'added') {
      // Spotify returns the newest likes first; keep that order for ties.
      return dir === -1 ? list : list.reverse();
    }
    const value = (track: LikedTrack): string | number => {
      switch (key) {
        case 'title':
          return track.name;
        case 'artist':
          return track.artists[0]?.name ?? '';
        case 'album':
          return track.album.name;
        case 'duration':
          return track.durationMs;
      }
    };
    const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
    return list.sort((a, b) => {
      const left = value(a);
      const right = value(b);
      const result =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : collator.compare(String(left), String(right));
      return result * dir;
    });
  }

  private toggleSort(key: SortKey) {
    const defaultDir = key === 'added' ? -1 : 1;
    this.sort = { key, dir: this.sort.key === key ? (-this.sort.dir as 1 | -1) : defaultDir };
    this.renderRows();
  }

  private renderSortHeader() {
    this.root?.querySelectorAll<HTMLElement>('.nsp-sort').forEach((button) => {
      const active = button.dataset.sort === this.sort.key;
      button.classList.toggle('is-active', active);
      button.querySelector('.nsp-arrow')?.remove();
      if (active) {
        button.insertAdjacentHTML(
          'beforeend',
          `<span class="nsp-arrow">${this.sort.dir === 1 ? '▲' : '▼'}</span>`,
        );
      }
    });
  }

  private renderRows() {
    const rows = this.$('.nsp-rows');
    if (!rows) {
      return;
    }
    this.visible = this.computeVisible();
    this.rendered = 0;
    rows.innerHTML = '';
    this.renderMore();
    this.renderSortHeader();
    this.renderEmpty();
    this.renderMeta();
    this.renderNowPlaying();
  }

  private renderMore() {
    const rows = this.$('.nsp-rows');
    if (!rows || this.rendered >= this.visible.length) {
      return;
    }
    const end = Math.min(this.rendered + CHUNK, this.visible.length);
    let html = '';
    for (let i = this.rendered; i < end; i++) {
      html += this.rowHtml(this.visible[i], i);
    }
    rows.insertAdjacentHTML('beforeend', html);
    this.rendered = end;
  }

  private rowHtml(track: LikedTrack, index: number) {
    const image = pickImage(track.album.images, 64);
    const classes = ['nsp-row'];
    if (track.uri === this.nowPlaying.state.currentUri) classes.push('is-current');
    if (track.uri === this.selectedUri) classes.push('is-selected');
    const artists = track.artists
      .map(
        (artist, j) =>
          `<span class="nsp-link" data-act="artist" data-j="${j}">${esc(artist.name)}</span>`,
      )
      .join(', ');
    const explicit = track.explicit
      ? `<span class="nsp-explicit" title="${esc(t('common.explicit'))}">E</span>`
      : '';
    return `
      <div class="${classes.join(' ')}" data-i="${index}" data-uri="${esc(track.uri)}">
        <div class="nsp-c-num"><span class="nsp-num">${index + 1}</span><span class="nsp-eq"><i></i><i></i><i></i></span><button class="nsp-rowplay" data-act="play" title="${esc(t('common.play'))}">${icons.play(16)}</button></div>
        <div class="nsp-c-title">
          ${image ? `<img class="nsp-thumb" src="${esc(image)}" loading="lazy" alt="" />` : `<div class="nsp-thumb is-empty">${icons.disc(18)}</div>`}
          <div class="nsp-tt">
            <div class="nsp-name" title="${esc(track.name)}">${explicit}${esc(track.name)}</div>
            <div class="nsp-artists">${artists}</div>
          </div>
        </div>
        <div class="nsp-c-album">${track.album.name ? `<span class="nsp-link" data-act="album" title="${esc(track.album.name)}">${esc(track.album.name)}</span>` : ''}</div>
        <div class="nsp-c-added" title="${esc(new Date(track.addedAt).toLocaleString())}">${esc(formatAddedAt(track.addedAt))}</div>
        <div class="nsp-c-like"><button class="nsp-heart" data-act="unlike" title="${esc(t('menu.unlike'))}" ${track.isLocal ? 'disabled' : ''}>${icons.heartFilled(18)}</button></div>
        <div class="nsp-c-dur">${formatDuration(track.durationMs)}<button class="nsp-more" data-act="menu" title="${esc(t('common.more'))}">${icons.more(16)}</button></div>
      </div>`;
  }

  private renderEmpty() {
    const empty = this.$('.nsp-empty');
    if (!empty) {
      return;
    }
    const { tracks, syncing, fetchedAt, error } = this.library.state;
    let title = '';
    let hint = '';
    if (!tracks.length && syncing) {
      [title, hint] = [t('liked.loadingTitle'), t('liked.loadingHint')];
    } else if (!tracks.length && fetchedAt && !error) {
      [title, hint] = [t('liked.emptyTitle'), t('liked.emptyHint')];
    } else if (tracks.length && !this.visible.length) {
      [title, hint] = [t('liked.noResultsTitle'), t('liked.noResultsHint', { query: this.query })];
    }
    empty.innerHTML = title ? `<h3>${esc(title)}</h3><p>${esc(hint)}</p>` : '';
    empty.hidden = !title;
    this.$('.nsp-head')?.toggleAttribute('hidden', !this.visible.length);
  }

  // --------------------------------------------------------------- actions

  private playVisible(index: number, list = this.visible) {
    return playTracks(this.ctx, list.map(toNuclearTrack), index);
  }

  private onToolbar(action: string, button: HTMLElement) {
    switch (action) {
      case 'play': {
        const { currentUri } = this.nowPlaying.state;
        if (currentUri && this.uris.has(currentUri)) {
          void this.ctx.api.Playback.toggle();
        } else {
          void this.playVisible(0);
        }
        break;
      }
      case 'shuffle':
        void this.playVisible(0, shuffled(this.visible));
        break;
      case 'refresh':
        void this.library.sync({ full: true });
        break;
      case 'playlist':
        void this.saveToPlaylist();
        break;
      case 'more': {
        const rect = button.getBoundingClientRect();
        this.ctx.popups.openMenu(rect.right, rect.bottom + 6, this.moreMenu(), true);
        break;
      }
    }
  }

  private async saveToPlaylist() {
    const button = this.$<HTMLButtonElement>('[data-tb="playlist"]');
    button?.setAttribute('disabled', '');
    try {
      await this.library.saveToPlaylist();
      toast(
        this.ctx,
        t('toast.playlistUpdated', {
          name: t('liked.playlistName'),
          tracks: formatTrackCount(this.library.state.tracks.length),
        }),
      );
    } catch (error) {
      toast(this.ctx, t('toast.playlistFailed', { error: errorMessage(error) }));
    } finally {
      button?.removeAttribute('disabled');
    }
  }

  private moreMenu(): MenuItem[] {
    const sortItems: MenuItem[] = (Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
      icon: this.sort.key === key ? (this.sort.dir === 1 ? '▲' : '▼') : '',
      label: t('liked.sortBy', { field: SORT_LABELS[key]() }),
      run: () => this.toggleSort(key),
    }));
    const { user } = this.library.state;
    return [
      ...sortItems,
      'separator',
      {
        icon: icons.refresh(16),
        label: t('liked.reloadAll'),
        run: () => this.library.sync({ full: true }),
      },
      {
        icon: icons.listPlus(16),
        label: t('liked.saveAs', { name: t('liked.playlistName') }),
        run: () => this.saveToPlaylist(),
      },
      {
        icon: icons.queue(16),
        label: t('liked.queueAll'),
        run: async () => {
          await this.ctx.api.Queue.addToQueue(this.visible.map(toNuclearTrack));
          toast(this.ctx, t('toast.queuedAll', { tracks: formatTrackCount(this.visible.length) }));
        },
      },
      'separator',
      {
        icon: icons.logOut(16),
        label: user ? t('liked.logoutAs', { name: user.displayName }) : t('liked.logout'),
        run: async () => {
          await this.auth.logout();
          await this.library.clear();
        },
      },
    ];
  }

  private rowTrack(row: HTMLElement) {
    return this.visible[Number(row.dataset.i)];
  }

  private selectRow(row: HTMLElement) {
    this.root
      ?.querySelectorAll('.nsp-row.is-selected')
      .forEach((element) => element.classList.remove('is-selected'));
    row.classList.add('is-selected');
    this.selectedUri = row.dataset.uri ?? null;
  }

  private onRowsClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const row = target.closest<HTMLElement>('.nsp-row');
    const track = row && this.rowTrack(row);
    if (!row || !track) {
      return;
    }
    this.selectRow(row);
    const action = target.closest<HTMLElement>('[data-act]');
    const nuclearTrack = toNuclearTrack(track);
    switch (action?.dataset.act) {
      case 'play':
        if (track.uri === this.nowPlaying.state.currentUri) {
          void this.ctx.api.Playback.toggle();
        } else {
          void this.playVisible(Number(row.dataset.i));
        }
        break;
      case 'artist':
        openArtist(this.ctx, nuclearTrack, Number(action.dataset.j));
        break;
      case 'album':
        openAlbum(this.ctx, nuclearTrack);
        break;
      case 'unlike':
        void toggleLike(this.ctx, nuclearTrack);
        break;
      case 'menu': {
        const rect = action.getBoundingClientRect();
        this.openTrackMenu(track, rect.right, rect.bottom + 4, true);
        break;
      }
    }
  };

  private openTrackMenu(track: LikedTrack, x: number, y: number, alignRight = false) {
    const items = trackMenu(this.ctx, toNuclearTrack(track), () =>
      this.playVisible(this.visible.indexOf(track)),
    );
    this.ctx.popups.openMenu(x, y, items, alignRight);
  }

  private onRowsDoubleClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const row = target.closest<HTMLElement>('.nsp-row');
    if (row && !target.closest('[data-act]')) {
      void this.playVisible(Number(row.dataset.i));
    }
  };

  private onRowsContextMenu = (event: MouseEvent) => {
    const row = (event.target as Element).closest<HTMLElement>('.nsp-row');
    const track = row && this.rowTrack(row);
    if (!row || !track) {
      return;
    }
    event.preventDefault();
    this.selectRow(row);
    this.openTrackMenu(track, event.clientX, event.clientY);
  };

  // ----------------------------------------------------------------- setup

  private buildSetup() {
    const root = this.root!;
    const step = (number: number, title: string, body: string, attrs = '') => `
      <div class="nsp-step" ${attrs}>
        <div class="nsp-step-num">${number}</div>
        <div class="nsp-step-body"><h4>${esc(title)}</h4>${body}</div>
      </div>`;
    root.innerHTML = `
      ${this.hero(`<span>${esc(t('setup.meta'))}</span>`)}
      <div class="nsp-setup">
        <p>${esc(t('setup.intro'))}</p>
        ${step(
          1,
          t('setup.step1.title'),
          `<ol>${t('setup.step1.html')}</ol>
           <div class="nsp-row-inline"><button class="nsp-btn" data-setup="dashboard">${icons.external(16)}${esc(t('setup.step1.open'))}</button></div>
           <div class="nsp-hint">${esc(t('setup.step1.hint'))}</div>`,
        )}
        ${step(
          2,
          t('setup.step2.title'),
          `<div class="nsp-row-inline"><code class="nsp-code" data-setup="redirect"></code><button class="nsp-btn" data-setup="copy-redirect">${icons.copy(16)}${esc(t('common.copy'))}</button></div>
           <div class="nsp-hint">${esc(t('setup.step2.hint'))}</div>`,
        )}
        ${step(
          3,
          t('setup.step3.title'),
          `<div class="nsp-row-inline"><input class="nsp-input" data-setup="client-id" placeholder="${esc(t('setup.step3.placeholder'))}" spellcheck="false" autocomplete="off" /></div>`,
        )}
        ${step(
          4,
          t('setup.step4.title'),
          `<div class="nsp-row-inline"><button class="nsp-btn is-spotify" data-setup="login">${icons.spotify(16)}${esc(t('setup.step4.button'))}</button></div>
           <div class="nsp-hint">${esc(t('setup.step4.hint'))}</div>`,
        )}
        ${step(
          5,
          t('setup.step5.title'),
          `<div data-setup="step5-text"></div>
           <div class="nsp-row-inline"><input class="nsp-input" data-setup="callback" placeholder="http://127.0.0.1:8888/callback?code=…" spellcheck="false" autocomplete="off" /><button class="nsp-btn is-primary" data-setup="finish">${esc(t('setup.step5.button'))}</button></div>
           <div class="nsp-hint">${esc(t('setup.step5.hint'))}</div>`,
          'data-setup="step5"',
        )}
        <div class="nsp-error" data-setup="error" hidden></div>
      </div>`;

    void this.auth.getRedirectUri().then((uri) => {
      root.querySelector('[data-setup="redirect"]')!.textContent = uri;
      root.querySelector('[data-setup="step5-text"]')!.innerHTML = t('setup.step5.html', {
        uri: esc(uri),
      });
    });

    const clientInput = root.querySelector<HTMLInputElement>('[data-setup="client-id"]')!;
    void this.auth.getClientId().then((id) => {
      clientInput.value ||= id;
    });
    let saveTimer: number | undefined;
    clientInput.addEventListener('input', () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => void this.auth.setClientId(clientInput.value), 300);
    });

    const callbackInput = root.querySelector<HTMLInputElement>('[data-setup="callback"]')!;
    callbackInput.addEventListener('paste', () =>
      setTimeout(() => {
        if (looksLikeCallback(callbackInput.value)) {
          void this.finishLogin(callbackInput.value);
        }
      }),
    );
    callbackInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        void this.finishLogin(callbackInput.value);
      }
    });

    root.querySelector('.nsp-setup')!.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLElement>('button[data-setup]');
      switch (button?.dataset.setup) {
        case 'dashboard':
          void this.ctx.api.Shell.openExternal('https://developer.spotify.com/dashboard');
          break;
        case 'copy-redirect':
          void this.auth.getRedirectUri().then(async (uri) => {
            await navigator.clipboard.writeText(uri);
            toast(this.ctx, t('toast.redirectCopied'));
          });
          break;
        case 'login':
          void this.startLogin(clientInput.value);
          break;
        case 'finish':
          void this.finishLogin(callbackInput.value);
          break;
      }
    });
  }

  private updateSetup() {
    const pending = this.auth.hasPendingLogin();
    this.$('[data-setup="step5"]')?.classList.toggle('is-disabled', !pending);
    this.$('[data-setup="login"]')?.toggleAttribute('disabled', this.setupBusy);
    this.$('[data-setup="finish"]')?.toggleAttribute('disabled', this.setupBusy || !pending);
    const error = this.$('[data-setup="error"]');
    if (error) {
      error.textContent = this.setupError ?? this.library.state.error ?? '';
      error.hidden = !error.textContent;
    }
  }

  private async startLogin(clientId: string) {
    this.setupError = null;
    try {
      await this.auth.setClientId(clientId);
      await this.auth.beginLogin();
    } catch (error) {
      this.setupError = errorMessage(error);
    }
    this.updateSetup();
    this.$<HTMLInputElement>('[data-setup="callback"]')?.focus();
  }

  private async finishLogin(input: string) {
    if (this.setupBusy || !input.trim()) {
      return;
    }
    this.setupBusy = true;
    this.setupError = null;
    this.updateSetup();
    try {
      await this.auth.completeLogin(input);
      toast(this.ctx, t('toast.connected'));
      void this.library.sync({ full: true });
    } catch (error) {
      this.setupError = errorMessage(error);
    } finally {
      this.setupBusy = false;
      this.render();
    }
  }

  /** While a login is pending, picks the redirect URL up from the clipboard. */
  private onWindowFocus = async () => {
    if (!this.shown || this.mode !== 'setup' || !this.auth.hasPendingLogin() || this.setupBusy) {
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (looksLikeCallback(text)) {
        const input = this.$<HTMLInputElement>('[data-setup="callback"]');
        if (input) {
          input.value = text;
        }
        await this.finishLogin(text);
      }
    } catch {
      // Clipboard access denied — the user can paste manually.
    }
  };
}
