/**
 * Prints normalized candidates for one batch. No database or storage writes.
 * Usage: npm run seeder:dry -- met "poster" 0 [size]
 */
import { getAdapter, isSourceKey } from "../src/seeder/adapters";
import { licenseGate } from "../src/seeder/license";

async function main() {
  const [source = "met", query = "poster", cursorArg = "0", sizeArg = "10"] = process.argv.slice(2);
  if (!isSourceKey(source)) throw new Error(`Unknown source: ${source}`);
  const adapter = getAdapter(source);
  const result = await adapter.fetchBatch(query, Number(cursorArg), Number(sizeArg));

  console.log(
    `source=${source} query="${query}" total=${result.total} scanned=${result.scanned} skipped=${result.skipped} nextCursor=${result.nextCursor}`,
  );
  for (const c of result.candidates) {
    const gate = licenseGate(c);
    console.log(
      JSON.stringify(
        {
          sourceId: c.sourceId,
          gate: gate.ok ? "pass" : gate.reason,
          title: c.title,
          license: c.license,
          attribution: c.attribution,
          sourceUrl: c.sourceUrl,
          image: c.originalImageUrl,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
