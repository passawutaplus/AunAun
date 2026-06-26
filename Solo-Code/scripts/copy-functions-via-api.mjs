#!/usr/bin/env node
/** Copy public/shared/anthem functions from US → SG via pg_get_functiondef */
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

const rows = await q(
  FROM,
  `SELECT p.proname AS name, n.nspname AS schema, pg_get_functiondef(p.oid) AS def
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname IN ('public','shared','anthem','so1o','ops')
     AND p.prokind = 'f'
   ORDER BY n.nspname, p.proname`,
);

let ok = 0;
let fail = 0;
for (const row of rows) {
  if (!row.def) continue;
  try {
    await q(TO, row.def);
    ok += 1;
  } catch (e) {
    fail += 1;
    if (fail <= 5) console.log("✗", `${row.schema}.${row.name}`, e.message.slice(0, 100));
  }
}
console.log(`Functions copied: ${ok} ok, ${fail} failed (${rows.length} total)`);
