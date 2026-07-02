#!/usr/bin/env node
/** Apply UX/security production gap SQL on remote Supabase (Management API). */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const monoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envPaths = [
  join(monoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(monoRoot, "Solo-Code", ".env"),
  join(monoRoot, "Anthem-Code", ".env"),
];

for (const p of envPaths) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const tokenPath = join(process.env.USERPROFILE || process.env.HOME || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
const QUERY_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const MIGRATION_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/migrations`;

const FILES = [
  { path: join(monoRoot, "scripts", "ecosystem", "frontend-production-gap.sql"), name: "20260701120000_frontend_production_gap" },
  { path: join(monoRoot, "scripts", "ecosystem", "chat-cv-private-storage.sql"), name: "20260701120100_chat_cv_private_storage" },
  { path: join(monoRoot, "scripts", "ecosystem", "ux-retest-schema-gap.sql"), name: "20260701130000_ux_retest_schema_gap" },
];

async function applyQuery(sql, label) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const res = await fetch(QUERY_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${label} query failed (${res.status}): ${text.slice(0, 800)}`);
  }
  if (text && text !== "[]") console.log(text.slice(0, 400));
}

async function recordMigration(name, sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const res = await fetch(MIGRATION_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, query: sql }),
  });
  const text = await res.text();
  if (res.status === 409 || /already exists/i.test(text)) {
    console.log(`  (migration ${name} already recorded — applying SQL only)`);
    await applyQuery(sql, name);
    return;
  }
  if (!res.ok) {
    throw new Error(`migration ${name} failed (${res.status}): ${text.slice(0, 800)}`);
  }
  console.log(`✓ Recorded migration ${name}`);
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing SUPABASE_ACCESS_TOKEN — run: npx supabase login");
    process.exit(1);
  }

  for (const { path, name } of FILES) {
    if (!existsSync(path)) {
      console.error("Missing:", path);
      process.exit(1);
    }
    const sql = readFileSync(path, "utf8");
    console.log(`→ Applying ${name}…`);
    await recordMigration(name, sql);
    console.log(`✓ Applied ${name}`);
  }

  console.log("\n✓ UX production fixes SQL complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
