#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const solo = join(dirname(fileURLToPath(import.meta.url)), "..");
function token() {
  for (const line of readFileSync(join(solo, ".env"), "utf8").split(/\r?\n/)) {
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
  return JSON.parse(text);
}
for (const ref of ["rvnzjiskqliexysicfmh", "zkflkpbmbozrchqncpzi"]) {
  const t = await q(
    ref,
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'planner%' ORDER BY 1",
  );
  console.log(ref, t.map((r) => r.table_name).join(", ") || "(none)");
}
