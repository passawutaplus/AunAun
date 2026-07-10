#!/usr/bin/env node
/**
 * Generate public/sitemap.xml with static routes + live/catalog public URLs.
 * Set VITE_SITE_URL or SITE_URL (default https://aplus1.app)
 *
 * Optional live enrichment (recommended for production):
 *   VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
 *   or SUPABASE_URL + SUPABASE_ANON_KEY
 *
 * Full-product extras (/jobs, /community, studios):
 *   VITE_APLUS1_FULL_PRODUCT=true
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildSitemapUrls, buildSitemapXml } from "./sitemap-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://aplus1.app").replace(
  /\/$/,
  "",
);
const fullProduct =
  (process.env.VITE_APLUS1_FULL_PRODUCT || "").toLowerCase() === "true";

function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function fetchLiveCatalog(supabaseUrl, anonKey) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
  };
  const anthemHeaders = {
    ...headers,
    "Accept-Profile": "anthem",
    "Content-Profile": "anthem",
  };
  const rest = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

  const [projectsRes, profilesRes, seriesRes] = await Promise.all([
    fetch(
      `${rest}/projects?select=id&status=eq.Published&order=created_at.desc&limit=120`,
      { headers: anthemHeaders },
    ),
    fetch(
      `${rest}/profiles_public?select=user_id,username&order=updated_at.desc&limit=80`,
      { headers },
    ),
    fetch(
      `${rest}/project_series?select=id&is_public=eq.true&order=updated_at.desc&limit=40`,
      { headers: anthemHeaders },
    ),
  ]);

  if (!projectsRes.ok) {
    throw new Error(`projects fetch ${projectsRes.status}`);
  }
  const projects = await projectsRes.json();
  const projectIds = projects.map((p) => p.id).filter(Boolean);

  let profileUserIds = [];
  let vanityHandles = [];
  if (profilesRes.ok) {
    const profiles = await profilesRes.json();
    profileUserIds = profiles.map((p) => p.user_id).filter(Boolean);
    vanityHandles = profiles
      .map((p) => p.username)
      .filter((u) => typeof u === "string" && /^[a-z0-9_.]{2,}$/i.test(u));
  }

  let seriesIds = [];
  if (seriesRes.ok) {
    const series = await seriesRes.json();
    seriesIds = series.map((s) => s.id).filter(Boolean);
  } else {
    console.warn(`series fetch ${seriesRes.status} — skipping series URLs`);
  }

  return { projectIds, profileUserIds, vanityHandles, seriesIds };
}

loadDotEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const anonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

let live = null;
if (supabaseUrl && anonKey) {
  try {
    live = await fetchLiveCatalog(supabaseUrl, anonKey);
    console.log(
      `Live catalog: ${live.projectIds.length} projects, ${live.profileUserIds.length} profiles, ${live.vanityHandles.length} @handles, ${live.seriesIds.length} series`,
    );
  } catch (err) {
    console.warn(`Live catalog fetch failed — using seed catalog. (${err.message})`);
  }
} else {
  console.warn("No Supabase credentials — using seed catalog only.");
}

const opts = {
  fullProduct,
  ...(live || {}),
};

const xml = buildSitemapXml(base, opts);
const out = join(root, "public", "sitemap.xml");
writeFileSync(out, xml, "utf8");
console.log(`Wrote ${buildSitemapUrls(opts).length} URLs to public/sitemap.xml (base: ${base})`);
