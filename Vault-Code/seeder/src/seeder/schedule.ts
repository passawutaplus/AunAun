import type { SourceKey } from "./adapters/types";
import type { CategoryProgress, SeedTarget } from "./repo";

export type BatchRequest = {
  category: string;
  source: SourceKey;
  query: string;
  cursor: number;
  size: number;
};

export type PlanOptions = {
  batchSize: number;
  maxBatches: number;
  /** Max queued batches per (category, source) in one run. */
  maxPerTarget?: number;
  onlyCategory?: string;
};

/**
 * Picks batches for categories still under target, round-robin so one big gap cannot starve the rest.
 * Not every scanned record publishes, so a target is asked for up to `maxPerTarget` pages per run.
 */
export function planBatches(progress: CategoryProgress[], targets: SeedTarget[], opts: PlanOptions): BatchRequest[] {
  const maxPerTarget = opts.maxPerTarget ?? 3;
  const behind = new Map(
    progress
      .filter((p) => p.published < p.target_count)
      .filter((p) => !opts.onlyCategory || p.category === opts.onlyCategory)
      .map((p) => [p.category, p.target_count - p.published]),
  );

  const queues = targets
    .filter((t) => t.enabled && !t.exhausted && behind.has(t.category))
    .map((t) => {
      const remaining = behind.get(t.category) ?? 0;
      const pages = Math.min(maxPerTarget, Math.max(1, Math.ceil(remaining / opts.batchSize)));
      return Array.from({ length: pages }, (_, i) => ({
        category: t.category,
        source: t.source,
        query: t.query,
        cursor: t.cursor + i * opts.batchSize,
        size: opts.batchSize,
      }));
    });

  const out: BatchRequest[] = [];
  for (let round = 0; out.length < opts.maxBatches; round++) {
    let added = false;
    for (const q of queues) {
      if (round < q.length && out.length < opts.maxBatches) {
        out.push(q[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}
