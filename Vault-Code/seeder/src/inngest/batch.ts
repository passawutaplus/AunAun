import Anthropic from "@anthropic-ai/sdk";
import { NonRetriableError, RetryAfterError } from "inngest";
import { getAdapter } from "@/seeder/adapters";
import type { Candidate } from "@/seeder/adapters/types";
import { RateLimitedError } from "@/seeder/http";
import { OpsRepo } from "@/ops/repo";
import { capLimits } from "@/seeder/caps";
import { AnthropicAi } from "@/seeder/ai";
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
    // Retries are bounded: after the last attempt the batch goes to the dead-letter table, never retried forever.
    onFailure: async ({ event, error }: { event: { data?: { event?: { data?: unknown } } }; error: Error }) => {
      await new OpsRepo().deadLetter("seeder-batch", event?.data?.event?.data ?? null, error?.message ?? "failed", 5).catch(() => undefined);
    },
    // One batch per source at a time keeps cursor updates ordered and API load predictable.
    concurrency: [{ key: "event.data.source", limit: 1 }],
    throttle: { key: "event.data.source", limit: 4, period: "1m" },
  },
  async ({ event, step, logger }) => {
    const { category, source, query, cursor, size } = event.data;
    const repo = new SupabaseSeederRepo();
    const ai = new AnthropicAi();

    const gate = await step.run("check-stop", () => repo.stopReason());
    if (gate.reason) {
      logger.warn(`seeder batch stopped: ${gate.reason}`);
      if (gate.reason !== "paused") {
        // Caps and the kill switch are reported (daily report + urgent alert), once per 12 h.
        const kind = gate.reason === "kill_switch" ? "kill_switch" : "cap";
        await step.run("log-stop", () => new OpsRepo().logEventOnce(kind, gate.reason as string, "urgent", { reason: gate.reason }).catch(() => undefined));
      }
      return { skipped: gate.reason };
    }
    const limits = capLimits(process.env.SEEDER_BUDGET_USD);
    // Headroom left under the daily caps when this batch starts; the loop stops at whichever runs out first.
    let itemsLeft = Math.min(limits.maxItemsPerRun, limits.maxItemsPerDay - gate.usage.itemsToday);
    let aiLeft = Math.min(limits.maxAiCallsPerRun, limits.maxAiCallsPerDay - gate.usage.aiCallsToday);
    let haltedBy: string | null = null;

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
      if (itemsLeft <= 0 || aiLeft <= 0) {
        haltedBy = itemsLeft <= 0 ? "daily_items_cap" : "daily_ai_cap";
        break;
      }
      try {
        const outcome = await step.run(`item-${source}-${candidate.sourceId}`, async () => {
          try {
            // Re-check the kill switch before every item so flipping it stops spending immediately.
            const live = await repo.flags();
            if (live.killSwitch || live.paused) return { status: "halted" as const, reason: live.killSwitch ? "kill_switch" : "paused" };
            return await processCandidate(candidate, { category, categories }, { repo, ai });
          } catch (err) {
            throw toInngestError(err);
          }
        });
        if (outcome.status === "halted") {
          haltedBy = outcome.reason;
          break;
        }
        itemsLeft--;
        aiLeft--;
        outcomes.push(outcome);
      } catch (err) {
        // Retries exhausted for this item; leave it unrecorded so a later batch can pick it up again.
        logger.warn(`item ${source}/${candidate.sourceId} failed: ${(err as Error).message}`);
      }
    }

    // A halted batch must not advance the cursor past candidates that were never processed.
    await step.run("record-batch", () =>
      repo.recordBatch(category, source, {
        fromCursor: cursor,
        nextCursor: haltedBy ? cursor : batch.nextCursor,
        scanned: batch.scanned,
        skipped: batch.skipped,
      }),
    );

    const published = outcomes.filter((o) => o.status === "published").length;
    const review = outcomes.filter((o) => o.status === "review").length;
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
      haltedBy,
      published,
      review,
      rejected,
    };
  },
);
