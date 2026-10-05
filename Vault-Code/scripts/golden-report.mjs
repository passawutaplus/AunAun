// Usage: node scripts/golden-report.mjs docs/golden/golden.json predicted.json
// predicted.json: { "<image id>": ["arc.house", ...] }  (export tags_ids of the same images)
import { readFileSync } from "node:fs";
import { defaultTaxonomy } from "../lib/engine/enrich.mjs";
import { formatReport, reportGolden } from "../lib/engine/golden.mjs";

const [goldenPath, predictedPath] = process.argv.slice(2);
if (!goldenPath || !predictedPath) {
  console.error("usage: node scripts/golden-report.mjs <golden.json> <predicted.json>");
  process.exit(2);
}
const read = p => JSON.parse(readFileSync(p, "utf8"));
console.log(formatReport(reportGolden(read(goldenPath), read(predictedPath), defaultTaxonomy())));
