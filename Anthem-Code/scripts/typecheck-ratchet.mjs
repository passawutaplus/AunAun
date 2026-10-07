#!/usr/bin/env node
/**
 * Typecheck ratchet: the error count may go down, never up.
 *   node scripts/typecheck-ratchet.mjs           # CI: fail if count > baseline
 *   node scripts/typecheck-ratchet.mjs --update  # lower the baseline after fixing errors
 * Most remaining errors are tables/RPCs the database lacks (docs/db-drift-2026-10-07.md);
 * when those are restored the baseline should reach 0 and this script can be replaced by plain tsc.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(root, "typecheck-baseline.json");
const update = process.argv.includes("--update");

const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.app.json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 256 * 1024 * 1024,
});
const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
const count = (out.match(/error TS\d+:/g) ?? []).length;

let baseline = Infinity;
try {
  baseline = JSON.parse(readFileSync(baselinePath, "utf8")).errors;
} catch {
  /* no baseline yet */
}

if (update) {
  writeFileSync(baselinePath, `${JSON.stringify({ errors: count }, null, 2)}\n`);
  console.log(`typecheck baseline set to ${count}`);
  process.exit(0);
}

console.log(`typecheck errors: ${count} (baseline ${baseline})`);
if (count > baseline) {
  console.error(out.split("\n").filter((l) => /error TS\d+:/.test(l)).slice(0, 60).join("\n"));
  console.error(`\nFAIL: ${count - baseline} new TypeScript error(s). Fix them (do not raise the baseline).`);
  process.exit(1);
}
if (count < baseline) console.log("Errors went down — run `node scripts/typecheck-ratchet.mjs --update` and commit the new baseline.");
