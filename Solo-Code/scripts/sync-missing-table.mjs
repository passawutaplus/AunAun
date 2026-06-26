#!/usr/bin/env node
/** Create missing tables on SG from US (schema + data). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const solo = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";
const TABLES = process.argv.slice(2).length ? process.argv.slice(2) : ["public.planner_posts"];

function token() {
  for (const line of readFileSync(join(solo, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("no token");
}

async function q(ref, sql) {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      continue;
    }
    if (!res.ok) throw new Error(text.slice(0, 500));
    await new Promise((r) => setTimeout(r, 150));
    return text ? JSON.parse(text) : [];
  }
  throw new Error("rate limited");
}

function lit(v, pgType = "") {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    if (pgType === "jsonb") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    const inner = v.map((x) => (x === null ? "NULL" : `'${String(x).replace(/'/g, "''")}'`)).join(", ");
    const cast = pgType.includes("uuid") ? "uuid[]" : "text[]";
    return `ARRAY[${inner}]::${cast}`;
  }
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function columnMeta(ref, schema, table) {
  return q(
    ref,
    `SELECT c.column_name, pg_catalog.format_type(a.atttypid, a.atttypmod) AS pg_type, a.attgenerated
     FROM information_schema.columns c
     JOIN pg_attribute a ON a.attname = c.column_name
     JOIN pg_class cl ON cl.oid = a.attrelid AND cl.relname = c.table_name
     JOIN pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = c.table_schema
     WHERE c.table_schema='${schema}' AND c.table_name='${table}' AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY c.ordinal_position`,
  );
}

async function syncTable(fq) {
  const [schema, table] = fq.split(".");
  console.log("→", fq);
  const meta = await columnMeta(FROM, schema, table);
  const parts = [];
  for (const c of meta) {
    let line = `"${c.column_name}" ${c.pg_type}`;
    if (c.attgenerated === "s") continue;
    parts.push(line);
  }
  await q(TO, `CREATE TABLE IF NOT EXISTS ${schema}."${table}" (\n  ${parts.join(",\n  ")}\n)`);
  const insertCols = meta.filter((c) => c.attgenerated !== "s");
  const colNames = insertCols.map((c) => c.column_name);
  const rows = await q(FROM, `SELECT ${colNames.map((c) => `"${c}"`).join(", ")} FROM ${schema}."${table}"`);
  if (!rows.length) {
    console.log("  ✓ schema only (0 rows)");
    return;
  }
  let n = 0;
  for (let i = 0; i < rows.length; i += 15) {
    const batch = rows.slice(i, i + 15);
    const byName = Object.fromEntries(insertCols.map((c) => [c.column_name, c.pg_type]));
    const values = batch.map((row) => `(${colNames.map((c) => lit(row[c], byName[c])).join(", ")})`).join(", ");
    await q(
      TO,
      `INSERT INTO ${schema}."${table}" (${colNames.map((c) => `"${c}"`).join(", ")}) VALUES ${values} ON CONFLICT DO NOTHING`,
    );
    n += batch.length;
  }
  console.log(`  ✓ ${n} rows`);
}

for (const fq of TABLES) {
  try {
    await syncTable(fq);
  } catch (e) {
    console.log("  ✗", e.message.slice(0, 200));
  }
}
