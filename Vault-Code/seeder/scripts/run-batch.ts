/**
 * Runs ONE seeder batch locally, without Inngest (same steps as src/inngest/batch.ts).
 * WRITES to Supabase (discover_items + Storage) and calls the Anthropic API (small, capped by the same limits).
 *
 * Usage (loads .env.local through Node, nothing is printed):
 *   node --env-file=.env.local --import tsx scripts/run-batch.ts <source> <category> [size] [maxItems]
 * Example:
 *   node --env-file=.env.local --import tsx scripts/run-batch.ts met poster 8 6
 */
import { getAdapter, isSourceKey } from "../src/seeder/adapters";
import { AnthropicAi } from "../src/seeder/ai";
import { capLimits } from "../src/seeder/caps";
import { processCandidate } from "../src/seeder/pipeline";
import { SupabaseSeederRepo } from "../src/seeder/repo";

async function main() {
  const [source = "met", category = "poster", sizeArg = "8", maxArg = "6"] = process.argv.slice(2);
  if (!isSourceKey(source)) throw new Error(`Unknown source: ${source}`);
  const size = Number(sizeArg);
  const maxItems = Number(maxArg);

  const repo = new SupabaseSeederRepo();
  const ai = new AnthropicAi();

  const gate = await repo.stopReason();
  if (gate.reason) throw new Error(`stopped: ${gate.reason}`);
  const limits = capLimits(process.env.SEEDER_BUDGET_USD);
  let itemsLeft = Math.min(maxItems, limits.maxItemsPerRun, limits.maxItemsPerDay - gate.usage.itemsToday);
  let aiLeft = Math.min(limits.maxAiCallsPerRun, limits.maxAiCallsPerDay - gate.usage.aiCallsToday);

  const target = await repo.target(category, source);
  if (!target || !target.enabled) throw new Error(`seed target ${category}/${source} missing or disabled`);
  const batch = await getAdapter(source).fetchBatch(target.query, target.cursor, size);
  const existing = await repo.existingSourceIds(source, batch.candidates.map((c) => c.sourceId));
  const fresh = batch.candidates.filter((c) => !existing.has(c.sourceId));
  const categories = await repo.categories();
  console.log(`${source}/${category} query="${target.query}" cursor=${target.cursor} fetched=${batch.candidates.length} fresh=${fresh.length} (limit ${itemsLeft} items)`);

  const outcomes: string[] = [];
  let halted: string | null = null;
  for (const c of fresh) {
    if (itemsLeft <= 0 || aiLeft <= 0) { halted = "local item limit"; break; }
    const live = await repo.flags();
    if (live.killSwitch || live.paused) { halted = live.killSwitch ? "kill_switch" : "paused"; break; }
    const t0 = Date.now();
    try {
      const o = await processCandidate(c, { category, categories }, { repo, ai });
      itemsLeft--; aiLeft--;
      const reason = "reason" in o ? ` (${o.reason})` : "";
      outcomes.push(o.status);
      console.log(`  ${o.status.padEnd(9)}${reason} ${c.sourceId} "${c.title.slice(0, 50)}" ${Date.now() - t0}ms`);
    } catch (err) {
      console.log(`  ERROR ${c.sourceId}: ${(err as Error).message.slice(0, 160)}`);
    }
  }
  await repo.recordBatch(category, source, { fromCursor: target.cursor, nextCursor: halted ? target.cursor : batch.nextCursor, scanned: batch.scanned, skipped: batch.skipped });
  const count = (s: string) => outcomes.filter((x) => x === s).length;
  console.log(`done: published=${count("published")} review=${count("review")} rejected=${count("rejected")}${halted ? ` halted=${halted}` : ""}`);
}

main().catch((err) => {
  console.error(String(err?.message || err).slice(0, 300));
  process.exit(1);
});
