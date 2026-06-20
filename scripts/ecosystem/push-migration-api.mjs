#!/usr/bin/env node
/** Push a single migration via Supabase Management API (Windows-friendly). */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const soloRoot = join(root, "Solo-Code");
const migDir = join(soloRoot, "supabase/migrations");
const envPath = join(soloRoot, ".env");

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

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "rvnzjiskqliexysicfmh";
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in Solo-Code/.env");
  process.exit(1);
}

const api = `https://api.supabase.com/v1/projects/${projectRef}`;

async function queryApplied() {
  const res = await fetch(`${api}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;",
    }),
  });
  const raw = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(raw).slice(0, 400));
  return raw.map((r) => r.name);
}

async function applyMigration(file) {
  const name = basename(file, ".sql");
  const sql = readFileSync(file, "utf8");
  const res = await fetch(`${api}/database/migrations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, name }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${name} (${res.status}): ${body.slice(0, 500)}`);
  console.log(`✓ ${name}`);
}

const only = process.argv[2];
const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => join(migDir, f))
  .filter((f) => !only || basename(f).includes(only));

const applied = await queryApplied();
let count = 0;
for (const f of files) {
  const name = basename(f, ".sql");
  if (applied.includes(name)) {
    console.log(`skip ${name}`);
    continue;
  }
  await applyMigration(f);
  count++;
}
console.log(`Applied ${count} migration(s)`);
