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
import { unsplashArt } from "./demo-images.mjs";

const anthemRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(anthemRoot, "..");
const envPaths = [
  join(repoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(repoRoot, "Solo-Code", ".env"),
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

const url = process.env.SUPABASE_URL;
const demoPassword = process.env.DEMO_SEED_PASSWORD;
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

const names = [
  "ภัสวุฒิ ศรีวงค์", "นภัสรา ทองดี", "พิมพ์ชนก ใจดี", "วรรณกร พันธ์ทอง", "ธัญญา รัตนพร",
  "ฉัตรชัย วรกุล", "อาทิตยา จันทร์เพ็ญ", "พลอยไพลิน ขจร", "ธนกร แสงทอง", "อนุชา ภูมิดี",
  "ปาริชาต สวยงาม", "เจษฎา ท่องเที่ยว", "สุพัตรา โมชั่น", "วทัญญู เสียงดี", "กฤษณา เมโลดี้",
  "ศิริพร เงินงาม", "กิตติพงษ์ ดิจิทัล", "มนัสนันท์ อาร์ต", "ณัฐวุฒิ ภาพถ่าย", "ภัทรานิษฐ์ คอนเทนต์",
];
const usernames = [
  "phatsawut", "napatsara", "pimchanok", "wannakorn", "thanya", "chatchai", "atittaya", "ploypailin",
  "thanakorn", "anucha", "parichat", "jessada", "supatra", "wathanyu", "kritsana", "siriporn",
  "kittipong", "manatsanan", "nattawut", "phattranit",
];
const roles = [
  "Brand & Logo Designer", "Brand Identity Designer", "Illustrator", "Pattern & Textile Designer",
  "Ceramic Artist", "Web & Poster Designer", "UX/UI Designer", "Content Creator", "IG Content & Photo",
  "Product Photographer", "Wedding Photographer", "Video Editor", "Motion Designer", "Sound Designer",
  "Music Producer", "Jewelry Designer", "Web Developer & UI", "Digital Illustrator",
  "Street Photographer", "Content Strategist",
];
const bios = [
  "ออกแบบโลโก้ & แบรนด์ดิ้งสไตล์มินิมอล", "สร้างแบรนด์ขนมไทยและร้านคาเฟ่", "ภาพประกอบเด็ก & Pop Art",
  "ลายผ้าไทยสไตล์โมเดิร์น", "เซรามิกแฮนด์เมด Earth Tone", "เว็บไซต์ร้านอาหาร & โปสเตอร์หนัง",
  "ออกแบบแอป & เว็บโรงแรม Boutique", "TikTok สายอาหารเหนือ", "รีวิวคาเฟ่สไตล์มินิมอล",
  "ถ่ายภาพสินค้า OTOP & ผ้าทอ", "พรีเวดดิ้งสไตล์มินิมอล", "ตัดต่อ Vlog ท่องเที่ยว",
  "Motion Graphic อธิบายสินค้า", "Sound Design พอดแคสต์", "เพลงประกอบโฆษณา",
  "เครื่องประดับเงินแฮนด์เมด", "Landing page & E-commerce", "ภาพประกอบดิจิทัล & สติกเกอร์",
  "ภาพสตรีท กรุงเทพ & ต่างจังหวัด", "วางแผนคอนเทนต์แบรนด์",
];
const projTitles = [
  "โลโก้ร้านกาแฟเชียงใหม่ Doi Brew", "แบรนด์ดิ้งร้านขนมไทย แม่ละมุน", "ภาพประกอบหนังสือเด็ก ช้างน้อยกับดวงดาว",
  "Pattern ผ้าขาวม้าโมเดิร์น", "เซรามิกสไตล์มินิมอล Earth Tone", "เว็บไซต์ร้านอาหารอีสาน ส้มตำลำซิ่ง",
  "UI App จองคิวสปา Thai Wellness", "Landing Page คอร์สเรียนทำขนม", "คอนเทนต์ TikTok สายอาหารเหนือ",
  "รีวิวคาเฟ่สไตล์ minimal บน IG", "ถ่ายภาพสินค้า OTOP ผ้าทอภาคเหนือ", "พรีเวดดิ้งสไตล์มินิมอลเชียงราย",
  "ตัดต่อ Vlog ท่องเที่ยวภาคใต้", "Motion Graphic อธิบายสินค้า", "Sound Design พอดแคสต์ไทย คุยเรื่องผี",
  "เพลงประกอบโฆษณาแบรนด์ไทย", "Mascot น้องหมูเด้ง Pop Art", "เครื่องประดับเงินแฮนด์เมด",
  "โปสเตอร์เทศกาลภาพยนตร์อิสระ", "เว็บไซต์โรงแรม Boutique หัวหิน",
];
const projCats = [
  "Graphic", "Graphic", "Illustration", "Craft", "Craft", "Web/UI", "Web/UI", "Web/UI", "Content", "Content",
  "Photography", "Photography", "Video", "Video", "Music/Audio", "Music/Audio", "Illustration", "Craft", "Graphic", "Web/UI",
];
const projTools = [
  ["Illustrator", "Photoshop"], ["Illustrator", "Figma"], ["Procreate", "Photoshop"],
  ["Illustrator", "Procreate"], ["Lightroom", "Photoshop"], ["Figma", "Webflow"],
  ["Figma", "Notion"], ["Figma", "Webflow"], ["Premiere", "CapCut"], ["Lightroom", "Canva"],
  ["Lightroom", "Photoshop"], ["Lightroom"], ["Premiere", "After Effects"],
  ["After Effects", "Illustrator"], ["Audition", "Logic Pro"], ["Logic Pro", "Ableton"],
  ["Procreate", "Illustrator"], ["Lightroom"], ["Photoshop", "Illustrator"], ["Figma", "Webflow"],
];
const projPrices = [3500, 8000, 12000, 6500, 4800, 18000, 22000, 9500, 3200, 2500, 7500, 15000, 8000, 12500, 4000, 18000, 9000, 2800, 5500, 35000];
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

  const profiles = Array.from({ length: 20 }, (_, i) => ({
    user_id: catalogUid(i),
    display_name: names[i],
    username: usernames[i],
    email: `${usernames[i]}@demo.pixel100.com`,
    role: roles[i],
    bio: bios[i],
    skills:
      i === 0
        ? ["Logo", "Branding", "Illustrator"]
        : i === 1
          ? ["Branding", "Packaging", "Figma"]
          : i === 2
            ? ["Procreate", "Illustration", "Character"]
            : ["Design", "Creative"],
    location: i % 3 === 0 ? "Bangkok" : i % 3 === 1 ? "Chiang Mai" : "Phuket",
    avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${usernames[i]}&backgroundColor=f5f0e8,e8dcc8`,
    cover_url: unsplashArt(i + 3, 1600, 500),
  }));
  const { error: pErr } = await publicDb.from("profiles").upsert(profiles, { onConflict: "user_id" });
  if (pErr) throw new Error(`profiles: ${pErr.message}`);
  console.log("Profiles upserted:", profiles.length);

  const projDescriptions = [
    "ชุดโลโก้และ visual identity สำหรับร้านกาแฟสเปเชียลตี้ เชียงใหม่ โทนสีน้ำตาล–ครีม",
    "รีแบรนด์ร้านขนมไทย premium: กล่อง, ถุง, และ social template",
    "ภาพประกอบหนังสือเด็ก 12 หน้า สไตล์ watercolour นุ่ม",
    "ลายผ้าขาวม้าโมเดิร์น จาก motif ดอกบัวและเส้นสายเรขาคณิต",
    "คอลเลกชันเซรามิก 8 ชิ้น earth tone มือทอ",
    "เว็บไซต์ร้านอาหารอีสาน + โปสเตอร์โปรโมชัน responsive",
    "UI/UX แอปจองสปา 14 หน้าจอ design system สีเขียวมินต์",
    "Landing page คอร์สอบขนม conversion-focused",
    "ตัวอย่างคอนเทนต์ TikTok 9:16 สายอาหารเหนือ",
    "ชุดภาพรีวิวคาเฟ่ 12 ภาพ โทนมินิมอล",
    "ถ่ายสินค้า OTOP ผ้าทอ white backdrop + lifestyle",
    "พรีเวดดิ้งเชียงราย documentary โทนอบอุ่น",
    "ตัดต่อ vlog ท่องเที่ยว 8 นาที subtitle ไทย–อังกฤษ",
    "Motion graphic 30 วินาที flat + icon animation",
    "Sound design podcast 45 นาที ambient ไทย",
    "Jingle 10 วินาที แบรนด์อาหาร",
    "Mascot น้องหมูเด้ง sticker LINE + key visual",
    "เครื่องประดับเงิน lookbook มืด",
    "โปสเตอร์เทศกาลหนังอิสระ A2 limited colour",
    "เว็บไซต์โรงแรม boutique หัวหิน ไทย–อังกฤษ",
  ];
  const attestedAt = new Date().toISOString();
  const projects = Array.from({ length: 20 }, (_, i) => {
    const cover = unsplashArt(i);
    return {
      id: catalogProjectId(i),
      owner_id: catalogUid(i),
      title: projTitles[i],
      category: projCats[i],
      cover_url: cover,
      gallery_urls: [cover, unsplashArt(i + 5), unsplashArt(i + 11)],
      tools: projTools[i],
      status: "Published",
      views: 280 + ((i * 53) % 2400),
      likes: 24 + ((i * 17) % 180),
      price_thb: projPrices[i],
      description: projDescriptions[i],
      rights_attested_at: attestedAt,
      rights_attestation_version: "2026-06-14",
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
    bio: "ทีมดีไซน์และคราฟต์จากชุมชน an1hem",
    avatar_url: `https://api.dicebear.com/7.x/shapes/svg?seed=studio-${studioSlugs[i]}&backgroundColor=e8f4f8,f0e6ff`,
    cover_url: unsplashArt(i + 2, 1600, 500),
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
