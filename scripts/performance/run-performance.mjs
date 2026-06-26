#!/usr/bin/env node
/**
 * Performance smoke: curl timing + optional Lighthouse + optional k6.
 * Usage: node scripts/performance/run-performance.mjs
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "scripts/performance/results");
mkdirSync(outDir, { recursive: true });

const TARGETS = [
  { name: "1PX", url: process.env.PX_BASE_URL || "https://aplus1-demo.vercel.app", paths: ["/", "/jobs", "/research"] },
  { name: "So1o", url: process.env.SO1O_BASE_URL || "https://solo-demo-liart.vercel.app", paths: ["/", "/pricing", "/help"] },
];

function loadEnv() {
  const envPath = join(root, "Solo-Code/.env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();

async function curlTiming(label, url) {
  const start = Date.now();
  const r = spawnSync("curl", ["-sS", "-o", "/dev/null", "-w", "%{http_code} %{time_starttransfer} %{time_total}", "-L", url], {
    timeout: 30000,
  });
  const text = (r.stdout?.toString() || "").trim();
  const [code, ttfb, total] = text.split(" ");
  const ms = { ttfb: Math.round(parseFloat(ttfb) * 1000), total: Math.round(parseFloat(total) * 1000) };
  const pass = code === "200" && ms.ttfb < 1200;
  return { label, url, code, ...ms, pass };
}

function runLighthouse(name, url) {
  const out = join(outDir, `lighthouse-${name.toLowerCase()}.json`);
  const seoThreshold = Number(process.env.LH_SEO_MIN ?? 80);
  try {
    execSync(
      `npx --yes lighthouse "${url}" --only-categories=performance,seo --form-factor=mobile --screenEmulation.mobile=true --throttling.cpuSlowdownMultiplier=4 --output=json --output-path="${out}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`,
      { stdio: "pipe", timeout: 180000, cwd: root },
    );
    const data = JSON.parse(readFileSync(out, "utf8"));
    const perf = Math.round((data.categories?.performance?.score ?? 0) * 100);
    const seo = Math.round((data.categories?.seo?.score ?? 0) * 100);
    const audits = data.audits || {};
    const lcp = audits["largest-contentful-paint"]?.numericValue;
    const cls = audits["cumulative-layout-shift"]?.numericValue;
    const inp = audits["interaction-to-next-paint"]?.numericValue ?? audits["experimental-interaction-to-next-paint"]?.numericValue;
    const perfPass = perf >= 70;
    const seoPass = seo >= seoThreshold;
    return {
      name,
      url,
      score: perf,
      seoScore: seo,
      lcpMs: lcp ? Math.round(lcp) : null,
      cls: cls != null ? Number(cls.toFixed(3)) : null,
      inpMs: inp ? Math.round(inp) : null,
      pass: perfPass && seoPass,
      perfPass,
      seoPass,
      seoThreshold,
      out,
    };
  } catch (e) {
    return { name, url, error: String(e.message || e).slice(0, 200), pass: false };
  }
}

function hasK6() {
  try {
    execSync("k6 version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function runK6(script, extraEnv = {}) {
  const envVars = { ...process.env, ...extraEnv };
  if (env.VITE_SUPABASE_PUBLISHABLE_KEY) envVars.SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const parts = Object.entries(envVars)
    .filter(([k]) => k.startsWith("SUPABASE") || k.endsWith("_BASE_URL"))
    .map(([k, v]) => `-e ${k}=${v}`);
  try {
    execSync(`k6 run ${parts.join(" ")} "${join(root, "scripts/performance", script)}"`, {
      stdio: "inherit",
      timeout: 300000,
      cwd: root,
    });
    return true;
  } catch {
    return false;
  }
}

console.log("=== Performance test run ===\n");

// 1. HTTP timing
console.log("→ HTTP timing (curl)");
const timingRows = [];
for (const t of TARGETS) {
  for (const p of t.paths) {
    const row = await curlTiming(`${t.name} ${p}`, `${t.url}${p}`);
    timingRows.push(row);
    const icon = row.pass ? "✓" : "✗";
    console.log(`  ${icon} ${row.label}: HTTP ${row.code} TTFB ${row.ttfb}ms total ${row.total}ms`);
  }
}

// 2. Lighthouse (landing only — faster)
console.log("\n→ Lighthouse (mobile, landing — performance + SEO)");
const lhRows = [];
for (const t of TARGETS) {
  process.stdout.write(`  … ${t.name} `);
  const row = runLighthouse(t.name, t.url);
  lhRows.push(row);
  if (row.error) console.log(`skip (${row.error.slice(0, 60)}…)`);
  else {
    const icon = row.pass ? "✓" : "✗";
    console.log(`${icon} perf ${row.score} seo ${row.seoScore} LCP ${row.lcpMs}ms CLS ${row.cls}`);
  }
}

// 3. k6 (optional)
let k6Ok = null;
if (hasK6()) {
  console.log("\n→ k6 load (50 VU peak)");
  k6Ok = runK6("k6-1px-browse.js") && runK6("k6-so1o-browse.js");
} else {
  console.log("\n→ k6 not installed (skip). Install: https://k6.io/docs/get-started/installation/");
}

const report = {
  at: new Date().toISOString(),
  timing: timingRows,
  lighthouse: lhRows,
  k6: k6Ok,
};
const reportPath = join(outDir, `report-${Date.now()}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n✓ Report: ${reportPath}`);

const timingFail = timingRows.filter((r) => !r.pass).length;
const lhFail = lhRows.filter((r) => !r.pass).length;
if (timingFail || lhFail) process.exitCode = 1;
