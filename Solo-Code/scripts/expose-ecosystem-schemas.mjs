#!/usr/bin/env node
/**
 * Ensure PostgREST exposes shared, anthem, so1o (and ops) on unified project.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/expose-ecosystem-schemas.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ref = process.env.SUPABASE_PROJECT_REF ?? "zkflkpbmbozrchqncpzi";

function loadToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const envPath = resolve(__dirname, "../.env");
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^SUPABASE_ACCESS_TOKEN="?([^"\n]+)"?/m);
    if (m) return m[1];
  }
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    const p = resolve(home, ".config/supabase/access-token");
    if (existsSync(p)) return readFileSync(p, "utf8").trim();
  }
  return null;
}

const token = loadToken();
if (!token) {
  console.error("ไม่พบ SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const REQUIRED = ["public", "graphql_public", "shared", "anthem", "so1o", "ops"];
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const getRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, { headers });
if (!getRes.ok) {
  console.error("GET postgrest failed:", getRes.status, await getRes.text());
  process.exit(1);
}

const current = await getRes.json();
const schemas = String(current.db_schema ?? "public")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

for (const s of REQUIRED) {
  if (!schemas.includes(s)) schemas.push(s);
}
const db_schema = schemas.join(",");

if (db_schema === current.db_schema) {
  console.log("✓ db_schema ครบแล้ว:", db_schema);
  process.exit(0);
}

console.log("→ อัปเดต db_schema:", current.db_schema, "→", db_schema);
const patchRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ db_schema }),
});

if (!patchRes.ok) {
  console.error("PATCH postgrest failed:", patchRes.status, await patchRes.text());
  process.exit(1);
}

const updated = await patchRes.json();
console.log("✓ อัปเดตสำเร็จ:", updated.db_schema);
