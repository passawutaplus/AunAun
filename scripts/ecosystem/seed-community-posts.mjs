#!/usr/bin/env node
/**
 * Seed Designer Area mock posts — 3 per work category (24 total).
 * Usage: node scripts/ecosystem/seed-community-posts.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { buildCommunitySeedPosts } from "./community-posts-seed-data.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const anthemCandidates = [join(root, "Anthem-Code"), "F:/So1o/Anthem Code"];
const anthemRoot =
  anthemCandidates.find((p) =>
    existsSync(join(p, "node_modules/@supabase/supabase-js/dist/index.mjs")),
  ) ?? anthemCandidates[0];
const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env.seed.local");
const soloEnvPath = join(root, "Solo-Code/.env");

function loadEnv(path) {
  if (!existsSync(path)) return;
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv(soloEnvPath);
loadEnv(envPath);

const url = process.env.SUPABASE_URL ?? process.env.ANTHEM_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const catalogUid = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
};

const { createClient } = await import(
  pathToFileURL(join(anthemRoot, "node_modules/@supabase/supabase-js/dist/index.mjs")).href
);

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "anthem" },
});

async function main() {
  console.log("Seeding Designer Area posts →", url.replace(/https?:\/\//, ""));

  const posts = buildCommunitySeedPosts(catalogUid);
  const { error } = await supabase.from("community_posts").upsert(posts, { onConflict: "id" });
  if (error) throw new Error(error.message);

  const { count } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  console.log(`✓ Upserted ${posts.length} posts (3 × 8 categories)`);
  console.log(`✓ Published community posts in DB: ${count ?? posts.length}`);
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
