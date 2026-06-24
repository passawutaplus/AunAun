#!/usr/bin/env node
/**
 * Seed 6 showcase job posts with cover_image_url for the job board card UI.
 * Env: scripts/ecosystem/.env.seed.local (same as run-seed.mjs)
 *
 * Usage: node scripts/seed-job-cards-demo.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { unsplashArt } from "./demo-images.mjs";

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

const MOCK_JOBS = [
  {
    title: "Senior UI/UX Designer — แอป Wellness",
    role_category: "UI/UX",
    description:
      "ออกแบบ flow ครบ 14 หน้าจอ สร้าง design system และ prototype ใน Figma ทำงานร่วมกับ dev 2 คน ระยะ 6 สัปดาห์",
    skills: ["Figma", "Prototyping", "Design System"],
    budget_min: 45000,
    budget_max: 75000,
    budget_type: "fixed",
    location_type: "remote",
    location: "Remote · GMT+7",
    employment_type: "project",
    coverIndex: 0,
  },
  {
    title: "Brand Designer — สตาร์ทอัป Fintech",
    role_category: "Branding",
    description:
      "รีแบรนด์ครบชุด logo, color, typography, social templates และ pitch deck สำหรับ Series A",
    skills: ["Branding", "Illustrator", "Pitch Deck"],
    budget_min: 80000,
    budget_max: 120000,
    budget_type: "fixed",
    location_type: "hybrid",
    location: "Bangkok · 2 วัน/สัปดาห์ onsite",
    employment_type: "project",
    coverIndex: 3,
  },
  {
    title: "Motion Designer — คลิปสินค้า 30 วิ",
    role_category: "Motion",
    description:
      "ทำ motion graphic โฆษณา 30 วิ + cutdown 15/6 วิ สไตล์ flat สดใส ส่งไฟล์ After Effects",
    skills: ["After Effects", "Motion", "Storyboard"],
    budget_min: 25000,
    budget_max: 40000,
    budget_type: "fixed",
    location_type: "remote",
    location: "Remote",
    employment_type: "project",
    coverIndex: 7,
  },
  {
    title: "Photographer — Lookbook คอลเลกชันใหม่",
    role_category: "Photography",
    description:
      "ถ่าย lookbook 20 ลุค โทน natural light สำหรับแบรนด์แฟชั่นไทย รวม retouch 20 ภาพ",
    skills: ["Photography", "Lightroom", "Fashion"],
    budget_min: 35000,
    budget_max: 55000,
    budget_type: "fixed",
    location_type: "onsite",
    location: "Bangkok",
    employment_type: "project",
    coverIndex: 10,
  },
  {
    title: "Graphic Designer — Packaging ขนมไทย Premium",
    role_category: "Graphic",
    description:
      "ออกแบบกล่องและถุงขนมไทย premium 3 SKU พร้อม mockup 3D และไฟล์ print-ready",
    skills: ["Packaging", "Illustrator", "3D Mockup"],
    budget_min: 28000,
    budget_max: 45000,
    budget_type: "fixed",
    location_type: "hybrid",
    location: "Chiang Mai",
    employment_type: "project",
    coverIndex: 1,
  },
  {
    title: "Content Creator — TikTok สายอาหาร",
    role_category: "Video",
    description:
      "ผลิตคอนเทนต์ TikTok 8 คลิป/เดือน ถ่าย+ตัดต่อ 9:16 โฟกัสร้านอาหารและ street food",
    skills: ["TikTok", "Video Edit", "Food Content"],
    budget_min: 18000,
    budget_max: 30000,
    budget_type: "monthly",
    location_type: "onsite",
    location: "Bangkok · ถ่าย onsite",
    employment_type: "parttime",
    coverIndex: 13,
  },
];

async function main() {
  console.log("Seeding 6 showcase job posts with cover images…");

  const jobs = MOCK_JOBS.map((j, i) => ({
    id: catalogJobId(i),
    studio_id: catalogStudioId(i),
    posted_by: catalogUid(i),
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
    cover_image_url: unsplashArt(j.coverIndex, 1200, 720),
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

  console.log("Upserted", data?.length ?? 0, "jobs:");
  for (const row of data ?? []) {
    console.log(" •", row.title);
  }
  console.log("\nOpen http://localhost:8080/jobs to preview the cards.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
