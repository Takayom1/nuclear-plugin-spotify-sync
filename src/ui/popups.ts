// Context menus and toasts shared by the plugin's tabs.

export type MenuItem = { icon: string; label: string; run: () => unknown } | 'separator';
export type ToastAction = { label: string; run: () => unknown };

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export class Popups {
  private menu: HTMLDivElement | null = null;
  private readonly toasts: HTMLDivElement;

  constructor() {
    this.toasts = document.createElement('div');
    this.toasts.className = 'nsp-toasts';
    document.body.appendChild(this.toasts);
  }

  destroy() {
    this.closeMenu();
    this.toasts.remove();
  }

  toast(message: string, action?: ToastAction) {
    const toast = document.createElement('div');
    toast.className = 'nsp-toast';
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);
    if (action) {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.addEventListener('click', () => {
        toast.remove();
        Promise.resolve()
          .then(action.run)
          .catch((error) => this.toast(errorText(error)));
      });
      toast.appendChild(button);
    }
    this.toasts.appendChild(toast);
    while (this.toasts.childElementCount > 3) {
      this.toasts.firstElementChild?.remove();
    }
    setTimeout(() => toast.remove(), action ? 7000 : 3500);
  }

  openMenu(x: number, y: number, items: MenuItem[], alignRight = false) {
    this.closeMenu();
    const menu = document.createElement('div');
    menu.className = 'nsp-menu';
    menu.setAttribute('role', 'menu');
    items.forEach((item) => {
      if (item === 'separator') {
        menu.appendChild(document.createElement('hr'));
        return;
      }
      const button = document.createElement('button');
      button.setAttribute('role', 'menuitem');
      button.innerHTML = `<span style="width:16px;display:inline-flex;justify-content:center">${item.icon}</span><span></span>`;
      button.lastElementChild!.textContent = item.label;
      button.addEventListener('click', () => {
        this.closeMenu();
        Promise.resolve()
          .then(item.run)
          .catch((error) => this.toast(errorText(error)));
      });
      menu.appendChild(button);
    });
    document.body.appendChild(menu);
    const { width, height } = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(alignRight ? x - width : x, window.innerWidth - width - 8));
    const top =
      y + height > window.innerHeight - 8 ? Math.max(8, y - height - (alignRight ? 40 : 0)) : y;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    this.menu = menu;
    setTimeout(() => {
      document.addEventListener('mousedown', this.onOutsideMenu, true);
      document.addEventListener('keydown', this.onMenuKey, true);
      window.addEventListener('blur', this.closeMenu);
      window.addEventListener('resize', this.closeMenu);
      document.addEventListener('scroll', this.closeMenu, true);
    });
  }

  private onOutsideMenu = (event: MouseEvent) => {
    if (this.menu && !this.menu.contains(event.target as Node)) {
      this.closeMenu();
    }
  };

  private onMenuKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeMenu();
    }
  };

  closeMenu = () => {
    if (!this.menu) {
      return;
    }
    this.menu.remove();
    this.menu = null;
    document.removeEventListener('mousedown', this.onOutsideMenu, true);
    document.removeEventListener('keydown', this.onMenuKey, true);
    window.removeEventListener('blur', this.closeMenu);
    window.removeEventListener('resize', this.closeMenu);
    document.removeEventListener('scroll', this.closeMenu, true);
  };
}
