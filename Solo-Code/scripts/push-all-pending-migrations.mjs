#!/usr/bin/env node
/** Push all pending migrations via Supabase Management API (Windows-friendly). */
import { readFileSync, existsSync, readdirSync } from "fs";
import { dirname, join, basename } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const migDir = join(root, "supabase", "migrations");

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim().replace(/^\uFEFF/, "");
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[key] = v;
  }
}

loadEnv(envPath);

const home = process.env.USERPROFILE || process.env.HOME || "";
const tokenPath = join(home, ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  process.env.VITE_SUPABASE_PROJECT_ID ||
  "zkflkpbmbozrchqncpzi";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

if (!token) {
  console.error("Need SUPABASE_ACCESS_TOKEN in Solo-Code/.env or run: npx supabase login");
  process.exit(1);
}

async function listApplied() {
  const res = await fetch(`${API}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`list migrations HTTP ${res.status}: ${text.slice(0, 500)}`);
  const rows = JSON.parse(text);
  if (!Array.isArray(rows)) throw new Error(`unexpected response: ${text.slice(0, 200)}`);
  return new Set(rows.map((r) => r.name));
}

async function applyMigration(name, sql) {
  const res = await fetch(`${API}/database/migrations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, query: sql }),
  });
  const text = await res.text();
  if (!res.ok && res.status !== 201) {
    if (res.status === 400 && /already exists/i.test(text)) {
      console.log(`~ ${name} (objects exist — stamping migration record)`);
      const stamp = await fetch(`${API}/database/migrations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          query: `SELECT 1; -- stamp ${name}: objects already present`,
        }),
      });
      const stampText = await stamp.text();
      if (!stamp.ok && stamp.status !== 201) {
        throw new Error(`stamp ${name} HTTP ${stamp.status}: ${stampText.slice(0, 800)}`);
      }
      return;
    }
    throw new Error(`apply ${name} HTTP ${res.status}: ${text.slice(0, 800)}`);
  }
}

console.log(`→ Project ${PROJECT_REF}`);
const applied = await listApplied();
const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let count = 0;
let skipped = 0;
for (const file of files) {
  const name = basename(file, ".sql");
  if (applied.has(name)) {
    skipped++;
    continue;
  }
  console.log(`→ Applying ${name}`);
  const sql = readFileSync(join(migDir, file), "utf8").replace(/^\uFEFF/, "");
  await applyMigration(name, sql);
  count++;
}
console.log(`✓ Applied ${count} migrations (${skipped} already present)`);
