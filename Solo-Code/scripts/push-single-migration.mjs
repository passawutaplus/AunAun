#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ref = process.env.SUPABASE_PROJECT_REF ?? "zkflkpbmbozrchqncpzi";
const migrationFile =
  process.argv[2] ??
  resolve(__dirname, "../supabase/migrations/20260627100000_community_area_post_enhancements.sql");

function loadToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const envPath = resolve(__dirname, "../.env");
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^SUPABASE_ACCESS_TOKEN="?([^"\n]+)"?/m);
    if (m) return m[1];
  }
  return null;
}

const token = loadToken();
if (!token) {
  console.error("ไม่พบ SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${ref}`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const name = basename(migrationFile, ".sql");

const listRes = await fetch(`${API}/database/query`, {
  method: "POST",
  headers,
  body: JSON.stringify({ query: "SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;" }),
});
const listBody = await listRes.json();
if (!listRes.ok) {
  console.error("list migrations failed:", listRes.status, listBody);
  process.exit(1);
}
const applied = new Set((Array.isArray(listBody) ? listBody : []).map((r) => r.name));
if (applied.has(name)) {
  console.log("✓ migration มีอยู่แล้ว:", name);
  process.exit(0);
}

const sql = readFileSync(migrationFile, "utf8");
const pushRes = await fetch(`${API}/database/migrations`, {
  method: "POST",
  headers,
  body: JSON.stringify({ query: sql, name }),
});
const pushText = await pushRes.text();
if (!pushRes.ok) {
  console.error("push failed:", pushRes.status, pushText.slice(0, 800));
  process.exit(1);
}
console.log("✓ Applied migration:", name);
