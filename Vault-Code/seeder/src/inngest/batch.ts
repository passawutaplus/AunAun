import Anthropic from "@anthropic-ai/sdk";
import { NonRetriableError, RetryAfterError } from "inngest";
import { getAdapter } from "@/seeder/adapters";
import type { Candidate } from "@/seeder/adapters/types";
import { RateLimitedError } from "@/seeder/http";
import { processCandidate, type ItemOutcome } from "@/seeder/pipeline";
import { SupabaseSeederRepo } from "@/seeder/repo";
import { inngest } from "./client";
import { batchRequested } from "./events";

function toInngestError(err: unknown): unknown {
  if (err instanceof RateLimitedError) return new RetryAfterError(err.message, err.retryAfterMs);
  if (err instanceof Anthropic.RateLimitError) {
    const retryAfter = Number(err.headers?.get?.("retry-after") ?? "30");
    return new RetryAfterError("Anthropic rate limit", Math.max(1, retryAfter) * 1000);
  }
  return err;
}

/** One batch = one adapter page for one (category, source), processed item by item as durable steps. */
export const seederBatch = inngest.createFunction(
  {
    id: "seeder-batch",
    name: "Discover seeder: process batch",
    triggers: [batchRequested],
    retries: 4,
    // One batch per source at a time keeps cursor updates ordered and API load predictable.
    concurrency: [{ key: "event.data.source", limit: 1 }],
    throttle: { key: "event.data.source", limit: 4, period: "1m" },
  },
  async ({ event, step, logger }) => {
    const { category, source, query, cursor, size } = event.data;
    const repo = new SupabaseSeederRepo();

    const paused = await step.run("check-paused", () => repo.isPaused());
    if (paused) return { skipped: "paused" as const };

    const target = await step.run("load-target", () => repo.target(category, source));
    if (!target || !target.enabled) throw new NonRetriableError(`seed target ${category}/${source} missing or disabled`);
    if (target.exhausted) return { skipped: "exhausted" as const };

    const batch = await step.run("fetch-batch", async () => {
      try {
        return await getAdapter(source).fetchBatch(query, cursor, size);
      } catch (err) {
        throw toInngestError(err);
      }
    });

    const fresh = await step.run("filter-existing", async () => {
      const existing = await repo.existingSourceIds(
        source,
        batch.candidates.map((c) => c.sourceId),
      );
      return batch.candidates.filter((c) => !existing.has(c.sourceId));
    });

    const categories = await step.run("load-categories", () => repo.categories());

    const outcomes: ItemOutcome[] = [];
    for (const candidate of fresh as Candidate[]) {
      try {
        const outcome = await step.run(`item-${source}-${candidate.sourceId}`, async () => {
          try {
            return await processCandidate(candidate, { category, categories }, { repo });
          } catch (err) {
            throw toInngestError(err);
          }
        });
        outcomes.push(outcome);
      } catch (err) {
        // Retries exhausted for this item; leave it unrecorded so a later batch can pick it up again.
        logger.warn(`item ${source}/${candidate.sourceId} failed: ${(err as Error).message}`);
      }
    }

    await step.run("record-batch", () =>
      repo.recordBatch(category, source, {
        fromCursor: cursor,
        nextCursor: batch.nextCursor,
        scanned: batch.scanned,
        skipped: batch.skipped,
      }),
    );

    const published = outcomes.filter((o) => o.status === "published").length;
    const rejected: Record<string, number> = {};
    for (const o of outcomes) if (o.status === "rejected") rejected[o.reason] = (rejected[o.reason] ?? 0) + 1;

    return {
      category,
      source,
      cursor,
      nextCursor: batch.nextCursor,
      scanned: batch.scanned,
      skipped: batch.skipped,
      processed: outcomes.length,
      published,
      rejected,
    };
  },
);
