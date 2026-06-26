#!/usr/bin/env node
/**
 * Full demo seed: 20 creators + complete activity for UX review.
 * Requires SUPABASE_ACCESS_TOKEN (SQL) + service role (REST).
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { transformSeedSql, isBenignSqlError } from "./sql-transform.mjs";
import { loadSeedEnv, getSupabaseClients, anthemRoot } from "./seed-demo-env.mjs";
import { DEMO_EMAIL_SUFFIX } from "./demo-catalog-ids.mjs";

loadSeedEnv();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const MIGRATIONS = [
  "20260604240000_public_feed_stats.sql",
  "20260604130100_seed_community_catalog.sql",
  "20260604200000_seed_art_design_enriched.sql",
  "20260604250000_seed_20_users_full_activity.sql",
  "20260604260000_profiles_profile_faq.sql",
].map((f) => join(anthemRoot, "supabase", "migrations", f));

async function runQuery(sql, label) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.warn(`  ~ skip SQL (${label}): no SUPABASE_ACCESS_TOKEN`);
    return false;
  }
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    if (isBenignSqlError(body, res.status)) {
      console.log(`  ~ ${label} (benign)`);
      return false;
    }
    throw new Error(`${label}: ${body.slice(0, 500)}`);
  }
  console.log(`  ✓ ${label}`);
  return true;
}

async function applyMigrations() {
  console.log("\n→ SQL migrations");
  for (const file of MIGRATIONS) {
    if (!existsSync(file)) {
      console.warn(`  ~ missing ${file.split(/[/\\]/).pop()}`);
      continue;
    }
    const sql = transformSeedSql(readFileSync(file, "utf8"));
    await runQuery(sql, file.split(/[/\\]/).pop());
  }
}

function runNode(script, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(anthemRoot, "scripts", script)], {
      cwd: anthemRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exit ${code}`));
    });
  });
}

async function report() {
  const { anthemDb, publicDb, sharedDb } = getSupabaseClients(createClient);

  const count = async (sb, table) => {
    const { count: n, error } = await sb.from(table).select("id", { count: "exact", head: true });
    return error ? `ERR:${error.message}` : n;
  };

  const demoUsers = await publicDb
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .like("email", `%${DEMO_EMAIL_SUFFIX}`);

  console.log("\n=== Demo dataset summary (20 users) ===");
  console.log({
    demo_users: demoUsers.count,
    projects_published: await anthemDb
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "Published")
      .then((r) => r.count),
    community_posts: await count(anthemDb, "community_posts"),
    studios: await count(anthemDb, "studios"),
    job_posts: await count(anthemDb, "job_posts"),
    follows: await count(anthemDb, "follows"),
    likes: await count(anthemDb, "project_likes"),
    comments: await count(anthemDb, "project_comments"),
    collabs: await count(anthemDb, "collab_requests"),
    hires: await count(anthemDb, "hiring_requests"),
    collections: await count(anthemDb, "collections"),
    inspire_boards: await count(anthemDb, "inspire_boards"),
    conversations: await count(sharedDb, "conversations"),
    messages: await count(sharedDb, "messages"),
    wallets: await count(sharedDb, "wallets"),
    notifications: await count(sharedDb, "notifications"),
    gift_transactions: await count(sharedDb, "gift_transactions"),
    job_applications: await count(anthemDb, "job_applications"),
  });

  const stats = await publicDb.rpc("public_feed_stats");
  console.log("public_feed_stats:", stats.data ?? stats.error?.message);
  console.log(`\nLogin: phatsawut${DEMO_EMAIL_SUFFIX} / ${process.env.DEMO_SEED_PASSWORD}`);
  console.log("Demo URL: https://1px-demo.vercel.app");
}

async function main() {
  console.log("=== Pixel100 demo full seed (20 creators) ===\n");

  await applyMigrations();

  console.log("\n→ Baseline catalog (REST)");
  await runNode("run-seed.mjs", "run-seed");

  console.log("\n→ Demo profiles (social, FAQ, experience)");
  await runNode("seed-demo-profiles.mjs", "seed-demo-profiles");

  console.log("\n→ Activity layer");
  await runNode("seed-demo-activity.mjs", "seed-demo-activity");

  console.log("\n→ Community posts");
  await runNode("seed-demo-community.mjs", "seed-demo-community");

  console.log("\n→ Demo chats");
  await runNode("seed-demo-chats.mjs", "seed-demo-chats");

  try {
    console.log("\n→ Job card covers");
    await runNode("seed-job-cards-demo.mjs", "seed-job-cards-demo");
  } catch (e) {
    console.warn("  ~ job cards:", e.message);
  }

  try {
    console.log("\n→ Fix broken images");
    await runNode("fix-demo-images.mjs", "fix-demo-images");
  } catch (e) {
    console.warn("  ~ fix images:", e.message);
  }

  await report();
}

main().catch((e) => {
  console.error("\nDemo full seed failed:", e.message || e);
  process.exit(1);
});
