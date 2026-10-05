// Usage: node scripts/eval-search.mjs [docs/eval/queries.json]   (exit 1 when a query regresses)
import { readFileSync } from "node:fs";
import { defaultTaxonomy } from "../lib/engine/enrich.mjs";
import { engineConfig } from "../lib/engine/config.mjs";
import { evalQueries } from "../lib/engine/eval.mjs";

const file = process.argv[2] || "docs/eval/queries.json";
const res = evalQueries(JSON.parse(readFileSync(file, "utf8")), defaultTaxonomy(), engineConfig);
for (const r of res.rows) if (!r.ok) console.log(`FAIL ${r.q}\n   missing ${r.missing.join(" ")} | not-excluded ${r.wrongExclude.join(" ")} | leaked ${r.leaked.join(" ")} | hex ${r.hexMissing.join(" ")}`);
console.log(`${res.passed}/${res.total} queries ok, recall ${(res.recall * 100).toFixed(0)}%`);
process.exit(res.passed === res.total ? 0 : 1);
