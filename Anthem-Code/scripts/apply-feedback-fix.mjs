#!/usr/bin/env node
/** Apply 20260604280000_fix_submit_feedback_unified.sql on remote (anthem schema). */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { sanitizeBundleSql, isBenignSqlError } from "./sql-transform.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const monoRoot = join(root, "..");
const envPaths = [
  join(monoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(root, ".env"),
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

const tokenPath = join(process.env.HOME || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "rvnzjiskqliexysicfmh";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const SQL_PATH = join(root, "supabase/migrations/20260604280000_fix_submit_feedback_unified.sql");

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Need SUPABASE_ACCESS_TOKEN");
    process.exit(1);
  }

  let sql = readFileSync(SQL_PATH, "utf8");
  sql = sanitizeBundleSql(sql);

  // Drop duplicate RPC in anthem schema if bundle created it
  sql =
    "DROP FUNCTION IF EXISTS anthem.submit_feedback(text, text, int, text, uuid, text, text);\n" + sql;

  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    if (/already exists|duplicate_object/i.test(body)) {
      console.log("~ benign duplicate:", body.slice(0, 120));
    } else {
      console.error("Failed:", body.slice(0, 800));
      process.exit(1);
    }
  }
  console.log("✓ submit_feedback fix applied on", PROJECT_REF);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
