#!/usr/bin/env node
/**
 * Smart US → SG data copy via Management API (type-aware inserts, generated columns).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOLO = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "rvnzjiskqliexysicfmh";
const TO = "zkflkpbmbozrchqncpzi";
const SCHEMAS = ["public", "shared", "anthem", "so1o", "ops"];

function token() {
  for (const line of readFileSync(join(SOLO, ".env"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = line.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m) return m[1].trim();
  }
  throw new Error("no token");
}

async function q(ref, sql) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(text.slice(0, 500));
    await new Promise((r) => setTimeout(r, 150));
    return text ? JSON.parse(text) : [];
  }
  throw new Error("rate limited after retries");
}

async function columnMeta(ref, schema, table) {
  return q(
    ref,
    `SELECT c.column_name, c.data_type, c.udt_name, c.is_generated,
            a.attgenerated, pg_catalog.format_type(a.atttypid, a.atttypmod) AS pg_type,
            pg_get_expr(ad.adbin, ad.adrelid) AS column_default
     FROM information_schema.columns c
     JOIN pg_attribute a ON a.attname = c.column_name
     JOIN pg_class cl ON cl.oid = a.attrelid AND cl.relname = c.table_name
     JOIN pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = c.table_schema
     LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     WHERE c.table_schema = '${schema}' AND c.table_name = '${table}'
       AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY c.ordinal_position`,
  );
}

function lit(v, col) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  const pgType = col.pg_type || col.udt_name || "";

  if (Array.isArray(v)) {
    if (pgType === "jsonb" || col.data_type === "jsonb") {
      return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    }
    const inner = v.map((x) => (x === null ? "NULL" : `'${String(x).replace(/'/g, "''")}'`)).join(", ");
    const cast = pgType.includes("uuid") ? "uuid[]" : pgType.includes("int") ? "integer[]" : "text[]";
    return `ARRAY[${inner}]::${cast}`;
  }
  if (typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  if (pgType === "uuid") return `'${String(v)}'::uuid`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function recreateTable(schema, table) {
  const cols = await columnMeta(FROM, schema, table);
  const parts = cols.map((c) => {
    let line = `"${c.column_name}" ${c.pg_type}`;
    if (c.attgenerated === "s") {
      line += ` GENERATED ALWAYS AS (${c.column_default?.replace(/^GENERATED ALWAYS AS /i, "").replace(/ STORED$/i, "") || "NULL"}) STORED`;
      return line;
    }
    if (c.attgenerated === "s" || c.is_generated === "ALWAYS") return null;
    const def = c.column_default;
    if (def && !/\b[a-z_][a-z0-9_]*\b/i.test(def.replace(/^nextval.*/, ""))) {
      if (!def.includes("(") || def.startsWith("nextval") || def.includes("gen_random") || def.includes("now()")) {
        line += ` DEFAULT ${def}`;
      }
    }
    return line;
  }).filter(Boolean);
  await q(TO, `DROP TABLE IF EXISTS ${schema}."${table}" CASCADE`);
  await q(TO, `CREATE TABLE ${schema}."${table}" (\n  ${parts.join(",\n  ")}\n)`);
}

async function copyTable(schema, table, { recreate = false } = {}) {
  const meta = await columnMeta(FROM, schema, table);
  const insertCols = meta.filter((c) => c.attgenerated !== "s" && c.is_generated !== "ALWAYS");
  if (recreate) await recreateTable(schema, table);

  const fq = `${schema}."${table}"`;
  const colNames = insertCols.map((c) => c.column_name);
  const selectList = colNames.map((c) => `"${c}"`).join(", ");
  const rows = await q(FROM, `SELECT ${selectList} FROM ${fq}`);
  if (!rows.length) return 0;

  const colList = colNames.map((c) => `"${c}"`).join(", ");
  let n = 0;
  for (let i = 0; i < rows.length; i += 15) {
    const batch = rows.slice(i, i + 15);
    const metaByName = Object.fromEntries(insertCols.map((c) => [c.column_name, c]));
    const values = batch
      .map((row) => `(${colNames.map((c) => lit(row[c], metaByName[c])).join(", ")})`)
      .join(", ");
    const sql = `INSERT INTO ${fq} (${colList}) VALUES ${values} ON CONFLICT DO NOTHING`;
    try {
      await q(TO, sql);
      n += batch.length;
    } catch (e) {
      if (i === 0) console.log(`  batch err: ${e.message.slice(0, 180)}`);
    }
  }
  return n;
}

async function copyAuth() {
  const meta = await columnMeta(FROM, "auth", "users");
  const insertCols = meta.filter((c) => c.attgenerated !== "s" && c.is_generated !== "ALWAYS");
  const colNames = insertCols.map((c) => c.column_name);
  const selectList = colNames.map((c) => `"${c}"`).join(", ");
  const rows = await q(FROM, `SELECT ${selectList} FROM auth.users`);
  console.log(`auth.users: ${rows.length} source rows`);
  let n = 0;
  const metaByName = Object.fromEntries(insertCols.map((c) => [c.column_name, c]));
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const values = batch
      .map((row) => `(${colNames.map((c) => lit(row[c], metaByName[c])).join(", ")})`)
      .join(", ");
    const sql = `INSERT INTO auth.users (${colNames.map((c) => `"${c}"`).join(", ")}) VALUES ${values} ON CONFLICT (id) DO NOTHING`;
    try {
      await q(TO, sql);
      n += batch.length;
    } catch (e) {
      if (i < 20) console.log(`  auth batch: ${e.message.slice(0, 160)}`);
    }
  }
  console.log(`  inserted ${n}`);

  try {
    const ids = await q(FROM, "SELECT * FROM auth.identities");
    console.log(`auth.identities: ${ids.length}`);
    for (const row of ids) {
      const cols = Object.keys(row);
      const sql = `INSERT INTO auth.identities (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => lit(row[c], { pg_type: "text" })).join(", ")}) ON CONFLICT DO NOTHING`;
      try {
        await q(TO, sql);
      } catch {
        /* skip */
      }
    }
  } catch (e) {
    console.log("identities:", e.message.slice(0, 100));
  }
}

async function listTables(ref) {
  return q(
    ref,
    `SELECT table_schema, table_name FROM information_schema.tables
     WHERE table_schema IN (${SCHEMAS.map((s) => `'${s}'`).join(",")})
       AND table_type = 'BASE TABLE' ORDER BY table_schema, table_name`,
  );
}

const CRITICAL = new Set([
  "public.profiles",
  "shared.wallets",
  "anthem.projects",
  "anthem.job_posts",
  "public.user_roles",
]);

const cmd = process.argv[2];
try {
  if (cmd === "auth") {
    await copyAuth();
  } else if (cmd === "critical") {
    for (const fq of CRITICAL) {
      const [schema, table] = fq.split(".");
      console.log("→", fq);
      const n = await copyTable(schema, table, { recreate: true });
      console.log(`  ✓ ${n} rows`);
    }
  } else if (cmd === "all") {
    await copyAuth();
    const tables = await listTables(FROM);
    for (const { table_schema, table_name } of tables) {
      const fq = `${table_schema}.${table_name}`;
      if (fq === "public.schema_migrations") continue;
      try {
        const exists = await q(
          TO,
          `SELECT 1 FROM information_schema.tables WHERE table_schema='${table_schema}' AND table_name='${table_name}' LIMIT 1`,
        );
        if (!exists.length) {
          console.log("create", fq);
          await recreateTable(table_schema, table_name);
        }
        const n = await copyTable(table_schema, table_name);
        if (n) console.log(`  ${fq}: ${n}`);
      } catch (e) {
        console.log(`  ✗ ${fq}: ${e.message.slice(0, 120)}`);
      }
    }
  } else {
    console.log("Usage: node scripts/finalize-sg-data.mjs auth|critical|all");
    process.exit(1);
  }
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
