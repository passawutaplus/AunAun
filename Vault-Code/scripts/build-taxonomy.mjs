// Builds taxonomy/taxonomy.json from docs/dictionary/dictionary.json (python3 docs/dictionary/build.py) + docs/engine-config.json.
// Usage: node scripts/build-taxonomy.mjs   (exit 1 on any validation problem)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { buildTaxonomy, validateTaxonomy } from "../lib/engine/taxonomy.mjs";

const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const taxonomy = buildTaxonomy(read("docs/dictionary/dictionary.json"), read("docs/engine-config.json"));
const errors = validateTaxonomy(taxonomy);
if (errors.length) {
  console.error(`taxonomy invalid (${errors.length}):\n- ${errors.slice(0, 20).join("\n- ")}`);
  process.exit(1);
}
mkdirSync(new URL("../taxonomy/", import.meta.url), { recursive: true });
const json = JSON.stringify(taxonomy);
writeFileSync(new URL("../taxonomy/taxonomy.json", import.meta.url), json);
// Browser copy: taxonomy + engine constants in one file (lazy-loaded by modules/engine/client.js).
writeFileSync(new URL("../outputs/a-plus-vault/engine-data.json", import.meta.url), JSON.stringify({ taxonomy, config: read("config/engine.json") }));
console.log(`taxonomy ok: ${taxonomy.groups.length} groups, ${taxonomy.terms.length} terms, ${Object.keys(taxonomy.synonyms).length} synonyms, ${taxonomy.phrases.length} phrases`);
console.log(`size: ${(json.length / 1024).toFixed(0)} KB raw, ${(gzipSync(json).length / 1024).toFixed(0)} KB gzip`);
