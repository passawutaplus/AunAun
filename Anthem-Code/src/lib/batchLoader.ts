/**
 * Coalesces per-item lookups made in the same tick into one batched request.
 * Card grids call `load(id)` per card; the loader issues a single `fetchMany(ids)`.
 * If `fetchMany` returns null (e.g. RPC not deployed), each caller gets `undefined`
 * and should fall back to its own per-item query.
 */
export function createBatchLoader<V>(
  fetchMany: (keys: string[]) => Promise<Map<string, V> | null>,
  { maxBatch = 200, waitMs = 8 }: { maxBatch?: number; waitMs?: number } = {},
) {
  let queue = new Map<string, Array<(value: V | undefined) => void>>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flush() {
    timer = null;
    const batch = queue;
    queue = new Map();
    const keys = [...batch.keys()];
    for (let i = 0; i < keys.length; i += maxBatch) {
      const chunk = keys.slice(i, i + maxBatch);
      let result: Map<string, V> | null = null;
      try {
        result = await fetchMany(chunk);
      } catch {
        result = null;
      }
      for (const key of chunk) {
        const value = result ? result.get(key) : undefined;
        for (const resolve of batch.get(key) ?? []) resolve(value);
      }
    }
  }

  return {
    load(key: string): Promise<V | undefined> {
      return new Promise((resolve) => {
        const waiters = queue.get(key);
        if (waiters) waiters.push(resolve);
        else queue.set(key, [resolve]);
        if (!timer) timer = setTimeout(flush, waitMs);
      });
    },
  };
}
