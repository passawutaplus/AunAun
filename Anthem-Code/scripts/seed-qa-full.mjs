#!/usr/bin/env node
/**
 * Full QA dataset: schema gaps + 50 users + activity (profiles, projects, social, jobs, chat, wallet).
 * Requires SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD (see apply-anthem-remote.mjs).
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

const SEED_FILES = [
  "20260604130100_seed_community_catalog.sql",
  "20260604200000_seed_art_design_enriched.sql",
  "20260604250000_seed_20_users_full_activity.sql",
].map((f) => join(anthemRoot, "supabase", "migrations", f));

async function runQuery(sql, label) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN missing");
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
      console.log(`~ ${label}`);
      return false;
    }
    throw new Error(`${label}: ${body.slice(0, 600)}`);
  }
  console.log(`✓ ${label}`);
  return true;
}

async function applyBundleChunks(indices) {
  const raw = readFileSync(BUNDLE, "utf8");
  const parts = raw.split(/(?=-- ── )/).map((p) => p.trim()).filter(Boolean);
  for (const i of indices) {
    if (i >= parts.length) continue;
    const sql = sanitizeBundleSql(parts[i]);
    const title = parts[i].split("\n")[0].slice(0, 60);
    try {
      await runQuery(sql, `chunk[${i}] ${title}`);
    } catch (e) {
      if (isBenignSqlError(String(e.message), 400)) {
        console.log(`~ chunk[${i}] skip`);
      } else {
        throw e;
      }
    }
  }
}

async function applySeedMigrations() {
  for (const file of SEED_FILES) {
    if (!existsSync(file)) continue;
    const sql = transformSeedSql(readFileSync(file, "utf8"));
    await runQuery(sql, `seed ${file.split("/").pop()}`);
  }
}

async function grantAll() {
  await runQuery(
    `
GRANT USAGE ON SCHEMA anthem TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA shared TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA anthem TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA shared TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA anthem TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA shared TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA anthem TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA shared TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anthem GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA shared GRANT SELECT ON TABLES TO anon;
`,
    "schema grants",
  );
}

async function runNodeSeed() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/run-seed.mjs"], {
      cwd: anthemRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`run-seed exit ${code}`))));
  });
}

async function report() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const { createClient } = await import("@supabase/supabase-js");
  const ant = createClient(url, key, { db: { schema: "anthem" } });
  const pub = createClient(url, key, { db: { schema: "public" } });
  const shared = createClient(url, key, { db: { schema: "shared" } });

  const count = async (sb, table, eq) => {
    const col = ["project_likes", "follows", "studio_members", "collection_items"].includes(table)
      ? "*"
      : "id";
    let q = sb.from(table).select(col, { count: "exact", head: true });
    if (eq) q = q.eq(eq.col, eq.val);
    const r = await q;
    return r.error ? `ERR:${r.error.message}` : r.count;
  };

  const demoUsers = await pub
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .like("email", "%@demo.pixel100.com");

  console.log("\n=== QA dataset summary ===");
  console.log({
    demo_users: demoUsers.count,
    projects_published: await count(ant, "projects", { col: "status", val: "Published" }),
    studios: await count(ant, "studios"),
    job_posts: await count(ant, "job_posts"),
    follows: await count(ant, "follows"),
    likes: await count(ant, "project_likes"),
    comments: await count(ant, "project_comments"),
    collabs: await count(ant, "collab_requests"),
    hires: await count(ant, "hiring_requests"),
    collections: await count(ant, "collections"),
    inspire_boards: await count(ant, "inspire_boards"),
    conversations: await count(shared, "conversations"),
    messages: await count(shared, "messages"),
    wallets: await count(shared, "wallets"),
    notifications: await count(shared, "notifications"),
  });

  const stats = await pub.rpc("public_feed_stats");
  console.log("public_feed_stats:", stats.data ?? stats.error?.message);
  console.log("\nSet reviewer passwords with DEMO_SEED_PASSWORD after seeding.");
  console.log("Admin: passawut.a.plus@gmail.com (your password)");
  console.log("Studio URL example: /s/doi-studio");
}

async function main() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error("Set SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)");
    process.exit(1);
  }

  console.log("=== QA full seed:", PROJECT_REF, "===\n");

  await runQuery(
    sanitizeBundleSql(`
ALTER TABLE anthem.job_posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'hiring',
  ADD COLUMN IF NOT EXISTS poster_role text NOT NULL DEFAULT 'studio',
  ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS attached_cv_url text,
  ADD COLUMN IF NOT EXISTS attached_portfolio_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE anthem.job_posts ALTER COLUMN studio_id DROP NOT NULL;

ALTER TABLE shared.wallets ADD COLUMN IF NOT EXISTS purchased_px integer NOT NULL DEFAULT 0;
ALTER TABLE shared.wallets ADD COLUMN IF NOT EXISTS earned_px integer NOT NULL DEFAULT 0;
UPDATE shared.wallets SET purchased_px = COALESCE(balance_px, 0) WHERE purchased_px = 0;
ALTER TABLE shared.wallets DROP COLUMN IF EXISTS balance_px;
ALTER TABLE shared.wallets ADD COLUMN balance_px integer GENERATED ALWAYS AS (purchased_px + earned_px) STORED;
`),
    "job_posts + wallet columns",
  );

  // Re-apply chunks that often fail / were skipped (studios, jobs, chat, wallet, gifts, collections)
  const chunkIndices = [5, 7, 8, 12, 13, 17, 19, 20, 21, 24, 25, 28, 33, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48];
  console.log("→ Applying missing schema chunks...");
  await applyBundleChunks(chunkIndices);

  console.log("\n→ Applying seed migrations (transformed)...");
  await applySeedMigrations();

  console.log("\n→ REST seed (catalog baseline)...");
  try {
    await runNodeSeed();
  } catch (e) {
    console.warn("run-seed:", e.message);
  }

  console.log("\n→ Grants...");
  await grantAll();

  await report();
}

main().catch((e) => {
  console.error("QA seed failed:", e.message || e);
  process.exit(1);
});
