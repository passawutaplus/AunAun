import { cron } from "inngest";
import { AnthropicAi } from "@/seeder/ai";
import { pendingSubmissions, processSubmission } from "@/seeder/creator";
import { SupabaseSeederRepo, serviceClient } from "@/seeder/repo";
import { inngest } from "./client";

/**
 * Every 10 minutes: creators' own work shared to Discover goes through the same automatic gates and AI as the museum images.
 * Nothing is picked by hand. Stops with the seeder's kill switch / caps like everything else.
 */
export const creatorSubmissions = inngest.createFunction(
  { id: "creator-submissions", name: "Discover: process creator submissions", triggers: [cron("*/10 * * * *")], concurrency: [{ limit: 1 }], retries: 1 },
  async ({ step, logger }) => {
    const repo = new SupabaseSeederRepo();
    const gate = await step.run("check-stop", () => repo.stopReason());
    if (gate.reason) return { skipped: gate.reason };
    const db = serviceClient();
    const pending = await step.run("load-pending", () => pendingSubmissions(db, 5));
    if (!pending.length) return { processed: 0 };
    const ai = new AnthropicAi();
    const siteUrl = process.env.VAULT_SITE_URL || "https://aplus-vault.vercel.app";
    const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let published = 0;
    for (const sub of pending) {
      try {
        const out = await step.run(`submission-${sub.id}`, () => processSubmission(sub, { db, repo, ai, siteUrl, storageBase }));
        if (out.status === "published") published++;
      } catch (err) {
        logger.warn(`submission ${sub.id} failed: ${(err as Error).message}`);
      }
    }
    return { processed: pending.length, published };
  },
);
