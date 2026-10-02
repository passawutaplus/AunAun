/**
 * Recompute discover_items.colors from the stored md rendition.
 * Only touches rows whose palette came from bootstrap-feed (no Claude colors to preserve).
 * Usage: npx tsx scripts/recolor.ts [--dry]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractPalette } from "./palette";

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

  const { data: rows, error } = await db.from("discover_items").select("id,title,image_md_path,colors").eq("status", "published");
  if (error) throw error;
  for (const row of rows || []) {
    if (!row.image_md_path) continue;
    const file = await db.storage.from("discover-media").download(row.image_md_path);
    if (file.error) {
      console.log(`skip ${row.id} ${file.error.message}`);
      continue;
    }
    const colors = await extractPalette(Buffer.from(await file.data.arrayBuffer()));
    console.log(`${row.title.slice(0, 40).padEnd(40)} ${JSON.stringify(row.colors)} -> ${JSON.stringify(colors)}`);
    if (dry || !colors.length) continue;
    const update = await db.from("discover_items").update({ colors }).eq("id", row.id);
    if (update.error) throw update.error;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
