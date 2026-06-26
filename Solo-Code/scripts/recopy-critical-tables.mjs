#!/usr/bin/env node
/** Drop and recreate critical tables on SG, then recopy from US. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";

const TABLES = [
  "public.profiles",
  "shared.wallets",
  "shared.wallet_topups",
  "anthem.projects",
  "anthem.community_posts",
  "anthem.job_posts",
  "anthem.studios",
  "shared.gift_transactions",
];

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
  if (!res.ok) throw new Error(text.slice(0, 400));
  return text ? JSON.parse(text) : [];
}

function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    const inner = v.map((x) => (x === null ? "NULL" : `'${String(x).replace(/'/g, "''")}'`)).join(", ");
    return `ARRAY[${inner}]::text[]`;
  }
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function recreate(schema, table) {
  await q(TO, `DROP TABLE IF EXISTS ${schema}."${table}" CASCADE`);
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
  await q(TO, `CREATE TABLE ${schema}."${table}" (\n  ${parts.join(",\n  ")}\n)`);
}

async function copy(schema, table) {
  const fq = `${schema}."${table}"`;
  const rows = await q(FROM, `SELECT * FROM ${fq}`);
  if (!rows.length) return 0;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  let n = 0;
  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const values = batch.map((row) => `(${cols.map((c) => lit(row[c])).join(", ")})`).join(", ");
    await q(TO, `INSERT INTO ${fq} (${colList}) VALUES ${values} ON CONFLICT DO NOTHING`);
    n += batch.length;
  }
  return n;
}

for (const fq of TABLES) {
  const [schema, table] = fq.split(".");
  try {
    console.log("→", fq);
    await recreate(schema, table);
    const n = await copy(schema, table);
    console.log(`  ✓ ${n} rows`);
  } catch (e) {
    console.log(`  ✗ ${e.message.slice(0, 200)}`);
  }
}
