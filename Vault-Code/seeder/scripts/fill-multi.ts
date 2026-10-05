/**
 * Like fill-discover.ts, but ONE category per process, rotating through many short queries (Openverse caps every query at ~240 results)
 * and processing a few items at a time. Same gates, AI and caps; stopReason() is re-checked before every item.
 * WRITES to Supabase and spends Anthropic credit.
 *
 * Usage: node --env-file=.env.local --import tsx scripts/fill-multi.ts <category> [concurrency]
 */
import { createClient } from "@supabase/supabase-js";
import { getAdapter } from "../src/seeder/adapters";
import { AnthropicAi } from "../src/seeder/ai";
import { processCandidate } from "../src/seeder/pipeline";
import { SupabaseSeederRepo } from "../src/seeder/repo";

const BATCH = 20;
const SOURCE = (process.env.FILL_SOURCE || "ov") as "ov" | "chndm";
// Cooper Hewitt (CC0 design museum): strong in wallcoverings, textiles, prints and drawings; it holds almost no posters or typefaces.
const CHNDM_QUERIES: Record<string, string[]> = {
  pattern: ["sidewall", "wallpaper", "pattern"],
  print: ["print", "trade card", "label", "book cover"],
  illustration: ["drawing", "sketchbook folio"],
  typography: ["alphabet", "lettering", "calligraphy"],
  poster: ["advertisement"],
  textile: ["textile", "embroidery", "lace"],
  ceramic: ["ceramic"],
  furniture: ["chair"],
};
const OV_QUERIES: Record<string, string[]> = {
  poster: ["poster design", "event poster", "typographic poster", "concert poster", "film poster", "minimalist poster", "festival poster", "exhibition poster"],
  typography: ["typography", "lettering", "calligraphy", "type specimen", "signage lettering", "hand lettering", "font design", "logotype"],
  illustration: ["illustration", "digital art", "vector illustration", "editorial illustration", "character illustration", "concept art", "children's book illustration", "abstract art"],
  pattern: ["geometric pattern", "seamless pattern", "textile pattern", "abstract pattern", "floral pattern", "wallpaper pattern", "ornament pattern", "tile pattern"],
  print: ["branding", "logo design", "packaging design", "book cover", "magazine layout", "business card", "brochure design", "infographic"],
};

async function main() {
  const category = process.argv[2];
  const concurrency = Math.max(1, Number(process.argv[3] ?? 3));
  const queries = (SOURCE === "chndm" ? CHNDM_QUERIES : OV_QUERIES)[category];
  if (!queries) throw new Error(`Unknown category: ${category}`);
  if (SOURCE === "ov") process.env.OPENVERSE_SOURCES ||= "wikimedia,stocksnap";
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const repo = new SupabaseSeederRepo();
  const ai = new AnthropicAi();
  const categories = await repo.categories();
  const totals = { published: 0, review: 0, rejected: 0, errors: 0 };
  let stop: string | null = null;

  for (const query of queries) {
    if (stop) break;
    await db.from("seed_targets").update({ query, cursor: 0, exhausted: false, enabled: true }).eq("category", category).eq("source", SOURCE);
    const retries = new Map<number, number>();
    for (;;) {
      if (stop) break;
      const target = await repo.target(category, SOURCE);
      if (!target || target.exhausted) break;
      const batch = await getAdapter(SOURCE).fetchBatch(target.query, target.cursor, BATCH);
      const existing = await repo.existingSourceIds(SOURCE, batch.candidates.map((c) => c.sourceId));
      const fresh = batch.candidates.filter((c) => !existing.has(c.sourceId));
      let finished = true;
      const errorsBefore = totals.errors;
      for (let i = 0; i < fresh.length && !stop; i += concurrency) {
        const gate = await repo.stopReason();
        if (gate.reason) { stop = gate.reason; finished = false; break; }
        await Promise.all(
          fresh.slice(i, i + concurrency).map(async (c) => {
            try {
              const o = await processCandidate(c, { category, categories }, { repo, ai });
              totals[o.status]++;
            } catch (err) {
              totals.errors++;
              console.log(`  ERROR ${c.sourceId}: ${(err as Error).message.slice(0, 100)}`);
            }
          }),
        );
      }
      // Never skip images that failed (e.g. rate limited): retry the same batch a few times, with a pause.
      const failed = totals.errors - errorsBefore;
      if (finished && failed > 0 && (retries.get(target.cursor) ?? 0) < 4) {
        retries.set(target.cursor, (retries.get(target.cursor) ?? 0) + 1);
        console.log(`${category} "${query}"@${target.cursor}: ${failed} failed, pausing then retrying this batch`);
        await new Promise((r) => setTimeout(r, 30000));
        continue;
      }
      await repo.recordBatch(category, SOURCE, { fromCursor: target.cursor, nextCursor: finished ? batch.nextCursor : target.cursor, scanned: batch.scanned, skipped: batch.skipped });
      console.log(`${category} "${query}"@${target.cursor}: fresh ${fresh.length} | published ${totals.published} review ${totals.review} rejected ${totals.rejected} errors ${totals.errors}`);
      if (batch.nextCursor === null) break;
    }
  }
  const end = await repo.stopReason();
  console.log(`finished ${category}${stop ? ` (stopped: ${stop})` : ""}: published ${totals.published}, review ${totals.review}, rejected ${totals.rejected}, errors ${totals.errors}; month $${end.usage.monthUsd.toFixed(2)}`);
}

main().catch((err) => {
  console.error(String(err?.message || err).slice(0, 300));
  process.exit(1);
});
