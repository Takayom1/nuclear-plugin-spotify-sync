// Plugins get no router API, so this reuses the player's TanStack router
// instance found through the React fiber tree, falling back to a history push
// followed by a popstate event (which the router listens to).

type RouterLike = {
  navigate: (options: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  }) => unknown;
};

type Fiber = { memoizedProps?: { router?: RouterLike }; return: Fiber | null };

let cachedRouter: RouterLike | null = null;

const findRouter = (): RouterLike | null => {
  if (cachedRouter) {
    return cachedRouter;
  }
  const start = document.querySelector('[data-testid="sidebar-navigation"] a[href]');
  if (!start) {
    return null;
  }
  const fiberKey = Object.keys(start).find((key) => key.startsWith('__reactFiber$'));
  let fiber: Fiber | null = fiberKey
    ? ((start as unknown as Record<string, Fiber>)[fiberKey] ?? null)
    : null;
  while (fiber) {
    const router = fiber.memoizedProps?.router;
    if (router && typeof router.navigate === 'function') {
      cachedRouter = router;
      return router;
    }
    fiber = fiber.return;
  }
  return null;
};

const interpolate = (to: string, params: Record<string, string> = {}) =>
  to.replace(/\$(\w+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''));

export type NavigateOptions = {
  params?: Record<string, string>;
  search?: Record<string, string>;
};

export const navigateTo = (to: string, options: NavigateOptions = {}) => {
  const router = findRouter();
  if (router) {
    router.navigate({ to, params: options.params, search: options.search });
    return;
  }
  const query = options.search ? `?${new URLSearchParams(options.search)}` : '';
  history.pushState(history.state, '', `${interpolate(to, options.params)}${query}`);
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
};
