#!/usr/bin/env node
/**
 * Summarize largest JS/CSS assets after `npm run build`.
 * Usage: node scripts/performance/analyze-bundle.mjs [dist-dir]
 */
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const dist = process.argv[2] || "dist";
const assetsDir = join(dist, "assets");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(js|css)$/.test(name)) out.push({ path: p, size: st.size, name });
  }
  return out;
}

const files = walk(assetsDir).sort((a, b) => b.size - a.size);
const total = files.reduce((s, f) => s + f.size, 0);

console.log(`\n📦 Bundle analysis: ${dist}`);
console.log(`   Total assets: ${(total / 1024 / 1024).toFixed(2)} MB (${files.length} files)\n`);
console.log("   Top chunks:");
for (const f of files.slice(0, 15)) {
  const kb = (f.size / 1024).toFixed(1);
  const flag = f.size > 500 * 1024 ? " ⚠️ >500KB" : "";
  console.log(`   ${kb.padStart(8)} KB  ${f.name}${flag}`);
}

const main = files.find((f) => /^index-.*\.js$/.test(f.name));
if (main) {
  const kb = main.size / 1024;
  console.log(`\n   Main chunk (index): ${kb.toFixed(1)} KB — gate: <500KB ideal, <800KB acceptable`);
  process.exitCode = kb > 800 ? 1 : 0;
}
