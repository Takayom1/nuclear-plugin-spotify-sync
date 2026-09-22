// "Spotify" tab: greeting, personal mixes, new releases and charts, with an
// in-tab page for any playlist or release.
import type { Track } from '@nuclearplayer/plugin-sdk';

import type { Home, HomePlaylist } from '../data/home';
import type { Library } from '../data/library';
import { intlLocale, t, type MessageKey } from '../i18n';
import { buildPlaylist, pickImage, trackThumbnail } from '../nuclear/mappers';
import type { SpotifyRelease } from '../spotify/types';
import { errorMessage, shuffled } from '../utils/async';
import {
  escapeHtml as esc,
  formatDuration,
  formatReleaseDate,
  formatTotalDuration,
  formatTrackCount,
} from '../utils/format';
import { icons } from './icons';
import type { NowPlaying } from './nowPlaying';
import { ensureStyles } from './styles';
import {
  canOpenAlbumPages,
  openAlbum,
  openAlbumUri,
  openArtist,
  playTracks,
  saveAsNuclearPlaylist,
  toast,
  toggleLike,
  trackMenu,
  type ViewContext,
} from './trackActions';

type Detail = {
  key: string;
  kicker: string;
  title: string;
  description: string;
  image: string | null;
  tracks: Track[] | null;
  error: string | null;
  spotifyUrl: string | null;
  albumUri: string | null;
};

const RELEASES_PREVIEW = 12;
const CHART_PREVIEW = 10;

const greetingKey = (hour: number): MessageKey => {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 18) return 'home.greeting.afternoon';
  if (hour >= 18 && hour < 23) return 'home.greeting.evening';
  return 'home.greeting.night';
};

const releaseTypeLabel = (type: string) => {
  switch (type) {
    case 'single':
      return t('home.releaseType.single');
    case 'album':
      return t('home.releaseType.album');
    case 'compilation':
      return t('home.releaseType.compilation');
    default:
      return t('home.releaseType.other');
  }
};

export class HomeView {
  private root: HTMLElement | null = null;
  private detail: Detail | null = null;
  private homeScroll = 0;
  private chartTab = 0;
  private showAllReleases = false;
  private showFullChart = false;
  /** Card/page that started the current playback, to show a pause button on it. */
  private activeCollection: string | null = null;
  private readonly lists = new Map<string, Track[]>();
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly ctx: ViewContext,
    private readonly home: Home,
    private readonly library: Library,
    private readonly nowPlaying: NowPlaying,
    private readonly openLikedTab: () => void,
  ) {}

  mount(root: HTMLElement) {
    this.root = root;
    root.classList.add('nsp-root');
    ensureStyles();
    this.cleanups.push(
      this.home.subscribe(() => this.render()),
      this.library.subscribe(() => this.renderLiked()),
      this.ctx.auth.onChange(() => this.render()),
      this.nowPlaying.subscribe(() => this.renderNowPlaying()),
    );
    root.addEventListener('click', this.onClick);
    root.addEventListener('dblclick', this.onDoubleClick);
    root.addEventListener('contextmenu', this.onContextMenu);
    this.render();
  }

  destroy() {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups.length = 0;
    this.root?.removeEventListener('click', this.onClick);
    this.root?.removeEventListener('dblclick', this.onDoubleClick);
    this.root?.removeEventListener('contextmenu', this.onContextMenu);
    this.root?.replaceChildren();
    this.root = null;
  }

  /** Rebuilds everything, e.g. after the UI language changed. */
  rebuild() {
    if (this.root) {
      this.root.innerHTML = '';
      this.render();
    }
  }

  show() {
    this.render();
    void this.home.load();
  }

  hide() {
    this.ctx.popups.closeMenu();
  }

  /** Clicking the active tab again: leave a detail page, or scroll to the top. */
  reselect() {
    if (this.detail) {
      this.closeDetail();
    } else {
      this.scroller()?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private scroller() {
    return this.root?.parentElement ?? null;
  }

  private render() {
    if (!this.root) {
      return;
    }
    if (this.detail) {
      this.renderDetail();
    } else {
      this.renderHome();
    }
  }

  // --------------------------------------------------------------- home page

  private renderHome() {
    const root = this.root!;
    if (!root.querySelector('.nsph-page')) {
      root.innerHTML = `
        <div class="nsph-page">
          <header class="nsph-greeting">
            <div>
              <h1></h1>
              <div class="nsp-sub nsph-greeting-sub">${esc(t('home.subtitle'))}</div>
            </div>
            <button class="nsp-btn is-icon" data-act="reload" title="${esc(t('home.reloadAll'))}">${icons.refresh()}</button>
          </header>
          <div class="nsph-banners"></div>
          <section>
            <div class="nsph-section-head"><h2>${esc(t('home.mixes'))}</h2><span class="nsp-sub nsph-note" data-note="mixes"></span></div>
            <div class="nsph-grid" data-grid="mixes"></div>
            <div class="nsph-add">
              <input class="nsp-input" data-input="mix-link" placeholder="${esc(t('home.addMixPlaceholder'))}" spellcheck="false" />
              <button class="nsp-btn" data-act="add-mix">${esc(t('common.add'))}</button>
            </div>
          </section>
          <section>
            <div class="nsph-section-head"><h2>${esc(t('home.releases'))}</h2><span class="nsp-sub nsph-note" data-note="releases"></span></div>
            <div class="nsph-grid" data-grid="releases"></div>
            <div class="nsph-more" data-more="releases"></div>
          </section>
          <section>
            <div class="nsph-section-head"><h2>${esc(t('home.charts'))}</h2><span class="nsp-sub nsph-note" data-note="charts"></span></div>
            <div class="nsph-grid is-wide" data-grid="charts"></div>
            <div class="nsph-tabs" data-tabs="charts"></div>
            <div class="nsp-table nsph-table" data-table="chart"></div>
            <div class="nsph-more" data-more="chart"></div>
          </section>
        </div>`;
      const input = root.querySelector<HTMLInputElement>('[data-input="mix-link"]')!;
      input.addEventListener('keydown', (event) => event.key === 'Enter' && void this.addMix());
      input.addEventListener('paste', () => setTimeout(() => void this.addMix()));
    }
    this.renderGreeting();
    this.renderBanners();
    this.renderMixes();
    this.renderReleases();
    this.renderCharts();
    this.renderNowPlaying();
  }

  private renderBanners() {
    const banners: string[] = [];
    if (this.home.state.providerMissing) {
      banners.push(`<div class="nsp-banner"><span>${t('home.bannerProvider')}</span></div>`);
    }
    if (!this.ctx.auth.isLoggedIn()) {
      banners.push(
        `<div class="nsp-banner is-info"><span>${esc(t('home.bannerLogin'))}</span><button class="nsp-btn is-spotify" data-act="login">${esc(t('home.login'))}</button></div>`,
      );
    } else if (this.home.state.needsRelogin) {
      banners.push(
        `<div class="nsp-banner is-info"><span>${esc(t('home.bannerRelogin'))}</span><button class="nsp-btn is-spotify" data-act="relogin">${esc(t('home.relogin'))}</button></div>`,
      );
    }
    this.root!.querySelector('.nsph-banners')!.innerHTML = banners.join('');
  }

  private cardHtml(card: {
    key: string;
    title: string;
    subtitleHtml: string;
    image: string | null;
    removable?: boolean;
  }) {
    const image = card.image
      ? `<img src="${esc(card.image)}" loading="lazy" alt="" />`
      : `<div class="nsph-card-fallback">${icons.disc(40)}</div>`;
    const remove = card.removable
      ? `<button class="nsph-card-remove" data-act="remove-mix" title="${esc(t('home.removeMix'))}">${icons.x(14)}</button>`
      : '';
    return `
      <div class="nsph-card" data-card="${esc(card.key)}" tabindex="0">
        <div class="nsph-card-img">${image}
          <button class="nsph-card-play" data-act="card-play" title="${esc(t('common.play'))}">${icons.play(20)}</button>
        </div>
        <div class="nsph-card-title" title="${esc(card.title)}">${esc(card.title)}</div>
        <div class="nsph-card-sub">${card.subtitleHtml}</div>
        ${remove}
      </div>`;
  }

  private skeletons(count: number) {
    return `<div class="nsph-card is-skeleton"><div class="nsph-card-img"></div><div class="nsph-card-title">&nbsp;</div><div class="nsph-card-sub">&nbsp;</div></div>`.repeat(
      count,
    );
  }

  private setNote(name: string, text: string) {
    const note = this.root!.querySelector(`[data-note="${name}"]`);
    if (note) {
      note.textContent = text;
    }
  }

  private emptyHtml(html: string) {
    return `<div class="nsph-empty">${html}</div>`;
  }

  private renderMixes() {
    const grid = this.root!.querySelector('[data-grid="mixes"]')!;
    const { items, loading, error } = this.home.state.mixes;
    this.setNote('mixes', loading ? t('common.updating') : '');
    if (!items.length) {
      grid.innerHTML = loading
        ? this.skeletons(6)
        : this.emptyHtml(error ? esc(error) : t('home.mixesEmpty'));
      return;
    }
    grid.innerHTML = items
      .map((mix) =>
        this.cardHtml({
          key: `mix:${mix.id}`,
          title: mix.name,
          subtitleHtml: esc(mix.error ?? (mix.description || formatTrackCount(mix.tracks.length))),
          image: mix.image,
          removable: true,
        }),
      )
      .join('');
  }

  private renderReleases() {
    const grid = this.root!.querySelector('[data-grid="releases"]')!;
    const more = this.root!.querySelector('[data-more="releases"]')!;
    const { items, loading, error, progress } = this.home.state.releases;
    this.setNote(
      'releases',
      progress
        ? t('home.checkingArtists', { done: progress.done, total: progress.total })
        : loading
          ? t('common.updating')
          : '',
    );
    more.innerHTML = '';
    if (!this.ctx.auth.isLoggedIn()) {
      grid.innerHTML = this.emptyHtml(esc(t('home.releasesLoggedOut')));
      return;
    }
    if (!items.length) {
      grid.innerHTML = loading
        ? this.skeletons(6)
        : this.emptyHtml(esc(error ?? t('home.releasesEmpty')));
      return;
    }
    const visible = this.showAllReleases ? items : items.slice(0, RELEASES_PREVIEW);
    grid.innerHTML = visible
      .map((release) =>
        this.cardHtml({
          key: `release:${release.id}`,
          title: release.name,
          subtitleHtml: `${esc(releaseTypeLabel(release.type))} · ${esc(release.artists.map((artist) => artist.name).join(', '))}<br>${esc(formatReleaseDate(release.releaseDate))}`,
          image: pickImage(release.images, 300),
        }),
      )
      .join('');
    if (items.length > RELEASES_PREVIEW) {
      const label = this.showAllReleases
        ? t('home.showLess')
        : t('home.showAll', { count: items.length });
      more.innerHTML = `<button class="nsph-link-btn" data-act="toggle-releases">${esc(label)}</button>`;
    }
  }

  private renderCharts() {
    const root = this.root!;
    const grid = root.querySelector('[data-grid="charts"]')!;
    const tabs = root.querySelector('[data-tabs="charts"]')!;
    const table = root.querySelector('[data-table="chart"]')!;
    const more = root.querySelector('[data-more="chart"]')!;
    const { items, loading, error } = this.home.state.charts;
    this.setNote('charts', loading ? t('common.updating') : '');
    tabs.innerHTML = '';
    table.innerHTML = '';
    more.innerHTML = '';
    if (!items.length) {
      grid.innerHTML = loading
        ? this.skeletons(2)
        : this.emptyHtml(esc(error ?? t('home.chartsEmpty')));
      return;
    }
    grid.innerHTML = items
      .map((chart) =>
        this.cardHtml({
          key: `chart:${chart.id}`,
          title: chart.name,
          subtitleHtml: esc(chart.error ?? chart.description),
          image: chart.image,
        }),
      )
      .join('');
    this.chartTab = Math.min(this.chartTab, items.length - 1);
    tabs.innerHTML = items
      .map(
        (chart, index) =>
          `<button class="nsph-tab ${index === this.chartTab ? 'is-active' : ''}" data-act="chart-tab" data-index="${index}">${esc(chart.name)}</button>`,
      )
      .join('');
    const chart = items[this.chartTab];
    this.lists.set('chart', chart.tracks);
    const shown = this.showFullChart ? chart.tracks : chart.tracks.slice(0, CHART_PREVIEW);
    table.innerHTML = chart.tracks.length
      ? this.tableHtml('chart', shown, `chart:${chart.id}`, false)
      : this.emptyHtml(esc(chart.error ?? t('home.empty')));
    if (chart.tracks.length > CHART_PREVIEW) {
      const label = this.showFullChart
        ? t('home.showLess')
        : t('home.showAll', { count: chart.tracks.length });
      more.innerHTML = `<button class="nsph-link-btn" data-act="toggle-chart">${esc(label)}</button>`;
    }
  }

  // -------------------------------------------------------------- track table

  private tableHtml(listKey: string, tracks: Track[], collection: string, showHead: boolean) {
    const liked = this.library.likedUris();
    const { currentUri } = this.nowPlaying.state;
    const head = showHead
      ? `<div class="nsp-head nsph-head"><div class="nsp-c-num">#</div><div>${esc(t('col.title'))}</div><div class="nsp-c-album">${esc(t('col.album'))}</div><div></div><div class="nsp-c-dur">${icons.clock()}</div></div>`
      : '';
    const rows = tracks.map((track, index) => {
      const uri = track.source.id;
      const image = trackThumbnail(track);
      const isLiked = liked.has(uri);
      const artists = track.artists
        .map(
          (artist, j) =>
            `<span class="nsp-link" data-act="artist" data-j="${j}">${esc(artist.name)}</span>`,
        )
        .join(', ');
      const likeLabel = t(isLiked ? 'menu.unlike' : 'menu.like');
      return `
        <div class="nsp-row nsph-row ${uri === currentUri ? 'is-current' : ''} ${isLiked ? 'is-liked' : ''}" data-list="${listKey}" data-collection="${esc(collection)}" data-i="${index}" data-uri="${esc(uri)}">
          <div class="nsp-c-num"><span class="nsp-num">${index + 1}</span><span class="nsp-eq"><i></i><i></i><i></i></span><button class="nsp-rowplay" data-act="row-play" title="${esc(t('common.play'))}">${icons.play(16)}</button></div>
          <div class="nsp-c-title">
            ${image ? `<img class="nsp-thumb" src="${esc(image)}" loading="lazy" alt="" />` : `<div class="nsp-thumb is-empty">${icons.disc(18)}</div>`}
            <div class="nsp-tt"><div class="nsp-name" title="${esc(track.title)}">${esc(track.title)}</div><div class="nsp-artists">${artists}</div></div>
          </div>
          <div class="nsp-c-album">${track.album?.title ? `<span class="nsp-link" data-act="album" title="${esc(track.album.title)}">${esc(track.album.title)}</span>` : ''}</div>
          <div class="nsp-c-like"><button class="nsp-heart nsph-heart" data-act="like" title="${esc(likeLabel)}">${isLiked ? icons.heartFilled(18) : icons.heart(18)}</button></div>
          <div class="nsp-c-dur">${track.durationMs ? formatDuration(track.durationMs) : ''}<button class="nsp-more" data-act="menu" title="${esc(t('common.more'))}">${icons.more(16)}</button></div>
        </div>`;
    });
    return head + rows.join('');
  }

  /** Refreshes heart icons after Liked Songs changed. */
  private renderLiked() {
    const liked = this.library.likedUris();
    this.root?.querySelectorAll<HTMLElement>('.nsph-row').forEach((row) => {
      const isLiked = liked.has(row.dataset.uri ?? '');
      if (row.classList.contains('is-liked') === isLiked) {
        return;
      }
      row.classList.toggle('is-liked', isLiked);
      const heart = row.querySelector('.nsph-heart');
      if (heart) {
        heart.innerHTML = isLiked ? icons.heartFilled(18) : icons.heart(18);
        heart.setAttribute('title', t(isLiked ? 'menu.unlike' : 'menu.like'));
      }
    });
    this.renderGreeting();
  }

  private renderGreeting() {
    const heading = this.root?.querySelector('.nsph-greeting h1');
    if (!heading) {
      return;
    }
    const greeting = t(greetingKey(new Date().getHours()));
    const name = this.library.state.user?.displayName;
    heading.textContent = name ? t('home.greetingName', { greeting, name }) : greeting;
  }

  // ------------------------------------------------------------- detail page

  private openPlaylist(playlist: HomePlaylist) {
    this.openDetail({
      key: `${playlist.kind}:${playlist.id}`,
      kicker: t(playlist.kind === 'chart' ? 'home.kicker.chart' : 'home.kicker.mix'),
      title: playlist.name,
      description: playlist.description,
      image: playlist.image,
      tracks: playlist.error ? null : playlist.tracks,
      error: playlist.error ?? null,
      spotifyUrl: playlist.url,
      albumUri: null,
    });
  }

  private async openRelease(release: SpotifyRelease) {
    const key = `release:${release.id}`;
    this.openDetail({
      key,
      kicker: `${releaseTypeLabel(release.type)} · ${formatReleaseDate(release.releaseDate)}`,
      title: release.name,
      description: release.artists.map((artist) => artist.name).join(', '),
      image: pickImage(release.images, 600),
      tracks: null,
      error: null,
      spotifyUrl: `https://open.spotify.com/album/${release.id}`,
      albumUri: release.uri,
    });
    try {
      const tracks = await this.home.releaseTracks(release);
      if (this.detail?.key === key) {
        this.detail = { ...this.detail, tracks };
        this.renderDetail();
      }
    } catch (error) {
      if (this.detail?.key === key) {
        this.detail = { ...this.detail, error: errorMessage(error) };
        this.renderDetail();
      }
    }
  }

  private openDetail(detail: Detail) {
    this.homeScroll = this.scroller()?.scrollTop ?? 0;
    this.detail = detail;
    this.renderDetail();
    this.scroller()?.scrollTo({ top: 0 });
  }

  private closeDetail() {
    this.detail = null;
    this.lists.delete('detail');
    this.root!.innerHTML = '';
    this.renderHome();
    this.scroller()?.scrollTo({ top: this.homeScroll });
  }

  private renderDetail() {
    const detail = this.detail!;
    const tracks = detail.tracks ?? [];
    this.lists.set('detail', tracks);
    const totalMs = tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0);
    const meta = detail.tracks
      ? `${formatTrackCount(tracks.length)}${totalMs ? `, ${formatTotalDuration(totalMs)}` : ''}`
      : detail.error
        ? ''
        : t('home.loadingTracks');
    const disabled = tracks.length ? '' : 'disabled';
    const cover = detail.image
      ? `<div class="nsp-cover has-image"><img src="${esc(detail.image)}" alt="" /></div>`
      : `<div class="nsp-cover">${icons.disc(96)}</div>`;
    const albumButton =
      detail.albumUri && canOpenAlbumPages(this.ctx)
        ? `<button class="nsp-btn" data-act="detail-album">${icons.disc(18)}<span>${esc(t('home.albumPage'))}</span></button>`
        : '';
    const spotifyButton = detail.spotifyUrl
      ? `<button class="nsp-btn is-icon" data-act="detail-spotify" title="${esc(t('common.openInSpotify'))}">${icons.external(18)}</button>`
      : '';
    this.root!.innerHTML = `
      <div class="nsph-detail">
        <div class="nsph-detail-nav"><button class="nsp-btn" data-act="back">${esc(t('common.back'))}</button></div>
        <section class="nsp-hero">
          ${cover}
          <div class="nsp-hero-text">
            <div class="nsp-kicker">${esc(detail.kicker)}</div>
            <h1 class="nsp-title">${esc(detail.title)}</h1>
            ${detail.description ? `<div class="nsph-detail-desc">${esc(detail.description)}</div>` : ''}
            <div class="nsp-meta">${esc(meta)}</div>
          </div>
        </section>
        <div class="nsp-toolbar">
          <button class="nsp-btn nsp-play" data-act="detail-play" title="${esc(t('common.play'))}" ${disabled}>${icons.play()}</button>
          <button class="nsp-btn is-icon" data-act="detail-shuffle" title="${esc(t('common.shufflePlay'))}" ${disabled}>${icons.shuffle()}</button>
          <button class="nsp-btn" data-act="detail-save" ${disabled}>${icons.listPlus()}<span>${esc(t('common.saveToNuclear'))}</span></button>
          ${albumButton}
          ${spotifyButton}
        </div>
        ${detail.error ? `<div class="nsp-banner"><span>${esc(detail.error)}</span></div>` : ''}
        <div class="nsp-table nsph-table">${tracks.length ? this.tableHtml('detail', tracks, detail.key, true) : ''}</div>
      </div>`;
    this.renderNowPlaying();
  }

  // --------------------------------------------------------------- playback

  private async play(tracks: Track[], index: number, collection: string) {
    this.activeCollection = collection;
    await playTracks(this.ctx, tracks, index);
  }

  private collectionTracks(key: string): Track[] | null {
    const id = key.slice(key.indexOf(':') + 1);
    if (key.startsWith('mix:')) {
      return this.home.state.mixes.items.find((mix) => mix.id === id)?.tracks ?? null;
    }
    if (key.startsWith('chart:')) {
      return this.home.state.charts.items.find((chart) => chart.id === id)?.tracks ?? null;
    }
    return this.detail?.key === key ? this.detail.tracks : null;
  }

  private isCollectionPlaying(key: string) {
    const { playing, currentUri } = this.nowPlaying.state;
    return playing && currentUri !== null && this.activeCollection === key;
  }

  private async playCollection(key: string, shuffle = false) {
    if (!shuffle && this.activeCollection === key && this.nowPlaying.state.currentUri) {
      void this.ctx.api.Playback.toggle();
      return;
    }
    let tracks = this.collectionTracks(key);
    if (!tracks && key.startsWith('release:')) {
      const release = this.home.state.releases.items.find((item) => `release:${item.id}` === key);
      if (release) {
        try {
          tracks = await this.home.releaseTracks(release);
        } catch (error) {
          toast(this.ctx, t('home.releaseFailed', { error: errorMessage(error) }));
          return;
        }
      }
    }
    const list = tracks ?? [];
    await this.play(shuffle ? shuffled(list) : list, 0, key);
  }

  private renderNowPlaying() {
    if (!this.root) {
      return;
    }
    const { currentUri, playing } = this.nowPlaying.state;
    if (!currentUri) {
      this.activeCollection = null;
    }
    this.root.classList.toggle('is-playing', playing);
    this.root.querySelectorAll<HTMLElement>('.nsph-row').forEach((row) => {
      row.classList.toggle('is-current', row.dataset.uri === currentUri);
    });
    this.root.querySelectorAll<HTMLElement>('.nsph-card[data-card]').forEach((card) => {
      const active = this.isCollectionPlaying(card.dataset.card!);
      card.classList.toggle('is-playing', active);
      const button = card.querySelector('.nsph-card-play');
      if (button) {
        button.innerHTML = active ? icons.pause(20) : icons.play(20);
      }
    });
    if (this.detail) {
      const button = this.root.querySelector('[data-act="detail-play"]');
      if (button) {
        button.innerHTML = this.isCollectionPlaying(this.detail.key) ? icons.pause() : icons.play();
      }
    }
  }

  // ---------------------------------------------------------------- actions

  private async addMix() {
    const input = this.root?.querySelector<HTMLInputElement>('[data-input="mix-link"]');
    const value = input?.value.trim();
    if (!input || !value) {
      return;
    }
    input.value = '';
    try {
      await this.home.addMixLink(value);
      toast(this.ctx, t('home.mixAdded'));
    } catch (error) {
      input.value = value;
      toast(this.ctx, errorMessage(error));
    }
  }

  private async relogin() {
    await this.ctx.auth.logout();
    this.openLikedTab();
    toast(this.ctx, t('home.reloginToast'));
  }

  private async saveDetail() {
    const detail = this.detail;
    if (!detail?.tracks?.length) {
      return;
    }
    await saveAsNuclearPlaylist(
      this.ctx,
      buildPlaylist({
        name: detail.title,
        description: t('home.fromSpotify', { date: new Date().toLocaleDateString(intlLocale()) }),
        tracks: detail.tracks,
        artwork: detail.image ? { items: [{ url: detail.image, purpose: 'cover' }] } : undefined,
      }),
    );
  }

  private rowContext(row: HTMLElement) {
    const list = this.lists.get(row.dataset.list ?? '') ?? [];
    const index = Number(row.dataset.i);
    return { list, index, track: list[index], collection: row.dataset.collection ?? '' };
  }

  private onRowClick(row: HTMLElement, action: HTMLElement | null) {
    const { list, index, track, collection } = this.rowContext(row);
    if (!track) {
      return;
    }
    this.root
      ?.querySelectorAll('.nsph-row.is-selected')
      .forEach((element) => element.classList.remove('is-selected'));
    row.classList.add('is-selected');
    switch (action?.dataset.act) {
      case 'row-play':
        if (track.source.id === this.nowPlaying.state.currentUri) {
          void this.ctx.api.Playback.toggle();
        } else {
          void this.play(list, index, collection);
        }
        break;
      case 'artist':
        openArtist(this.ctx, track, Number(action.dataset.j));
        break;
      case 'album':
        openAlbum(this.ctx, track);
        break;
      case 'like':
        void toggleLike(this.ctx, track);
        break;
      case 'menu': {
        const rect = action.getBoundingClientRect();
        this.ctx.popups.openMenu(
          rect.right,
          rect.bottom + 4,
          trackMenu(this.ctx, track, () => this.play(list, index, collection)),
          true,
        );
        break;
      }
    }
  }

  private onCardClick(card: HTMLElement, action: string | undefined) {
    const key = card.dataset.card!;
    if (action === 'card-play') {
      void this.playCollection(key);
      return;
    }
    if (action === 'remove-mix') {
      void this.home
        .removeMixLink(key.slice('mix:'.length))
        .then(() => toast(this.ctx, t('home.mixRemoved')));
      return;
    }
    if (key.startsWith('release:')) {
      const release = this.home.state.releases.items.find((item) => `release:${item.id}` === key);
      if (release) {
        void this.openRelease(release);
      }
      return;
    }
    const id = key.slice(key.indexOf(':') + 1);
    const playlist = [...this.home.state.mixes.items, ...this.home.state.charts.items].find(
      (item) => item.id === id,
    );
    if (playlist) {
      this.openPlaylist(playlist);
    }
  }

  private onClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const actionEl = target.closest<HTMLElement>('[data-act]');
    const action = actionEl?.dataset.act;
    const row = target.closest<HTMLElement>('.nsph-row');
    if (row) {
      this.onRowClick(row, actionEl);
      return;
    }
    const card = target.closest<HTMLElement>('.nsph-card[data-card]');
    if (card) {
      this.onCardClick(card, action);
      return;
    }
    const detail = this.detail;
    switch (action) {
      case 'reload':
        void this.home.load(true);
        break;
      case 'login':
        this.openLikedTab();
        break;
      case 'relogin':
        void this.relogin();
        break;
      case 'add-mix':
        void this.addMix();
        break;
      case 'toggle-releases':
        this.showAllReleases = !this.showAllReleases;
        this.renderReleases();
        this.renderNowPlaying();
        break;
      case 'toggle-chart':
        this.showFullChart = !this.showFullChart;
        this.renderCharts();
        break;
      case 'chart-tab':
        this.chartTab = Number(actionEl!.dataset.index);
        this.renderCharts();
        break;
      case 'back':
        this.closeDetail();
        break;
      case 'detail-play':
        if (detail) void this.playCollection(detail.key);
        break;
      case 'detail-shuffle':
        if (detail) void this.playCollection(detail.key, true);
        break;
      case 'detail-save':
        void this.saveDetail();
        break;
      case 'detail-album':
        if (detail?.albumUri) openAlbumUri(this.ctx, detail.albumUri);
        break;
      case 'detail-spotify':
        if (detail?.spotifyUrl) void this.ctx.api.Shell.openExternal(detail.spotifyUrl);
        break;
    }
  };

  private onDoubleClick = (event: MouseEvent) => {
    const target = event.target as Element;
    const row = target.closest<HTMLElement>('.nsph-row');
    if (row && !target.closest('[data-act]')) {
      const { list, index, collection } = this.rowContext(row);
      void this.play(list, index, collection);
    }
  };

  private onContextMenu = (event: MouseEvent) => {
    const row = (event.target as Element).closest<HTMLElement>('.nsph-row');
    if (!row) {
      return;
    }
    const { list, index, track, collection } = this.rowContext(row);
    if (!track) {
      return;
    }
    event.preventDefault();
    this.ctx.popups.openMenu(
      event.clientX,
      event.clientY,
      trackMenu(this.ctx, track, () => this.play(list, index, collection)),
    );
  };
}
