/**
 * Processes pending creator submissions once, locally (same code as the Inngest function). WRITES to Supabase and calls the AI.
 * Usage: node --env-file=.env.local --import tsx scripts/process-creators.ts [limit]
 */
import { AnthropicAi } from "../src/seeder/ai";
import { pendingSubmissions, processSubmission } from "../src/seeder/creator";
import { SupabaseSeederRepo, serviceClient } from "../src/seeder/repo";

async function main() {
  const limit = Number(process.argv[2] || 5);
  const repo = new SupabaseSeederRepo();
  const gate = await repo.stopReason();
  if (gate.reason) throw new Error(`stopped: ${gate.reason}`);
  const db = serviceClient();
  const pending = await pendingSubmissions(db, limit);
  console.log(`pending submissions: ${pending.length}`);
  const ai = new AnthropicAi();
  for (const sub of pending) {
    const out = await processSubmission(sub, { db, repo, ai, siteUrl: process.env.VAULT_SITE_URL || "https://aplus-vault.vercel.app", storageBase: process.env.NEXT_PUBLIC_SUPABASE_URL || "" });
    console.log(`  ${out.status.padEnd(14)} ${out.reason ?? ""} "${sub.title.slice(0, 40)}"`);
  }
}

main().catch((err) => {
  console.error(String(err?.message || err).slice(0, 300));
  process.exit(1);
});
