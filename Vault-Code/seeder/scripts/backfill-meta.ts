/**
 * Refresh source_meta for Met rows from the live object API so Discover can show full object details.
 * Usage: npx tsx scripts/backfill-meta.ts [--dry]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { MetMuseumAdapter, metObjectMeta } from "../src/seeder/adapters/met";

function loadEnv(file: string) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv(resolve(import.meta.dirname, "../../.env.local"));
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Vault .env.local is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const dry = process.argv.includes("--dry");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const met = new MetMuseumAdapter();

  const { data: rows, error } = await db.from("discover_items").select("id,source_id,title,source_meta").eq("source", "met");
  if (error) throw error;
  for (const row of rows || []) {
    const obj = await met.fetchObject(Number(row.source_id));
    if (!obj) {
      console.log(`skip ${row.source_id} (gone)`);
      continue;
    }
    const meta = metObjectMeta(obj);
    const filled = Object.entries(meta).filter(([k, v]) => k !== "source_tags" && v).map(([k]) => k);
    console.log(`${row.title.slice(0, 32).padEnd(32)} ${filled.join(", ")}`);
    if (dry) continue;
    const update = await db.from("discover_items").update({ source_meta: meta }).eq("id", row.id);
    if (update.error) throw update.error;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
