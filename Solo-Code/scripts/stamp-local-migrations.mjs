#!/usr/bin/env node
/** Stamp all local migration names on SG (for cutover after API data copy). */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const REF = "zkflkpbmbozrchqncpzi";
const MIG_DIR = join(SOLO, "supabase", "migrations");

function token() {
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("no token");
}

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 300));
  return text ? JSON.parse(text) : [];
}

await q("CREATE SCHEMA IF NOT EXISTS supabase_migrations");
await q(
  "CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, name text)",
);

const applied = new Set((await q("SELECT name FROM supabase_migrations.schema_migrations")).map((r) => r.name));
const files = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => f.replace(/\.sql$/, ""))
  .sort();

let n = 0;
for (const name of files) {
  if (applied.has(name)) continue;
  const version = name.split("_")[0];
  const safeName = name.replace(/'/g, "''");
  const safeVersion = version.replace(/'/g, "''");
  try {
    await q(
      `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${safeVersion}', '${safeName}') ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name`,
    );
    n++;
  } catch (e) {
    console.log("skip", name, e.message.slice(0, 80));
  }
  await new Promise((r) => setTimeout(r, 100));
}
console.log(`✓ stamped ${n} migrations (${files.length} local, ${applied.size} were applied)`);
