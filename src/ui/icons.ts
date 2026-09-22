// Lucide-style icons so the tab matches the player's own icon set.
const svg = (body: string, size = 24, fill = 'none') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const HEART_PATH =
  '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>';

export const icons = {
  spotify: (size = 24) =>
    svg(
      '<circle cx="12" cy="12" r="10"/><path d="M7 9.5c3.5-1.2 7.3-.9 10.3.9"/><path d="M7.6 12.6c2.9-.9 5.9-.6 8.3.8"/><path d="M8.3 15.5c2.2-.6 4.3-.4 6.1.6"/>',
      size,
    ),
  heart: (size = 24) => svg(HEART_PATH, size),
  heartFilled: (size = 16) => svg(HEART_PATH, size, 'currentColor'),
  play: (size = 24) => svg('<polygon points="6 3 20 12 6 21 6 3"/>', size, 'currentColor'),
  pause: (size = 24) =>
    svg(
      '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
      size,
      'currentColor',
    ),
  shuffle: (size = 20) =>
    svg(
      '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-7.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
      size,
    ),
  refresh: (size = 20) =>
    svg(
      '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
      size,
    ),
  listPlus: (size = 20) =>
    svg(
      '<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>',
      size,
    ),
  more: (size = 20) =>
    svg(
      '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
      size,
    ),
  clock: (size = 16) =>
    svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', size),
  search: (size = 16) => svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', size),
  logOut: (size = 16) =>
    svg(
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
      size,
    ),
  external: (size = 16) =>
    svg(
      '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      size,
    ),
  copy: (size = 16) =>
    svg(
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      size,
    ),
  queue: (size = 16) =>
    svg(
      '<path d="M16 12H3"/><path d="M16 6H3"/><path d="M10 18H3"/><path d="M21 6v10a2 2 0 0 1-2 2h-5"/><path d="m16 16-2 2 2 2"/>',
      size,
    ),
  next: (size = 16) =>
    svg('<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>', size),
  star: (size = 16) =>
    svg(
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      size,
    ),
  user: (size = 16) =>
    svg(
      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      size,
    ),
  disc: (size = 16) => svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/>', size),
  x: (size = 16) => svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', size),
};
