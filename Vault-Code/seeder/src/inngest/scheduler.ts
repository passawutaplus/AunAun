import { cron } from "inngest";
import { capLimits, itemsAllowance } from "@/seeder/caps";
import { batchSize, maxBatchesPerRun } from "@/seeder/config";
import { SupabaseSeederRepo } from "@/seeder/repo";
import { planBatches } from "@/seeder/schedule";
import { inngest } from "./client";
import { batchRequested, runRequested } from "./events";

/** Daily at 03:00 Bangkok, or on demand from /admin/seeder. */
export const seederScheduler = inngest.createFunction(
  {
    id: "seeder-scheduler",
    name: "Discover seeder: schedule batches",
    triggers: [cron("TZ=Asia/Bangkok 0 3 * * *"), runRequested],
    concurrency: [{ limit: 1 }],
    retries: 2,
  },
  async ({ event, step }) => {
    const repo = new SupabaseSeederRepo();

    const gate = await step.run("check-stop", () => repo.stopReason());
    if (gate.reason) return { skipped: gate.reason };
    // Per-run item cap and what is left of the daily cap decide how many batches may be queued.
    const allowance = itemsAllowance(gate.usage, capLimits(process.env.SEEDER_BUDGET_USD));
    const maxBatches = Math.min(maxBatchesPerRun(), Math.floor(allowance / batchSize()));
    if (maxBatches < 1) return { skipped: "daily_items_cap" as const };

    const [progress, targets] = await Promise.all([
      step.run("load-progress", () => repo.progress()),
      step.run("load-targets", () => repo.targets()),
    ]);

    const onlyCategory = event.name === runRequested.name ? (event.data as { category?: string }).category : undefined;
    const plan = planBatches(progress, targets, {
      batchSize: batchSize(),
      maxBatches,
      onlyCategory: onlyCategory || undefined,
    });

    if (plan.length === 0) return { dispatched: 0, reason: "all categories at target or exhausted" };

    await step.sendEvent(
      "dispatch-batches",
      plan.map((b) => batchRequested.create(b)),
    );
    return { dispatched: plan.length, batches: plan.map((b) => `${b.category}/${b.source}@${b.cursor}`) };
  },
);
