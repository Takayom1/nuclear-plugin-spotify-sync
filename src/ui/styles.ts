// Built on the player's theme variables (see @nuclearplayer/tailwind-config),
// so the tab follows light/dark and custom themes.
const STYLE_ID = 'nsp-styles';

export const STYLESHEET = /* css */ `
body[data-plugin-tab-active] [data-testid="sidebar-navigation"] a[href] [data-testid="sidebar-navigation-item"] {
  background: transparent !important;
  background-image: none !important;
  border-color: transparent !important;
  color: inherit !important;
  font-weight: inherit !important;
}
main[data-plugin-tab-active] > :not([data-nuclear-plugin-view]) { display: none !important; }
[data-nuclear-plugin-view][hidden] { display: none !important; }
[data-nsp-nav] .nsp-nav-icon { color: #1db954; }

.nsp-root {
  --nsp-border: var(--border-width, 2px) solid var(--border, #000);
  --nsp-shadow: var(--shadow-x, 2px) var(--shadow-y, 2px) 0 0 var(--border, #000);
  --nsp-radius: var(--radius-md, 6px);
  --nsp-fg: var(--foreground, #000);
  --nsp-sub: color-mix(in oklch, var(--foreground, #000) 62%, transparent);
  --nsp-row-hover: color-mix(in oklch, var(--foreground, #000) 7%, transparent);
  --nsp-accent: #1db954;
  --nsp-hero: color-mix(in oklch, var(--accent-purple, #8e8ee5) 85%, var(--muted, #fff));
  position: relative;
  min-height: 100%;
  color: var(--nsp-fg);
  font-family: var(--font-family, inherit);
  container-type: inline-size;
  padding-bottom: 32px;
}
.nsp-root *, .nsp-root *::before, .nsp-root *::after { box-sizing: border-box; }
.nsp-root [hidden] { display: none !important; }
.nsp-root button { font: inherit; color: inherit; }

/* hero */
.nsp-hero {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding: 40px 32px 24px;
  background: linear-gradient(180deg, var(--nsp-hero) 0%, color-mix(in oklch, var(--nsp-hero) 35%, transparent) 100%);
  border-bottom: var(--nsp-border);
}
.nsp-cover {
  flex: none;
  width: clamp(128px, 18cqi, 220px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #450af5 0%, #8e8ee5 100%);
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  box-shadow: 4px 4px 0 0 var(--border, #000);
}
.nsp-cover svg { width: 42%; height: 42%; fill: currentColor; }
.nsp-hero-text { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.nsp-kicker { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
.nsp-title {
  margin: 0;
  font-family: var(--font-family-heading, inherit);
  font-weight: var(--font-weight-extra-bold, 800);
  font-size: clamp(32px, 7cqi, 88px);
  line-height: 1;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}
.nsp-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 14px; }
.nsp-meta b { font-weight: 700; }
.nsp-avatar { width: 24px; height: 24px; border-radius: 50%; border: var(--nsp-border); object-fit: cover; }
.nsp-dot { opacity: .6; }
.nsp-sub { color: var(--nsp-sub); }

/* toolbar */
.nsp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 32px;
  flex-wrap: wrap;
}
.nsp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  background: var(--card, #fff);
  color: var(--card-foreground, inherit) !important;
  box-shadow: var(--nsp-shadow);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .08s ease, box-shadow .08s ease, opacity .15s;
  white-space: nowrap;
}
.nsp-btn:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: calc(var(--shadow-x, 2px) + 1px) calc(var(--shadow-y, 2px) + 1px) 0 0 var(--border, #000); }
.nsp-btn:active:not(:disabled) { transform: translate(var(--shadow-x, 2px), var(--shadow-y, 2px)); box-shadow: none; }
.nsp-btn:disabled { opacity: .5; cursor: default; }
.nsp-btn.is-icon { width: 40px; padding: 0; }
.nsp-btn.is-primary { background: var(--primary, #1db954); color: var(--primary-foreground, #000) !important; }
.nsp-btn.is-spotify { background: var(--nsp-accent); color: #000 !important; }
.nsp-play {
  width: 56px; height: 56px; padding: 0;
  border-radius: 50%;
  background: var(--nsp-accent);
  color: #000 !important;
}
.nsp-play svg { width: 24px; height: 24px; }
.nsp-spin svg { animation: nsp-spin 0.9s linear infinite; }
@keyframes nsp-spin { to { transform: rotate(360deg); } }
.nsp-spacer { flex: 1; }
.nsp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  min-width: 220px;
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  background: var(--input, #fff);
  color: var(--input-foreground, inherit);
}
.nsp-search input {
  flex: 1; min-width: 0;
  border: 0; outline: 0; background: transparent; color: inherit;
  font: inherit; font-size: 14px;
}
.nsp-search:focus-within { box-shadow: 0 0 0 2px var(--ring, #000); }

.nsp-progress { margin: 0 32px 12px; font-size: 13px; }
.nsp-progress-bar {
  height: 8px; margin-top: 6px;
  border: var(--nsp-border); border-radius: 999px;
  background: var(--muted, #fff); overflow: hidden;
}
.nsp-progress-bar > i { display: block; height: 100%; background: var(--nsp-accent); transition: width .2s; }

.nsp-banner {
  margin: 0 32px 16px;
  padding: 12px 14px;
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  background: color-mix(in oklch, var(--accent-red, #f66) 30%, var(--card, #fff));
  box-shadow: var(--nsp-shadow);
  font-size: 14px;
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
}
.nsp-banner > span { flex: 1; min-width: 200px; }

/* table */
.nsp-table { padding: 0 24px; }
.nsp-row, .nsp-head {
  display: grid;
  grid-template-columns: 44px minmax(180px, 5fr) minmax(120px, 3fr) minmax(110px, 1.6fr) 36px 72px;
  align-items: center;
  gap: 12px;
  padding: 0 8px;
}
.nsp-head {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 38px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--nsp-sub);
  background: var(--muted, #fff);
  border-bottom: var(--nsp-border);
}
.nsp-sort {
  display: inline-flex; align-items: center; gap: 4px;
  border: 0; background: none; padding: 0; cursor: pointer;
  font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit !important;
  min-width: 0;
}
.nsp-sort:hover, .nsp-sort.is-active { color: var(--nsp-fg) !important; }
.nsp-sort .nsp-arrow { font-size: 10px; }
.nsp-head .nsp-c-dur, .nsp-row .nsp-c-dur { justify-content: flex-end; }
.nsp-row {
  height: 56px;
  border-radius: var(--nsp-radius);
  border: var(--border-width, 2px) solid transparent;
  font-size: 14px;
  cursor: default;
  user-select: none;
}
.nsp-row:hover { background: var(--nsp-row-hover); }
.nsp-row.is-selected { background: color-mix(in oklch, var(--foreground, #000) 12%, transparent); border-color: var(--border, #000); }
.nsp-row > div { min-width: 0; display: flex; align-items: center; }
.nsp-c-num { justify-content: center; position: relative; color: var(--nsp-sub); font-variant-numeric: tabular-nums; }
.nsp-rowplay {
  display: none;
  width: 28px; height: 28px;
  align-items: center; justify-content: center;
  border: 0; background: none; padding: 0; cursor: pointer;
}
.nsp-rowplay svg { width: 16px; height: 16px; }
.nsp-row:hover .nsp-num, .nsp-row:hover .nsp-eq { display: none; }
.nsp-row:hover .nsp-rowplay { display: inline-flex; color: var(--nsp-fg); }
.nsp-eq { display: none; gap: 2px; align-items: flex-end; height: 14px; }
.nsp-eq i { width: 3px; background: var(--nsp-accent); border-radius: 1px; height: 30%; }
.nsp-row.is-current .nsp-num { display: none; }
.nsp-row.is-current .nsp-eq { display: inline-flex; }
.nsp-root.is-playing .nsp-row.is-current .nsp-eq i { animation: nsp-eq .9s ease-in-out infinite alternate; }
.nsp-row.is-current .nsp-eq i:nth-child(2) { animation-delay: -.3s; height: 70%; }
.nsp-row.is-current .nsp-eq i:nth-child(3) { animation-delay: -.6s; height: 50%; }
@keyframes nsp-eq { 0% { height: 20%; } 100% { height: 100%; } }
.nsp-row.is-current .nsp-name { color: var(--nsp-accent); }
:root:not([data-theme="dark"]) .nsp-row.is-current .nsp-name { color: color-mix(in oklch, var(--nsp-accent) 70%, #000); }

.nsp-c-title { gap: 12px; }
.nsp-thumb {
  flex: none; width: 40px; height: 40px;
  border-radius: calc(var(--nsp-radius) / 2);
  border: var(--border-width, 2px) solid var(--border, #000);
  object-fit: cover;
  background: var(--card, #ddd);
}
.nsp-thumb.is-empty { display: grid; place-items: center; color: var(--nsp-sub); }
.nsp-tt { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nsp-name, .nsp-artists, .nsp-c-album span, .nsp-c-added {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.nsp-name { font-weight: 700; font-size: 15px; }
.nsp-artists { font-size: 13px; color: var(--nsp-sub); }
.nsp-c-album, .nsp-c-added { color: var(--nsp-sub); font-size: 13px; }
.nsp-link { cursor: pointer; }
.nsp-link:hover { text-decoration: underline; color: var(--nsp-fg); }
.nsp-explicit {
  display: inline-grid; place-items: center;
  width: 16px; height: 16px; margin-right: 6px;
  font-size: 9px; font-weight: 800; line-height: 1;
  border-radius: 2px;
  background: var(--nsp-sub); color: var(--muted, #fff);
  vertical-align: 2px;
}
.nsp-heart {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border: 0; background: none; padding: 0; cursor: pointer;
  color: var(--nsp-accent) !important;
}
:root:not([data-theme="dark"]) .nsp-heart { color: color-mix(in oklch, var(--nsp-accent) 80%, #000) !important; }
.nsp-heart:hover { transform: scale(1.1); }
.nsp-heart:disabled { opacity: .3; cursor: default; transform: none; }
.nsp-c-dur { gap: 6px; color: var(--nsp-sub); font-variant-numeric: tabular-nums; font-size: 13px; }
.nsp-more {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: 0; background: none; padding: 0; cursor: pointer;
  visibility: hidden;
}
.nsp-row:hover .nsp-more, .nsp-row.is-selected .nsp-more { visibility: visible; }
.nsp-sentinel { height: 1px; }

@container (max-width: 900px) {
  .nsp-row, .nsp-head { grid-template-columns: 44px minmax(180px, 5fr) minmax(120px, 3fr) 36px 72px; }
  .nsp-c-added { display: none !important; }
}
@container (max-width: 640px) {
  .nsp-row, .nsp-head { grid-template-columns: 36px minmax(0, 1fr) 36px 64px; }
  .nsp-c-album { display: none !important; }
  .nsp-hero { padding: 24px 16px 16px; gap: 16px; }
  .nsp-toolbar { padding: 16px; }
  .nsp-table { padding: 0 8px; }
  .nsp-search { min-width: 0; flex: 1 1 100%; }
}

/* empty / setup */
.nsp-empty { padding: 64px 32px; text-align: center; color: var(--nsp-sub); }
.nsp-empty h3 { margin: 0 0 8px; color: var(--nsp-fg); font-size: 20px; }
.nsp-setup { max-width: 720px; padding: 8px 32px 32px; display: flex; flex-direction: column; gap: 16px; }
.nsp-setup > p { margin: 0; font-size: 14px; line-height: 1.5; }
.nsp-step {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 12px 16px;
  padding: 16px;
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  background: var(--card, #fff);
  color: var(--card-foreground, inherit);
  box-shadow: var(--nsp-shadow);
}
.nsp-step.is-disabled { opacity: .55; }
.nsp-step-num {
  width: 36px; height: 36px;
  display: grid; place-items: center;
  border: var(--nsp-border); border-radius: 50%;
  font-weight: 800;
  background: var(--nsp-accent); color: #000;
}
.nsp-step-body { display: flex; flex-direction: column; gap: 10px; min-width: 0; font-size: 14px; line-height: 1.5; }
.nsp-step-body h4 { margin: 6px 0 0; font-size: 16px; }
.nsp-step-body ol { margin: 0; padding-left: 20px; }
.nsp-row-inline { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.nsp-input {
  flex: 1; min-width: 200px; height: 40px; padding: 0 12px;
  border: var(--nsp-border); border-radius: var(--nsp-radius);
  background: var(--input, #fff); color: var(--input-foreground, inherit);
  font: inherit; font-size: 14px; outline: 0;
}
.nsp-input:focus { box-shadow: 0 0 0 2px var(--ring, #000); }
.nsp-code {
  font-family: var(--font-family-mono, ui-monospace, monospace);
  font-size: 13px;
  padding: 8px 10px;
  border: var(--nsp-border); border-radius: var(--nsp-radius);
  background: var(--muted, #fff);
  overflow-wrap: anywhere;
  flex: 1;
}
.nsp-error { color: var(--accent-red, #d00); font-weight: 700; font-size: 14px; }
:root:not([data-theme="dark"]) .nsp-error { color: color-mix(in oklch, var(--accent-red, #d00) 60%, #000); }
.nsp-hint { font-size: 13px; color: var(--nsp-sub); }

/* home tab */
.nsp-banner.is-info { background: color-mix(in oklch, var(--accent-green, #1db954) 22%, var(--card, #fff)); }
.nsph-page { padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 36px; }
.nsph-greeting { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.nsph-greeting h1 {
  margin: 0;
  font-family: var(--font-family-heading, inherit);
  font-weight: var(--font-weight-extra-bold, 800);
  font-size: clamp(28px, 4.5cqi, 46px);
  letter-spacing: -0.02em;
  line-height: 1.05;
}
.nsph-greeting-sub { margin-top: 6px; font-size: 14px; }
.nsph-banners { display: flex; flex-direction: column; gap: 12px; }
.nsph-banners:empty { display: none; }
.nsph-banners .nsp-banner { margin: 0; }
.nsph-section-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.nsph-section-head h2 { margin: 0; font-size: 22px; font-weight: var(--font-weight-extra-bold, 800); letter-spacing: -0.01em; }
.nsph-note { font-size: 13px; }
.nsph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 18px; }
.nsph-grid.is-wide { grid-template-columns: repeat(auto-fill, minmax(200px, 240px)); margin-bottom: 18px; }
.nsph-card {
  position: relative;
  display: flex; flex-direction: column; gap: 8px;
  min-width: 0;
  padding: 12px;
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  background: var(--card, #fff);
  color: var(--card-foreground, inherit);
  box-shadow: var(--nsp-shadow);
  cursor: pointer;
  transition: transform .1s ease, box-shadow .1s ease;
}
.nsph-card:hover, .nsph-card:focus-visible { transform: translate(-2px, -2px); box-shadow: calc(var(--shadow-x, 2px) + 2px) calc(var(--shadow-y, 2px) + 2px) 0 0 var(--border, #000); outline: none; }
.nsph-card-img {
  position: relative;
  aspect-ratio: 1;
  border-radius: calc(var(--nsp-radius) * 0.75);
  border: var(--nsp-border);
  overflow: hidden;
  background: var(--muted, #eee);
}
.nsph-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.nsph-card-fallback { width: 100%; height: 100%; display: grid; place-items: center; color: var(--nsp-sub); }
.nsph-card-play {
  position: absolute; right: 8px; bottom: 8px;
  width: 46px; height: 46px;
  display: grid; place-items: center;
  border: var(--nsp-border); border-radius: 50%;
  background: var(--nsp-accent); color: #000 !important;
  box-shadow: 0 6px 14px rgba(0, 0, 0, .35);
  opacity: 0; transform: translateY(6px);
  transition: opacity .15s, transform .15s;
  cursor: pointer; padding: 0;
}
.nsph-card:hover .nsph-card-play, .nsph-card:focus-within .nsph-card-play, .nsph-card.is-playing .nsph-card-play { opacity: 1; transform: none; }
.nsph-card-play:hover { transform: scale(1.06) !important; }
.nsph-card-title { font-weight: 800; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nsph-card-sub {
  font-size: 13px; line-height: 1.35; min-height: 2.7em;
  color: color-mix(in oklch, var(--card-foreground, #000) 65%, transparent);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.nsph-card-remove {
  position: absolute; top: 6px; right: 6px; z-index: 2;
  width: 26px; height: 26px; display: grid; place-items: center; padding: 0;
  border: var(--nsp-border); border-radius: 50%;
  background: var(--popover, #fff); color: var(--popover-foreground, #000) !important;
  opacity: 0; cursor: pointer; transition: opacity .15s;
}
.nsph-card:hover .nsph-card-remove { opacity: 1; }
.nsph-card.is-skeleton { cursor: default; box-shadow: none; }
.nsph-card.is-skeleton .nsph-card-img, .nsph-card.is-skeleton .nsph-card-title, .nsph-card.is-skeleton .nsph-card-sub {
  background: color-mix(in oklch, var(--foreground, #000) 9%, transparent);
  border-radius: 6px; border-color: transparent;
  animation: nsph-pulse 1.2s ease-in-out infinite alternate;
}
@keyframes nsph-pulse { from { opacity: .45; } to { opacity: 1; } }
.nsph-empty {
  grid-column: 1 / -1;
  padding: 16px 18px;
  border: var(--border-width, 2px) dashed var(--border, #000);
  border-radius: var(--nsp-radius);
  font-size: 14px; line-height: 1.5;
  color: var(--nsp-sub);
}
.nsph-add { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.nsph-add .nsp-input { max-width: 560px; }
.nsph-more { margin-top: 12px; }
.nsph-more:empty { display: none; }
.nsph-link-btn { border: 0; background: none; padding: 0; cursor: pointer; font-weight: 800; font-size: 14px; color: var(--nsp-sub) !important; }
.nsph-link-btn:hover { color: var(--nsp-fg) !important; text-decoration: underline; }
.nsph-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.nsph-tab {
  height: 34px; padding: 0 14px;
  border: var(--nsp-border); border-radius: 999px;
  background: var(--card, #fff); color: var(--card-foreground, inherit) !important;
  font-weight: 700; font-size: 13px; cursor: pointer;
}
.nsph-tab.is-active { background: var(--nsp-fg); color: var(--muted, #fff) !important; }
.nsph-table { padding: 0; }
.nsp-row.nsph-row, .nsp-head.nsph-head { grid-template-columns: 44px minmax(180px, 5fr) minmax(120px, 3fr) 36px 72px; }
.nsph-row .nsph-heart { color: var(--nsp-sub) !important; opacity: 0; }
.nsph-row:hover .nsph-heart, .nsph-row.is-liked .nsph-heart { opacity: 1; }
.nsph-row.is-liked .nsph-heart { color: var(--nsp-accent) !important; }
:root:not([data-theme="dark"]) .nsph-row.is-liked .nsph-heart { color: color-mix(in oklch, var(--nsp-accent) 80%, #000) !important; }
.nsph-detail-nav { padding: 16px 32px 0; }
.nsph-detail .nsp-hero { padding-top: 20px; }
.nsph-detail-desc { font-size: 14px; color: var(--nsp-sub); max-width: 70ch; }
.nsp-cover.has-image { background: var(--card, #ddd); overflow: hidden; }
.nsp-cover.has-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
@container (max-width: 640px) {
  .nsph-page { padding: 20px 16px 40px; }
  .nsp-row.nsph-row, .nsp-head.nsph-head { grid-template-columns: 36px minmax(0, 1fr) 36px 64px; }
  .nsph-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .nsph-detail-nav { padding: 12px 16px 0; }
}

/* menu + toasts */
.nsp-menu {
  position: fixed;
  z-index: 1000;
  min-width: 230px;
  padding: 6px;
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  background: var(--popover, #fff);
  color: var(--popover-foreground, inherit);
  box-shadow: 4px 4px 0 0 var(--border, #000);
  font-family: var(--font-family, inherit);
}
.nsp-menu button {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px 10px;
  border: 0; border-radius: calc(var(--nsp-radius) - 2px);
  background: none; color: inherit; cursor: pointer;
  font: inherit; font-size: 14px; text-align: left;
}
.nsp-menu button:hover { background: color-mix(in oklch, var(--foreground, #000) 10%, transparent); }
.nsp-menu hr { border: 0; border-top: var(--nsp-border); margin: 6px 0; opacity: .4; }
.nsp-toasts {
  position: fixed;
  left: 50%;
  bottom: 120px;
  transform: translateX(-50%);
  z-index: 1001;
  display: flex; flex-direction: column; gap: 8px; align-items: center;
  pointer-events: none;
  font-family: var(--font-family, inherit);
}
.nsp-toast {
  pointer-events: auto;
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px;
  border: var(--nsp-border);
  border-radius: var(--nsp-radius);
  background: var(--foreground, #000);
  color: var(--background, #fff);
  box-shadow: 4px 4px 0 0 var(--border, #000);
  font-size: 14px;
  animation: nsp-toast-in .18s ease-out;
}
.nsp-toast button {
  border: 0; background: none; color: var(--nsp-accent, #1db954); cursor: pointer;
  font: inherit; font-weight: 800; padding: 0;
}
@keyframes nsp-toast-in { from { opacity: 0; transform: translateY(8px); } }
`;

/** Injects the stylesheet once; safe to call from every view. */
export const ensureStyles = () => {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLESHEET;
    document.head.appendChild(style);
  }
};

export const removeStyles = () => document.getElementById(STYLE_ID)?.remove();
