#!/usr/bin/env node
/** Apply ops Hub PM schema via Supabase Management API */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "Solo-Code", ".env");
const sqlPath = join(root, "Solo-Code", "supabase", "migrations", "20260610120000_ops_hub_pm_schema.sql");

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

loadEnv(envPath);

const tokenPath = join(process.env.HOME || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("Need SUPABASE_ACCESS_TOKEN in Solo-Code/.env");
  process.exit(1);
}

if (!existsSync(sqlPath)) {
  console.error("Missing:", sqlPath);
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const res = await fetch(API, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
if (!res.ok) {
  if (/already exists|duplicate/i.test(body)) {
    console.log("~ ops schema (already applied)");
    process.exit(0);
  }
  console.error(`HTTP ${res.status}:`, body.slice(0, 800));
  process.exit(1);
}

console.log("✓ ops schema applied");
