#!/usr/bin/env node
/**
 * Replace broken Unsplash URLs in remote demo data with verified photo IDs.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { unsplashArt, unsplashGallery, UNSPLASH_ART } from "./demo-images.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");
const envPaths = [
  join(repoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(repoRoot, "Solo-Code", ".env"),
];
for (const envPath of envPaths) {
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
const tokenPath = join(process.env.HOME || "", ".config", "supabase", "access-token");
if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
  process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const anthem = createClient(url, key, { db: { schema: "anthem" } });
const pub = createClient(url, key, { db: { schema: "public" } });

const sqlArray = UNSPLASH_ART.map((id) => `'${id}'`).join(",");

async function patchViaSql() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return false;
  const API = `https://api.supabase.com/v1/projects/zkflkpbmbozrchqncpzi/database/query`;
  const sql = `
CREATE OR REPLACE FUNCTION public._unsplash_art(i integer, w int DEFAULT 1200, h int DEFAULT 900)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT format(
    'https://images.unsplash.com/photo-%s?w=%s&h=%s&fit=crop&q=80&auto=format',
    (ARRAY[${sqlArray}])[1 + (i % 20)], w, h
  );
$$;

WITH numbered AS (
  SELECT id, (row_number() OVER (ORDER BY created_at) - 1)::int AS i FROM anthem.projects
)
UPDATE anthem.projects p SET
  cover_url = public._unsplash_art(n.i, 1200, 900),
  gallery_urls = ARRAY[
    public._unsplash_art(n.i, 1200, 900),
    public._unsplash_art(n.i + 7, 1200, 900),
    public._unsplash_art(n.i + 13, 1200, 900)
  ]
FROM numbered n WHERE p.id = n.id;

WITH prof AS (
  SELECT user_id, (row_number() OVER (ORDER BY created_at) - 1)::int AS i FROM public.profiles
)
UPDATE public.profiles p SET
  cover_url = public._unsplash_art(pr.i + 3, 1600, 500)
FROM prof pr WHERE p.user_id = pr.user_id;

UPDATE anthem.studios s SET cover_url = public._unsplash_art(
  (ascii(substring(slug from 1 for 1)) + length(slug)) % 20, 1600, 500
) WHERE cover_url LIKE '%unsplash.com%';

UPDATE anthem.ad_campaigns SET image_url = public._unsplash_art(
  (random() * 19)::int, 800, 600
) WHERE image_url LIKE '%unsplash.com%';

WITH numbered AS (
  SELECT id, (row_number() OVER (ORDER BY created_at) - 1)::int AS i FROM anthem.collections
)
UPDATE anthem.collections c SET cover_url = public._unsplash_art(n.i, 800, 600)
FROM numbered n WHERE c.id = n.id AND c.cover_url LIKE '%unsplash.com%';

WITH numbered AS (
  SELECT id, (row_number() OVER (ORDER BY created_at) - 1)::int AS i FROM anthem.inspire_boards
)
UPDATE anthem.inspire_boards b SET cover_url = public._unsplash_art(n.i, 800, 800)
FROM numbered n WHERE b.id = n.id;

WITH numbered AS (
  SELECT id, (row_number() OVER (ORDER BY created_at) - 1)::int AS i FROM anthem.inspire_items
)
UPDATE anthem.inspire_items it SET image_url = public._unsplash_art(n.i + 2, 600, 800)
FROM numbered n WHERE it.id = n.id AND it.image_url LIKE '%unsplash.com%';
`;
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.warn("SQL patch failed:", body.slice(0, 300));
    return false;
  }
  console.log("✓ SQL batch patch applied");
  return true;
}

async function patchViaRest() {
  const { data: projects } = await anthem.from("projects").select("id").order("created_at");
  let i = 0;
  for (const p of projects ?? []) {
    const gal = unsplashGallery(i);
    await anthem.from("projects").update({ cover_url: gal[0], gallery_urls: gal }).eq("id", p.id);
    i++;
  }
  console.log(`✓ projects: ${i}`);

  const { data: profiles } = await pub.from("profiles").select("user_id").order("created_at");
  let j = 0;
  for (const p of profiles ?? []) {
    await pub.from("profiles").update({ cover_url: unsplashArt(j + 3, 1600, 500) }).eq("user_id", p.user_id);
    j++;
  }
  console.log(`✓ profiles: ${j}`);

  const { data: studios } = await anthem.from("studios").select("id,slug");
  for (const [k, s] of (studios ?? []).entries()) {
    await anthem.from("studios").update({ cover_url: unsplashArt(k + 2, 1600, 500) }).eq("id", s.id);
  }
  console.log(`✓ studios: ${studios?.length ?? 0}`);

  const { data: ads } = await anthem.from("ad_campaigns").select("id");
  for (const [k, a] of (ads ?? []).entries()) {
    await anthem.from("ad_campaigns").update({ image_url: unsplashArt(k + 15, 800, 600) }).eq("id", a.id);
  }
  console.log(`✓ ads: ${ads?.length ?? 0}`);
}

async function main() {
  console.log("Fixing demo images on", url.replace(/https?:\/\//, ""));
  const ok = await patchViaSql();
  if (!ok) await patchViaRest();
  console.log("Done — hard refresh the browser");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
