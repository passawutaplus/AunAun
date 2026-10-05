/** Read-only: prints the first candidates a source returns for a query (no DB writes, no AI). Usage: tsx scripts/peek-source.ts <source> <query> [cursor] */
import { getAdapter, isSourceKey } from "../src/seeder/adapters";

async function main() {
  const [source = "chndm", query = "poster", cursor = "0"] = process.argv.slice(2);
  if (!isSourceKey(source)) throw new Error(`Unknown source: ${source}`);
  const b = await getAdapter(source).fetchBatch(query, Number(cursor), 20);
  console.log(`scanned ${b.scanned}, skipped ${b.skipped}, candidates ${b.candidates.length}, next ${b.nextCursor}`);
  for (const c of b.candidates) console.log(`- ${c.title.slice(0, 70)} | ${c.license} | ${(c.attributionJson as { date?: string })?.date ?? ""}`);
}
main().catch((e) => { console.error(String(e?.message || e).slice(0, 300)); process.exit(1); });
