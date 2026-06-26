#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";

function token() {
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("no token");
}

async function q(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 300));
  return text ? JSON.parse(text) : [];
}

await q(TO, "CREATE SCHEMA IF NOT EXISTS supabase_migrations");
await q(
  TO,
  "CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, name text)",
);
const rows = await q(FROM, "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY name");
console.log(`Copying ${rows.length} migration records...`);
let n = 0;
for (const r of rows) {
  const v = String(r.version).replace(/'/g, "''");
  const name = String(r.name).replace(/'/g, "''");
  try {
    await q(
      TO,
      `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${v}', '${name}') ON CONFLICT (version) DO NOTHING`,
    );
    n += 1;
  } catch {
    /* skip */
  }
}
console.log(`✓ inserted ${n}`);
