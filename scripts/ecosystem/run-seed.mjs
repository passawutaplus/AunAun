#!/usr/bin/env node
/**
 * Seed an1hem catalog via Supabase REST (sb_secret_ / service_role).
 * Usage: node scripts/ecosystem/run-seed.mjs
 * Env: scripts/ecosystem/.env.seed.local (gitignored)
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { resolveSeedAvatarUrls, poolUrlForSeed } from "./avatar-pool-utils.mjs";
import { buildCommunitySeedPosts } from "./community-posts-seed-data.mjs";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const anthemCandidates = [join(root, "Anthem-Code"), "F:/So1o/Anthem Code"];
const anthemRoot =
  anthemCandidates.find((p) =>
    existsSync(join(p, "node_modules/@supabase/supabase-js/dist/index.mjs")),
  ) ?? anthemCandidates[0];
const { createClient } = await import(
  pathToFileURL(join(anthemRoot, "node_modules/@supabase/supabase-js/dist/index.mjs")).href
);
const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env.seed.local");

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

loadEnv(envPath);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.seed.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anthemDb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "anthem" },
});

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
  "ถ่ายสินค้า OTOP & ผ้าทอ", "พรีเวดดิ้งสไตล์มินิมอล", "ตัดต่อ Vlog ท่องเที่ยว",
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

async function ensureAuthUser(i) {
  const id = catalogUid(i);
  const email = `${usernames[i]}@demo.pixel100.com`;
  const { data: existing } = await supabase.auth.admin.getUserById(id);
  if (existing?.user) return id;

  const { data, error } = await supabase.auth.admin.createUser({
    id,
    email,
    email_confirm: true,
    user_metadata: { display_name: names[i], username: usernames[i] },
  });
  if (error) {
    if (error.message?.includes("already") || error.message?.includes("registered")) return id;
    throw new Error(`auth user ${i}: ${error.message}`);
  }
  return data.user?.id ?? id;
}

async function main() {
  console.log("Connecting to", url.replace(/https?:\/\//, ""));

  const { count: before } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "Published");
  console.log("Published projects before:", before ?? 0);

  for (let i = 0; i < 20; i++) {
    await ensureAuthUser(i);
  }
  console.log("Auth users OK (20)");

  const poolUrls = await resolveSeedAvatarUrls(supabase);
  if (!poolUrls.length) {
    console.warn("⚠ avatar pool empty — run: node scripts/ecosystem/generate-avatar-pool.mjs");
  }
  const avatarFor = (seed) => poolUrlForSeed(poolUrls, seed) ?? "";

  const profiles = Array.from({ length: 20 }, (_, i) => ({
    id: catalogUid(i),
    display_name: names[i],
    username: usernames[i],
    email: `${usernames[i]}@demo.pixel100.com`,
    role: roles[i],
    bio: bios[i],
    skills: i === 0 ? ["Logo", "Branding", "Illustrator"] : i === 1 ? ["Branding", "Packaging", "Figma"] : i === 2 ? ["Procreate", "Illustration", "Character"] : ["Design", "Creative"],
    location: i % 3 === 0 ? "Bangkok" : i % 3 === 1 ? "Chiang Mai" : "Phuket",
    avatar_url: avatarFor(usernames[i]),
  }));
  const { error: pErr } = await supabase.from("profiles").upsert(profiles, { onConflict: "id" });
  if (pErr) throw new Error(`profiles: ${pErr.message}`);
  console.log("Profiles upserted:", profiles.length);

  const projects = Array.from({ length: 20 }, (_, i) => {
    const cover = `https://picsum.photos/seed/an1hem-proj-${i}/800/600`;
    return {
      id: catalogProjectId(i),
      owner_id: catalogUid(i),
      title: projTitles[i],
      category: projCats[i],
      cover_url: cover,
      gallery_urls: [cover],
      tools: projTools[i],
      status: "Published",
      views: 120 + ((i * 37) % 900),
      likes: 8 + ((i * 11) % 120),
      price_thb: projPrices[i],
      description: "ผลงานจากชุมชนครีเอทีฟไทย — โพสต์เพื่อแสดงใน an1hem",
    };
  });
  const { error: projErr } = await supabase.from("projects").upsert(projects, { onConflict: "id" });
  if (projErr) throw new Error(`projects: ${projErr.message}`);
  console.log("Projects upserted:", projects.length);

  const studios = Array.from({ length: 10 }, (_, i) => ({
    id: catalogStudioId(i),
    slug: studioSlugs[i],
    name: studioNames[i],
    tagline: "สตูดิโอครีเอทีฟไทย",
    bio: "ทีมดีไซน์และคราฟต์จากชุมชน an1hem",
    avatar_url: avatarFor(`studio-${studioSlugs[i]}`),
    cover_url: `https://picsum.photos/seed/an1hem-studio-${i}/1200/400`,
    location: i % 2 === 0 ? "Bangkok" : "Chiang Mai",
    verified: i % 3 === 0,
    created_by: catalogUid(i),
    member_count: 1,
  }));
  const { error: stErr } = await supabase.from("studios").upsert(studios, { onConflict: "id" });
  if (stErr) throw new Error(`studios: ${stErr.message}`);
  console.log("Studios upserted:", studios.length);

  const members = Array.from({ length: 10 }, (_, i) => ({
    studio_id: catalogStudioId(i),
    user_id: catalogUid(i),
    role: "owner",
  }));
  const { error: memErr } = await supabase.from("studio_members").upsert(members, { onConflict: "studio_id,user_id" });
  if (memErr) throw new Error(`studio_members: ${memErr.message}`);
  console.log("Studio members upserted:", members.length);

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
  }));
  const { error: jobErr } = await supabase.from("job_posts").upsert(jobs, { onConflict: "id" });
  if (jobErr) throw new Error(`job_posts: ${jobErr.message}`);
  console.log("Job posts upserted:", jobs.length);

  const communityPosts = buildCommunitySeedPosts(catalogUid);
  const { error: commErr } = await anthemDb.from("community_posts").upsert(communityPosts, { onConflict: "id" });
  if (commErr) throw new Error(`community_posts: ${commErr.message}`);
  console.log("Community posts upserted:", communityPosts.length, "(3 per category × 8 categories)");

  const { count: commCount } = await anthemDb
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  console.log("Published community posts:", commCount ?? 0);

  const { count: after } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "Published");
  console.log("Published projects after:", after ?? 0);
  console.log("Seed complete.");
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
