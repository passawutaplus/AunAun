#!/usr/bin/env node
/**
 * Apply scripts/ecosystem/kyc-verification-full.sql to remote Supabase.
 * Env: scripts/ecosystem/.env.seed.local (SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD)
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { isBenignSqlError } from "../../Anthem-Code/scripts/sql-transform.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..", "..");
const envPath = join(scriptDir, ".env.seed.local");
const sqlPath = process.argv[2]
  ? join(scriptDir, process.argv[2])
  : join(scriptDir, "kyc-verification-full.sql");
const soloEnv = join(root, "Solo-Code", ".env");
const anthemEnv = join(root, "Anthem-Code", ".env");

function loadEnv(path) {
  if (!existsSync(path)) return;
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv(envPath);
loadEnv(soloEnv);
loadEnv(anthemEnv);

const tokenPath = join(process.env.HOME || process.env.USERPROFILE || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

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
      console.warn(`~ ${label} (benign ${res.status}): ${body.slice(0, 300)}`);
      return;
    }
    throw new Error(`${label} HTTP ${res.status}: ${body.slice(0, 800)}`);
  }
  console.log(`✓ ${label}`);
}

async function main() {
  if (!existsSync(sqlPath)) {
    console.error("Missing:", sqlPath);
    process.exit(1);
  }
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error("SUPABASE_ACCESS_TOKEN missing — set in Solo-Code/.env or scripts/ecosystem/.env.seed.local");
    process.exit(1);
  }
  const sql = readFileSync(sqlPath, "utf8");
  const label = process.argv[2] ?? "kyc-verification-full.sql";
  console.log("Applying", label, "to", PROJECT_REF);
  await runQuery(sql, label.replace(/\.sql$/, ""));
  console.log("Done.");
}

main().catch((e) => {
  console.error("Failed:", e.message || e);
  process.exit(1);
});
