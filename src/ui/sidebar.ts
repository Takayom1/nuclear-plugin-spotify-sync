// Nuclear has no plugin API for sidebar entries, so the tab is injected into
// the DOM next to the built-in items (reusing their Tailwind classes to look
// native) and its page is layered over the router outlet inside <main>.

const SIDEBAR = '[data-testid="sidebar-navigation"]';
const MAIN = '[data-testid="player-workspace-main"]';
const ITEM_CLASS =
  'flex w-full items-center overflow-hidden rounded-md border-(length:--border-width)';
const ACTIVE_CLASSES = ['surface-primary', 'border-border', 'font-bold'];
const LABEL_CLASS = 'text-sm whitespace-nowrap transition-opacity duration-150';
// Fired on document when any plugin tab opens, so sibling tabs close themselves.
const ACTIVATE_EVENT = 'nuclear-plugin-tab-activate';

type SidebarTabOptions = {
  /** Unique key; namespaces the DOM ids/attributes so several tabs can coexist. */
  key: string;
  label: string;
  /** Selector of the sidebar entry to insert after (defaults to the last plugin tab or “Favorite tracks”). */
  insertAfter?: string;
  iconHtml: string;
  onShow: () => void;
  onHide: () => void;
  onReselect: () => void;
};

export class SidebarTab {
  readonly container: HTMLDivElement;
  private readonly nav: HTMLAnchorElement;
  private readonly item: HTMLDivElement;
  private readonly labelEl: HTMLSpanElement;
  private label: string;
  private active = false;
  private hrefAtActivation = '';
  private savedScroll = 0;
  private observer: MutationObserver | null = null;
  private scheduled = false;
  private locationTimer: number | undefined;

  constructor(private readonly options: SidebarTabOptions) {
    this.container = document.createElement('div');
    this.container.id = `${options.key}-view`;
    this.container.setAttribute('data-nuclear-plugin-view', '');
    this.container.hidden = true;

    this.nav = document.createElement('a');
    this.nav.setAttribute('data-nsp-nav', options.key);
    // Shared marker so tabs from sibling plugins close each other.
    this.nav.setAttribute('data-nuclear-plugin-tab', '');
    this.nav.setAttribute('role', 'link');
    this.nav.tabIndex = 0;
    this.nav.style.cursor = 'pointer';
    this.nav.innerHTML = `<div class="${ITEM_CLASS} border-transparent"><div class="flex size-8 shrink-0 items-center justify-center nsp-nav-icon">${options.iconHtml}</div><span class="${LABEL_CLASS} opacity-100"></span></div>`;
    this.item = this.nav.firstElementChild as HTMLDivElement;
    this.labelEl = this.item.querySelector('span')!;
    this.label = options.label;
    this.labelEl.textContent = options.label;
  }

  isActive() {
    return this.active;
  }

  setLabel(label: string) {
    this.label = label;
    this.labelEl.textContent = label;
  }

  mount() {
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    document.addEventListener('click', this.onDocumentClick, true);
    document.addEventListener(ACTIVATE_EVENT, this.onSiblingActivate);
    this.nav.addEventListener('keydown', this.onNavKeyDown);
    window.addEventListener('popstate', this.checkLocation);
    this.locationTimer = window.setInterval(this.checkLocation, 300);
    this.ensure();
  }

  unmount() {
    this.deactivate();
    this.observer?.disconnect();
    this.observer = null;
    document.removeEventListener('click', this.onDocumentClick, true);
    document.removeEventListener(ACTIVATE_EVENT, this.onSiblingActivate);
    this.nav.removeEventListener('keydown', this.onNavKeyDown);
    window.removeEventListener('popstate', this.checkLocation);
    window.clearInterval(this.locationTimer);
    this.nav.remove();
    this.container.remove();
  }

  private schedule() {
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.ensure();
    });
  }

  /** Re-attaches the tab and page whenever React re-creates the layout. */
  private ensure() {
    const sidebar = document.querySelector(SIDEBAR);
    const list = sidebar?.firstElementChild;
    if (sidebar && list && !list.contains(this.nav)) {
      const preferred = this.options.insertAfter
        ? list.querySelector(`:scope > ${this.options.insertAfter}`)
        : null;
      const siblings = list.querySelectorAll(
        ':scope > a[href="/favorites/tracks"], :scope > [data-nuclear-plugin-tab]',
      );
      const anchor = preferred ?? siblings[siblings.length - 1];
      list.insertBefore(this.nav, anchor?.nextSibling ?? null);
    }
    if (sidebar) {
      this.syncCompact(sidebar);
    }

    const main = document.querySelector(MAIN);
    if (main && this.container.parentElement !== main) {
      main.appendChild(this.container);
      if (this.active) {
        main.setAttribute('data-plugin-tab-active', this.options.key);
      }
    }
  }

  private syncCompact(sidebar: Element) {
    const reference = sidebar.querySelector('a[href] span');
    if (!reference) {
      return;
    }
    const compact = reference.classList.contains('opacity-0');
    this.labelEl.classList.toggle('opacity-0', compact);
    this.labelEl.classList.toggle('opacity-100', !compact);
    const title = compact ? this.label : '';
    if (this.nav.title !== title) {
      this.nav.title = title;
    }
  }

  private onNavKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleFromNav();
    }
  };

  private onDocumentClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }
    if (this.nav.contains(target)) {
      event.preventDefault();
      this.toggleFromNav();
      return;
    }
    if (!this.active) {
      return;
    }
    const link = target.closest('a[href], [data-nuclear-plugin-tab]');
    if (link && !this.container.contains(link)) {
      this.deactivate();
    }
  };

  private onSiblingActivate = (event: Event) => {
    if ((event as CustomEvent<string>).detail !== this.options.key) {
      this.deactivate();
    }
  };

  private toggleFromNav() {
    if (this.active) {
      this.options.onReselect();
    } else {
      this.activate();
    }
  }

  private checkLocation = () => {
    if (this.active && location.href !== this.hrefAtActivation) {
      this.deactivate();
    }
  };

  activate() {
    this.ensure();
    const main = document.querySelector<HTMLElement>(MAIN);
    if (!main || this.active) {
      return;
    }
    document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: this.options.key }));
    this.active = true;
    this.hrefAtActivation = location.href;
    this.savedScroll = main.scrollTop;
    document.body.setAttribute('data-plugin-tab-active', this.options.key);
    main.setAttribute('data-plugin-tab-active', this.options.key);
    this.container.hidden = false;
    main.scrollTop = 0;
    this.item.classList.remove('border-transparent');
    this.item.classList.add(...ACTIVE_CLASSES);
    this.options.onShow();
  }

  deactivate() {
    if (!this.active) {
      return;
    }
    this.active = false;
    const main = document.querySelector<HTMLElement>(MAIN);
    // Another plugin tab may have taken over already; only clear our own marker.
    if (document.body.getAttribute('data-plugin-tab-active') === this.options.key) {
      document.body.removeAttribute('data-plugin-tab-active');
      main?.removeAttribute('data-plugin-tab-active');
    }
    this.container.hidden = true;
    this.item.classList.remove(...ACTIVE_CLASSES);
    this.item.classList.add('border-transparent');
    if (main && location.href === this.hrefAtActivation) {
      main.scrollTop = this.savedScroll;
    }
    this.options.onHide();
  }
}
