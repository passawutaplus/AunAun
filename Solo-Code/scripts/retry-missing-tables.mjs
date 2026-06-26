#!/usr/bin/env node
/** Retry creating tables that failed in initial schema clone. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";

const MISSING = [
  "public.profiles",
  "public.user_roles",
  "anthem.projects",
  "anthem.community_posts",
  "anthem.job_posts",
  "anthem.studios",
  "public.job_trackers",
  "public.job_steps",
];

function token() {
  const raw = readFileSync(join(SOLO_ROOT, ".env"), "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
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
  if (!res.ok) throw new Error(`${ref} ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : [];
}

async function createTable(schema, table) {
  const cols = await q(
    FROM,
    `SELECT a.attname AS column_name, pg_catalog.format_type(a.atttypid, a.atttypmod) AS pg_type,
            a.attnotnull AS notnull, pg_get_expr(ad.adbin, ad.adrelid) AS column_default
     FROM pg_attribute a
     LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='${schema}' AND c.relname='${table}' AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum`,
  );
  const parts = cols.map((c) => {
    let line = `"${c.column_name}" ${c.pg_type}`;
    if (c.notnull) line += " NOT NULL";
    if (c.column_default) line += ` DEFAULT ${c.column_default}`;
    return line;
  });
  await q(TO, `CREATE TABLE IF NOT EXISTS ${schema}."${table}" (\n  ${parts.join(",\n  ")}\n)`);
}

for (const fq of MISSING) {
  const [schema, table] = fq.split(".");
  try {
    await createTable(schema, table);
    console.log("✓", fq);
  } catch (e) {
    console.log("✗", fq, e.message.slice(0, 200));
  }
}
