#!/usr/bin/env node
/**
 * Seed 6 LENY showcase job posts with local company-profile covers.
 * Closes leftover catalog jobs so the board stays at 6 cards.
 * Env: scripts/ecosystem/.env.seed.local (same as run-seed.mjs)
 *
 * Usage: node scripts/seed-job-cards-demo.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL and service role key in .env.seed.local or Solo-Code/.env");
  process.exit(1);
}

const anthemDb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "anthem" },
});

const catalogUid = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
};
const catalogStudioId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0001-0000000000${hex}`;
};
const catalogJobId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0003-0000000000${hex}`;
};

const LENY_STUDIO_ID = catalogStudioId(0);

const MOCK_JOBS = [
  {
    title: "Brand Designer — ระบบอัตลักษณ์ LENY",
    role_category: "Branding",
    description:
      "ออกแบบระบบอัตลักษณ์แบรนด์ใหม่ LENY ทั้ง logo, type, สี และ guideline สำหรับร้านธงและแพ็กเกจจิ้ง ระยะ 8 สัปดาห์",
    skills: ["Branding", "Illustrator", "Guideline"],
    budget_min: 35000,
    budget_max: 55000,
    budget_type: "monthly",
    location_type: "hybrid",
    location: "Bangkok · 2 วัน/สัปดาห์",
    employment_type: "fulltime",
    cover: "/job-covers/leny-brand-identity.png",
  },
  {
    title: "UI/UX Designer — แอปสมาชิก LENY",
    role_category: "UI/UX",
    description:
      "ออกแบบแอปสมาชิกและสะสมแต้มของ LENY ทั้ง onboarding, ร้าน, และโปรไฟล์ ทำงานร่วมกับ dev 2 คน",
    skills: ["Figma", "Prototyping", "Design System"],
    budget_min: 40000,
    budget_max: 65000,
    budget_type: "monthly",
    location_type: "remote",
    location: "Remote · GMT+7",
    employment_type: "fulltime",
    cover: "/job-covers/leny-wellness.png",
  },
  {
    title: "Photographer — Lookbook คอลเลกชันแรก",
    role_category: "Photography",
    description:
      "ถ่าย lookbook คอลเลกชันแรกของ LENY โทนผ้าไหมและแสงธรรมชาติ รวม retouch 20 ภาพ",
    skills: ["Photography", "Lightroom", "Fashion"],
    budget_min: 25000,
    budget_max: 40000,
    budget_type: "fixed",
    location_type: "hybrid",
    location: "Bangkok",
    employment_type: "parttime",
    cover: "/job-covers/leny-lookbook.png",
  },
  {
    title: "Packaging Designer — กล่องของขวัญ LENY",
    role_category: "Graphic",
    description:
      "ออกแบบกล่องของขวัญและถุงกระดาษ LENY 3 SKU พร้อม mockup และไฟล์พิมพ์",
    skills: ["Packaging", "Illustrator", "3D Mockup"],
    budget_min: 30000,
    budget_max: 48000,
    budget_type: "monthly",
    location_type: "hybrid",
    location: "Bangkok · 2 วัน/สัปดาห์",
    employment_type: "fulltime",
    cover: "/job-covers/leny-packaging.png",
  },
  {
    title: "Motion Designer — คลิปเปิดตัวแบรนด์",
    role_category: "Motion",
    description:
      "ทำโมชันเปิดตัว LENY 30 วิ + cutdown 15/6 วิ โทน terracotta และครีม ส่งไฟล์ After Effects",
    skills: ["After Effects", "Motion", "Storyboard"],
    budget_min: 32000,
    budget_max: 50000,
    budget_type: "monthly",
    location_type: "remote",
    location: "Remote",
    employment_type: "fulltime",
    cover: "/job-covers/leny-motion.png",
  },
  {
    title: "Content Creator — เรื่องราวร้านธง LENY",
    role_category: "Video",
    description:
      "ผลิตคอนเทนต์ร้านธง LENY 8 คลิป/เดือน โทน lifestyle เงียบ ถ่าย+ตัดต่อ 9:16",
    skills: ["TikTok", "Video Edit", "Lifestyle"],
    budget_min: 18000,
    budget_max: 28000,
    budget_type: "monthly",
    location_type: "remote",
    location: "Remote · ถ่ายร้านเป็นครั้งคราว",
    employment_type: "parttime",
    cover: "/job-covers/leny-store.png",
  },
  {
    title: "Interior Designer — ร้านธง LENY",
    role_category: "Other",
    description: "ออกแบบพื้นที่ร้านธง LENY ทั้งชั้นวาง แสง และวัสดุ โทน terracotta–ครีม",
    skills: ["Interior", "Retail", "Material"],
    budget_min: 38000,
    budget_max: 58000,
    budget_type: "monthly",
    location_type: "hybrid",
    location: "Bangkok · ลงร้าน",
    employment_type: "fulltime",
    cover: "/job-covers/leny-interior.png",
  },
  {
    title: "Copywriter — เสียงแบรนด์ LENY",
    role_category: "Copywriting",
    description: "เขียนโทนเสียงแบรนด์ แคปชัน และข้อความบรรจุภัณฑ์ของ LENY รายเดือน",
    skills: ["Copywriting", "Brand Voice", "Thai"],
    budget_min: 20000,
    budget_max: 32000,
    budget_type: "monthly",
    location_type: "remote",
    location: "Remote",
    employment_type: "parttime",
    cover: "/job-covers/leny-editorial.png",
  },
  {
    title: "Social Designer — เทมเพลตคอนเทนต์",
    role_category: "Graphic",
    description: "ออกแบบเทมเพลตโซเชียล LENY รายเดือน โทนเงียบ ใช้ซ้ำได้",
    skills: ["Social", "Figma", "Templates"],
    budget_min: 28000,
    budget_max: 42000,
    budget_type: "monthly",
    location_type: "remote",
    location: "Remote · GMT+7",
    employment_type: "fulltime",
    cover: "/job-covers/leny-social.png",
  },
  {
    title: "3D Artist — เรนเดอร์สินค้า LENY",
    role_category: "3D",
    description: "เรนเดอร์ขวดและกล่อง LENY สำหรับเว็บและโฆษณา 6 มุมหลัก",
    skills: ["3D", "Product Render", "Lighting"],
    budget_min: 24000,
    budget_max: 38000,
    budget_type: "fixed",
    location_type: "remote",
    location: "Remote",
    employment_type: "parttime",
    cover: "/job-covers/leny-3d.png",
  },
  {
    title: "Stylist — คอลเลกชันฤดูฝน",
    role_category: "Other",
    description: "จัดสไตล์ผ้าและพร็อพคอลเลกชันฤดูฝนของ LENY สำหรับถ่าย lookbook",
    skills: ["Styling", "Fashion", "Set"],
    budget_min: 22000,
    budget_max: 35000,
    budget_type: "fixed",
    location_type: "hybrid",
    location: "Bangkok",
    employment_type: "parttime",
    cover: "/job-covers/leny-atelier.png",
  },
  {
    title: "Web Designer — เว็บร้าน LENY",
    role_category: "Web/UI",
    description: "ออกแบบเว็บร้านและหน้าคอลเลกชัน LENY โทนมินิมอล พร้อมส่งให้ dev",
    skills: ["Web", "Figma", "E-commerce"],
    budget_min: 36000,
    budget_max: 52000,
    budget_type: "monthly",
    location_type: "hybrid",
    location: "Bangkok · 2 วัน/สัปดาห์",
    employment_type: "fulltime",
    cover: "/job-covers/leny-web.png",
  },
];

async function main() {
  console.log("Seeding 12 LENY job posts and closing leftover catalog jobs…");

  const LENY_ORG_ID = "00000000-0000-0000-0005-000000000000";
  const { error: orgErr } = await anthemDb.from("hiring_organizations").upsert({
    id: LENY_ORG_ID,
    created_by: catalogUid(0),
    legal_name: "บริษัท เลนี่ จำกัด",
    display_name: "LENY",
    org_type: "company",
    tax_id: "0105568123456",
    province: "กรุงเทพมหานคร",
    district: "วัฒนา",
    address: "สุขุมวิท 24",
    contact_name: "ทีมแบรนด์ LENY",
    contact_email: "hello@leny.example",
    contact_phone: "0200000000",
    website: "https://leny.example",
    description: "บ้านไลฟ์สไตล์แบรนด์ใหม่จากกรุงเทพ — ผ้า แพ็กเกจ และร้านธง",
    category: "lifestyle",
    status: "approved",
    reviewed_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (orgErr) console.warn("hiring org:", orgErr.message);

  const { error: studioErr } = await anthemDb
    .from("studios")
    .update({ name: "LENY", tagline: "บ้านไลฟ์สไตล์แบรนด์ใหม่จากกรุงเทพ" })
    .eq("id", LENY_STUDIO_ID);
  if (studioErr) console.warn("studio rename:", studioErr.message);

  const keepIds = MOCK_JOBS.map((_, i) => catalogJobId(i));
  const jobs = MOCK_JOBS.map((j, i) => ({
    id: catalogJobId(i),
    studio_id: LENY_STUDIO_ID,
    posted_by: catalogUid(0),
    title: j.title,
    role_category: j.role_category,
    description: j.description,
    skills: j.skills,
    budget_min: j.budget_min,
    budget_max: j.budget_max,
    budget_type: j.budget_type,
    location_type: j.location_type,
    location: j.location,
    status: "open",
    post_type: "hiring",
    poster_role: "studio",
    employment_type: j.employment_type,
    hiring_org_id: LENY_ORG_ID,
    cover_image_url: j.cover,
    applicants_count: i * 2,
    views: 120 + i * 45,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await anthemDb
    .from("job_posts")
    .upsert(jobs, { onConflict: "id" })
    .select("id, title, cover_image_url");

  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }

  const { data: extras, error: extraErr } = await anthemDb
    .from("job_posts")
    .select("id")
    .like("id", "00000000-0000-0000-0003-%")
    .not("id", "in", `(${keepIds.join(",")})`);
  if (extraErr) {
    console.warn("list extras:", extraErr.message);
  } else if (extras?.length) {
    const { error: closeErr } = await anthemDb
      .from("job_posts")
      .update({ status: "closed" })
      .in("id", extras.map((r) => r.id));
    if (closeErr) console.warn("close extras:", closeErr.message);
    else console.log("Closed leftover catalog jobs:", extras.length);
  }

  console.log("Upserted", data?.length ?? 0, "LENY jobs:");
  for (const row of data ?? []) {
    console.log(" •", row.title);
  }
  console.log("\nOpen http://localhost:8080/hiring to preview the cards.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
