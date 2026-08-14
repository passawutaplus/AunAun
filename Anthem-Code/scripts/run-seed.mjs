#!/usr/bin/env node
/**
 * Seed an1hem catalog via Supabase REST (sb_secret_ / service_role).
 * Env: scripts/ecosystem/.env.seed.local (repo root, gitignored)
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import {
  DEMO_CATALOG,
  demoCatalogAvatarUrl,
  demoCatalogCoverUrl,
  unsplashArt,
} from "./demo-images.mjs";
import { buildDemoProjectPresentation } from "./demo-catalog-canvas.mjs";
import { buildDemoHirePackages } from "./demo-catalog-packages.mjs";

const anthemRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(anthemRoot, "..");
const envPaths = [
  join(repoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(repoRoot, "Solo-Code", ".env"),
  join(anthemRoot, ".env"),
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

for (const p of envPaths) loadEnv(p);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const demoPassword = process.env.DEMO_SEED_PASSWORD || "pixel100-demo-seed";
// Prefer legacy service_role JWT (eyJ...); sb_secret_* often fails Auth Admin via REST on Lovable-hosted projects.
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
if (!url || !key || !demoPassword) {
  console.error(
    "Missing SUPABASE_URL, service-role key, or DEMO_SEED_PASSWORD in scripts/ecosystem/.env.seed.local",
  );
  process.exit(1);
}
if (key.startsWith("sb_secret_")) {
  console.warn(
    "Warning: sb_secret_* returned Invalid API key on direct Supabase REST in testing.",
  );
  console.warn(
    "Use Supabase SQL Editor → scripts/ecosystem/seed-catalog.sql, or add service_role JWT to .env.seed.local",
  );
}

const clientOpts = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
};

const publicDb = createClient(url, key, { ...clientOpts, db: { schema: "public" } });
const anthemDb = createClient(url, key, { ...clientOpts, db: { schema: "anthem" } });

const catalogUid = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
};
const catalogProjectId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0002-0000000000${hex}`;
};
const catalogStudioId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0001-0000000000${hex}`;
};
const catalogJobId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0003-0000000000${hex}`;
};
const catalogAdId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0004-0000000000${hex}`;
};

const names = DEMO_CATALOG.map((c) => c.displayName);
const usernames = DEMO_CATALOG.map((c) => c.username);
const roles = DEMO_CATALOG.map((c) => c.role);
const studioNames = [
  "Doi Studio", "Lotus Lab", "Mango Pixel", "Inkwell Co.", "Frame & Field",
  "Sundaze Crafts", "Soundwave Bangkok", "Pixel Garden", "Yim Studio", "Talay Creative",
];
const studioSlugs = [
  "doi-studio", "lotus-lab", "mango-pixel", "inkwell-co", "frame-field",
  "sundaze-crafts", "soundwave-bkk", "pixel-garden", "yim-studio", "talay-creative",
];
const jobTitles = [
  "หา UI Designer ทำแอป Wellness",
  "Graphic Designer ทำ Packaging ขนมไทย",
  "Brand Designer สำหรับสตาร์ทอัป Fintech",
  "Illustrator วาดภาพประกอบหนังสือเด็ก",
  "Motion Designer ทำคลิปสินค้า 30 วินาที",
  "Photographer ถ่าย Lookbook คอลเลกชันใหม่",
  "Webflow Developer สร้าง Landing Page",
  "Content Creator สาย TikTok อาหาร",
  "Logo Designer สำหรับคลินิกใหม่",
  "Wedding Photographer พรีเวดดิ้ง",
  "Music Producer เพลง Jingle 10s",
  "Senior Designer เข้าทำงานประจำ Studio",
];

/** Auth Admin — service_role JWT uses Bearer; sb_secret_* uses apikey-only. */
async function authAdminFetch(path, init = {}) {
  const authHeader = key.startsWith("eyJ") ? `Bearer ${key}` : key;
  const res = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: authHeader,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { msg: text };
  }
  return { res, body };
}

async function ensureAuthUser(i) {
  const id = catalogUid(i);
  const email = `${usernames[i]}@demo.pixel100.com`;

  const { res: getRes, body: existing } = await authAdminFetch(`/admin/users/${id}`);
  if (getRes.ok && existing?.id) {
    const { res: updateRes, body: updated } = await authAdminFetch(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ password: demoPassword }),
    });
    if (!updateRes.ok) {
      throw new Error(`auth password ${i}: ${updated?.msg ?? updated?.message ?? updateRes.statusText}`);
    }
    return id;
  }

  const { res: createRes, body: created } = await authAdminFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      id,
      email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { display_name: names[i], username: usernames[i] },
    }),
  });
  if (createRes.ok) return created?.id ?? id;

  const msg = created?.msg ?? created?.message ?? createRes.statusText;
  if (
    createRes.status === 422 ||
    String(msg).toLowerCase().includes("already") ||
    String(msg).toLowerCase().includes("registered")
  ) {
    return id;
  }
  throw new Error(`auth user ${i}: ${msg}`);
}

async function main() {
  console.log("Connecting to", url.replace(/https?:\/\//, ""));

  const { count: before } = await anthemDb
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "Published");
  console.log("Published projects before:", before ?? 0);

  for (let i = 0; i < 20; i++) {
    await ensureAuthUser(i);
  }
  console.log("Auth users OK (20)");

  const profiles = DEMO_CATALOG.map((c, i) => ({
    user_id: catalogUid(i),
    display_name: c.displayName,
    username: c.username,
    email: `${c.username}@demo.pixel100.com`,
    role: c.role,
    bio: c.bio,
    skills: c.skills,
    location: c.location,
    avatar_url: demoCatalogAvatarUrl(i),
    cover_url: demoCatalogCoverUrl(i),
  }));
  const { error: pErr } = await publicDb.from("profiles").upsert(profiles, { onConflict: "user_id" });
  if (pErr) throw new Error(`profiles: ${pErr.message}`);
  console.log("Profiles upserted:", profiles.length);

  const attestedAt = new Date().toISOString();
  const projects = DEMO_CATALOG.map((c, i) => {
    const cover = demoCatalogCoverUrl(i);
    const p = c.project;
    const presentation = buildDemoProjectPresentation(i);
    return {
      id: catalogProjectId(i),
      owner_id: catalogUid(i),
      title: p.title,
      category: p.category,
      cover_url: cover,
      gallery_urls: presentation.gallery_urls,
      content_blocks: presentation.content_blocks,
      editor_mode: presentation.editor_mode,
      tools: p.tools,
      tags: p.tags,
      status: "Published",
      views: 280 + ((i * 53) % 2400),
      likes: 24 + ((i * 17) % 180),
      price_thb: p.priceThb || null,
      description: p.description,
      brief: p.brief,
      creator_role: p.creatorRole,
      process_note: p.processNote,
      deliverables: p.deliverables,
      duration_label: p.durationLabel,
      outcome_note: p.outcomeNote,
      opportunity_types: p.opportunityTypes,
      allow_hire: presentation.allow_hire,
      allow_collab: true,
      ai_assisted: Boolean(p.aiAssisted),
      ai_disclosure_note: p.aiNote ?? "",
      rights_attested_at: attestedAt,
      rights_attestation_version: "2026-08-14",
    };
  });
  const { error: projErr } = await anthemDb.from("projects").upsert(projects, { onConflict: "id" });
  if (projErr) throw new Error(`projects: ${projErr.message}`);
  console.log("Projects upserted:", projects.length);

  const studios = Array.from({ length: 10 }, (_, i) => ({
    id: catalogStudioId(i),
    slug: studioSlugs[i],
    name: studioNames[i],
    tagline: "สตูดิโอครีเอทีฟไทย",
    bio: "ทีมดีไซน์และคราฟต์จากชุมชน Aplus1",
    avatar_url: demoCatalogAvatarUrl(i),
    cover_url: demoCatalogCoverUrl(i + 2),
    location: i % 2 === 0 ? "Bangkok" : "Chiang Mai",
    verified: i % 3 === 0,
    created_by: catalogUid(i),
    member_count: 1,
  }));
  const { error: stErr } = await anthemDb.from("studios").upsert(studios, { onConflict: "id" });
  if (stErr) console.warn("studios:", stErr.message);
  else console.log("Studios upserted:", studios.length);

  const members = Array.from({ length: 10 }, (_, i) => ({
    studio_id: catalogStudioId(i),
    user_id: catalogUid(i),
    role: "owner",
  }));
  const { error: memErr } = await anthemDb.from("studio_members").upsert(members, {
    onConflict: "studio_id,user_id",
  });
  if (memErr) console.warn("studio_members:", memErr.message);
  else console.log("Studio members upserted:", members.length);

  const jobs = Array.from({ length: 12 }, (_, i) => ({
    id: catalogJobId(i),
    studio_id: catalogStudioId(i % 10),
    posted_by: catalogUid(i % 10),
    title: jobTitles[i],
    role_category: "Design",
    description: "ประกาศงานจากสตูดิโอในชุมชน an1hem",
    skills: ["Figma", "Branding"],
    budget_min: 15000 + i * 2000,
    budget_max: 28000 + i * 3500,
    budget_type: "fixed",
    location_type: i % 3 === 0 ? "remote" : "hybrid",
    location: "Bangkok",
    status: "open",
    post_type: "hiring",
    poster_role: "studio",
    employment_type: "project",
    cover_image_url: unsplashArt(i, 1200, 720),
  }));
  const { error: jobErr } = await anthemDb.from("job_posts").upsert(jobs, { onConflict: "id" });
  if (jobErr) console.warn("job_posts:", jobErr.message);
  else console.log("Job posts upserted:", jobs.length);

  const follows = [];
  for (let i = 0; i < 20; i++) {
    follows.push({ follower_id: catalogUid(i), following_id: catalogUid((i + 1) % 20) });
    if (i % 3 === 0) {
      follows.push({ follower_id: catalogUid(i), following_id: catalogUid((i + 7) % 20) });
    }
  }
  const { error: folErr } = await anthemDb.from("follows").upsert(follows, {
    onConflict: "follower_id,following_id",
    ignoreDuplicates: true,
  });
  if (folErr) console.warn("follows:", folErr.message);
  else console.log("Follows upserted:", follows.length);

  const likes = [];
  for (let i = 0; i < 20; i++) {
    for (let j = 1; j <= 4; j++) {
      likes.push({ project_id: catalogProjectId(i), user_id: catalogUid((i + j) % 20) });
    }
  }
  const { error: likeErr } = await anthemDb.from("project_likes").upsert(likes, {
    onConflict: "project_id,user_id",
    ignoreDuplicates: true,
  });
  if (likeErr) console.warn("project_likes:", likeErr.message);
  else console.log("Project likes upserted:", likes.length);

  const adTitles = [
    "Figma Pro สำหรับดีไซเนอร์ไทย",
    "คอร์ส Branding มืออาชีพ 2026",
    "พิมพ์โปสเตอร์ A2 ราคาสตูดิโอ",
    "จ้าง Illustrator ภายใน 48 ชม.",
    "Anthem Premium — โปรไฟล์เด่นบนฟีด",
    "สต็อกฟอนต์ไทย Commercial",
  ];
  const adTaglines = [
    "เครื่องมือที่ทีมออกแบบใช้จริง",
    "เรียน identity จากเคสจริง 8 สัปดาห์",
    "กระดาษอาร์ต สีสม่ำเสมอ",
    "ทีม curated จากชุมชน Anthem",
    "เพิ่มการมองเห็นผลงาน 3×",
    "ไทยโมเดิร์น อ่านง่ายทุกขนาด",
  ];
  const ads = Array.from({ length: 6 }, (_, i) => ({
    id: catalogAdId(i),
    advertiser_user_id: catalogUid(i * 3),
    title: adTitles[i],
    tagline: adTaglines[i],
    image_url: unsplashArt(i + 15, 800, 600),
    target_url: "https://anthem.app/advertise",
    cta_label: ["ลองใช้ฟรี", "ดูรายละเอียด", "ขอใบเสนอราคา", "สมัครเลย", "อัปเกรด", "ดาวน์โหลด"][i],
    package: i < 2 ? "basic" : i < 4 ? "standard" : "premium",
    price_px: 500 + i * 200,
    status: "active",
    start_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    end_at: new Date(Date.now() + 60 * 86400000).toISOString(),
    impressions: 400 + i * 120,
    clicks: 12 + i * 3,
    promotion_text: "โฆษณาตัวอย่าง — ข้อมูล demo",
  }));
  const { error: adErr } = await anthemDb.from("ad_campaigns").upsert(ads, { onConflict: "id" });
  if (adErr) console.warn("ad_campaigns:", adErr.message);
  else console.log("Active ad campaigns upserted:", ads.length);

  const packages = buildDemoHirePackages();
  const { error: pkgErr } = await anthemDb.from("creator_services").upsert(packages, { onConflict: "id" });
  if (pkgErr) console.warn("creator_services:", pkgErr.message);
  else console.log("Hire packages upserted:", packages.length);

  const { count: after } = await anthemDb
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "Published");
  console.log("Published projects after:", after ?? 0);
  console.log("Seed complete.");
  console.log("Demo accounts use the password from DEMO_SEED_PASSWORD.");
  console.log("See docs/demo-catalog.md");
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
