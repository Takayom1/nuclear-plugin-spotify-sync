export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Runs `worker` over `items` with at most `limit` calls in flight. */
export const forEachConcurrent = async <T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
) => {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
};

/** Fisher–Yates shuffle returning a new array. */
export const shuffled = <T>(items: readonly T[], random = Math.random) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
