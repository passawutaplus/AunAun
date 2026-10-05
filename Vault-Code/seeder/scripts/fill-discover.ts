/**
 * Fills Discover from open-licence sources, locally, until a cap or the monthly AI budget stops it.
 * Same gates, AI and caps as the Inngest seeder; the kill switch / paused flag / daily caps / monthly budget are re-checked before EVERY item.
 * WRITES to Supabase and spends Anthropic credit.
 *
 * Usage: node --env-file=.env.local --import tsx scripts/fill-discover.ts <source> [categories,comma,separated] [maxCursor]
 * Example: node --env-file=.env.local --import tsx scripts/fill-discover.ts ov poster,typography,illustration,pattern,print 400
 */
import { getAdapter, isSourceKey } from "../src/seeder/adapters";
import { AnthropicAi } from "../src/seeder/ai";
import { processCandidate } from "../src/seeder/pipeline";
import { SupabaseSeederRepo } from "../src/seeder/repo";

const BATCH = 20;

async function main() {
  const [source = "ov", cats = "poster,typography,illustration,pattern,print", maxCursorArg = "400"] = process.argv.slice(2);
  if (!isSourceKey(source)) throw new Error(`Unknown source: ${source}`);
  if (source === "ov") process.env.OPENVERSE_SOURCES ||= "wikimedia,europeana,nypl,brooklynmuseum,rijksmuseum,smk";
  const maxCursor = Number(maxCursorArg);
  const repo = new SupabaseSeederRepo();
  const ai = new AnthropicAi();
  const categories = await repo.categories();
  const totals = { published: 0, review: 0, rejected: 0 };
  let stop: string | null = null;
  const done = new Set<string>();

  const first = await repo.stopReason();
  if (first.reason) throw new Error(`stopped: ${first.reason}`);
  console.log(`start: items today ${first.usage.itemsToday}, AI calls today ${first.usage.aiCallsToday}, month $${first.usage.monthUsd.toFixed(2)}`);

  const list = cats.split(",").map((c) => c.trim()).filter(Boolean);
  while (!stop && done.size < list.length) {
    for (const category of list) {
      if (stop || done.has(category)) continue;
      const target = await repo.target(category, source);
      if (!target || !target.enabled || target.exhausted || target.cursor >= maxCursor) { done.add(category); continue; }
      const batch = await getAdapter(source).fetchBatch(target.query, target.cursor, BATCH);
      const existing = await repo.existingSourceIds(source, batch.candidates.map((c) => c.sourceId));
      const fresh = batch.candidates.filter((c) => !existing.has(c.sourceId));
      let finished = true;
      for (const c of fresh) {
        const gate = await repo.stopReason();
        if (gate.reason) { stop = gate.reason; finished = false; break; }
        try {
          const o = await processCandidate(c, { category, categories }, { repo, ai });
          totals[o.status]++;
        } catch (err) {
          console.log(`  ERROR ${c.sourceId}: ${(err as Error).message.slice(0, 120)}`);
        }
      }
      // A halted batch must not skip the items it never reached.
      await repo.recordBatch(category, source, { fromCursor: target.cursor, nextCursor: finished ? batch.nextCursor : target.cursor, scanned: batch.scanned, skipped: batch.skipped });
      if (batch.nextCursor === null) done.add(category);
      console.log(`${category}@${target.cursor}: fetched ${batch.candidates.length}, fresh ${fresh.length} | total published ${totals.published} review ${totals.review} rejected ${totals.rejected}`);
    }
  }
  const end = await repo.stopReason();
  console.log(`finished${stop ? ` (stopped: ${stop})` : ""}: published ${totals.published}, review ${totals.review}, rejected ${totals.rejected}; month $${end.usage.monthUsd.toFixed(2)}, items today ${end.usage.itemsToday}`);
}

main().catch((err) => {
  console.error(String(err?.message || err).slice(0, 300));
  process.exit(1);
});
