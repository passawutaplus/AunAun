#!/usr/bin/env node
/**
 * Apply anthem ecosystem SQL + optional seed on rvnzjiskqliexysicfmh.
 *
 * Requires ONE of:
 *   SUPABASE_ACCESS_TOKEN  — Management API (recommended)
 *   SUPABASE_DB_PASSWORD   — direct Postgres via pooler (needs `pg` package)
 *
 * Env file: ../scripts/ecosystem/.env.seed.local (gitignored)
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

import {
  sanitizeBundleSql,
  transformSeedSql,
  isBenignSqlError,
} from "./sql-transform.mjs";

const anthemRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const monoRoot = join(anthemRoot, "..");
const envPaths = [
  join(monoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(anthemRoot, ".env"),
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

for (const p of envPaths) loadEnv(p);

const tokenPath = join(process.env.HOME || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "rvnzjiskqliexysicfmh";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const BUNDLE = join(monoRoot, "Solo-Code", "supabase", "manual", "apply-anthem-ecosystem.sql");
const SCHEMAS_SQL = join(monoRoot, "Solo-Code", "supabase", "migrations", "20260606120000_ecosystem_schemas.sql");
const FEED_STATS_SQL = join(anthemRoot, "supabase", "migrations", "20260604240000_public_feed_stats.sql");

async function runQuery(sql, label) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN missing");
  sql = sanitizeBundleSql(sql);
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    if (isBenignSqlError(body, res.status)) {
      console.log(`~ ${label} (benign: ${res.status})`);
      return;
    }
    throw new Error(`${label} HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  console.log(`✓ ${label}`);
}

async function applyViaApi() {
  if (!existsSync(BUNDLE)) {
    throw new Error(`Missing bundle: ${BUNDLE}`);
  }
  const raw = readFileSync(BUNDLE, "utf8");
  const parts = raw.split(/(?=-- ── )/).map((p) => p.trim()).filter(Boolean);

  if (existsSync(SCHEMAS_SQL)) {
    await runQuery(readFileSync(SCHEMAS_SQL, "utf8"), "ecosystem schemas");
  }

  let ok = 0;
  let skip = 0;
  for (let i = 0; i < parts.length; i++) {
    const sql = parts[i];
    if (i === 0) {
      skip++;
      continue;
    }
    if (/^-- skipped\b/i.test(sql.trim())) {
      skip++;
      continue;
    }
    const title = sql.split("\n")[0].slice(0, 72);
    try {
      await runQuery(sql, `[${i}] ${title}`);
      ok++;
    } catch (e) {
      const msg = String(e.message || e);
      if (isBenignSqlError(msg, 400)) {
        skip++;
        console.log(`~ [${i}] skip: ${title}`);
        continue;
      }
      throw e;
    }
  }
  console.log(`Bundle: ${ok} chunks applied, ${skip} skipped`);

  if (existsSync(FEED_STATS_SQL)) {
    await runQuery(readFileSync(FEED_STATS_SQL, "utf8"), "public_feed_stats");
  }

  await runQuery(
    `
GRANT USAGE ON SCHEMA anthem TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA anthem TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA anthem TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA anthem TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
`,
    "anthem schema grants",
  );
}

async function applyViaPg() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("SUPABASE_DB_PASSWORD missing");
  let pg;
  try {
    pg = (await import("pg")).default;
  } catch {
    throw new Error("Install pg: npm install pg --no-save");
  }
  const pooler =
    process.env.SUPABASE_DB_URL ||
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;
  const client = new pg.Client({ connectionString: pooler, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected via Postgres pooler");
  const files = [SCHEMAS_SQL, BUNDLE, FEED_STATS_SQL].filter(existsSync);
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    console.log(`Running ${file.split("/").pop()} ...`);
    await client.query(sql);
    console.log(`✓ ${file.split("/").pop()}`);
  }
  await client.end();
}

async function verify() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const { createClient } = await import("@supabase/supabase-js");
  const anthem = createClient(url, key, { db: { schema: "anthem" } });
  const { count, error } = await anthem
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "Published");
  if (error) {
    console.warn("Verify:", error.message);
  } else {
    console.log("Published projects (anthem):", count ?? 0);
  }
}

async function runSeed() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/run-seed.mjs"], {
      cwd: anthemRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed exit ${code}`))));
  });
}

async function main() {
  console.log("Project:", PROJECT_REF);
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    await applyViaApi();
  } else if (process.env.SUPABASE_DB_PASSWORD) {
    await applyViaPg();
  } else {
    console.error(`
Need credentials to create anthem tables on remote:

  export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens
  npm run db:apply-anthem

Or:

  export SUPABASE_DB_PASSWORD=...        # Project Settings → Database
  npm install pg --no-save
  npm run db:apply-anthem
`);
    process.exit(1);
  }

  await verify();
  console.log("\n→ Running seed:demo ...");
  try {
    await runSeed();
  } catch (e) {
    console.warn("Seed partial:", e.message || e);
  }
  await verify();
  console.log("\nDone. Refresh the app home feed (hard refresh if cached).");
}

main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
