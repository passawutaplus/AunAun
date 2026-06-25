#!/usr/bin/env node
/**
 * Seed full demo activity for 20 creators: extra projects, gifts, job apps, inspire items, hire/collab.
 * Run after run-seed.mjs. Idempotent fixed UUIDs.
 */
import { createClient } from "@supabase/supabase-js";
import { unsplashArt } from "./demo-images.mjs";
import {
  catalogUid,
  catalogProjectId,
  catalogJobId,
  catalogStudioId,
  giftTxId,
  jobAppId,
  hireReqId,
  collabReqId,
  inspireItemId,
  inspireBoardId,
  notificationId,
  demoEmail,
} from "./demo-catalog-ids.mjs";
import { loadSeedEnv, getSupabaseClients } from "./seed-demo-env.mjs";

loadSeedEnv();
const { anthemDb, sharedDb } = getSupabaseClients(createClient);

const usernames = [
  "phatsawut", "napatsara", "pimchanok", "wannakorn", "thanya", "chatchai", "atittaya", "ploypailin",
  "thanakorn", "anucha", "parichat", "jessada", "supatra", "wathanyu", "kritsana", "siriporn",
  "kittipong", "manatsanan", "nattawut", "phattranit",
];

const EXTRA_PROJECT_ID = "00000000-0000-0000-0002-000000000014";

async function seedNapatsaraSecondProject() {
  const cover = unsplashArt(21);
  const row = {
    id: EXTRA_PROJECT_ID,
    owner_id: catalogUid(1),
    title: "แพ็กเกจจิ้งขนมไทย Premium — ชุดที่ 2",
    category: "Graphic",
    cover_url: cover,
    gallery_urls: [cover, unsplashArt(22)],
    tools: ["Illustrator", "Figma"],
    status: "Published",
    views: 3200,
    likes: 186,
    price_thb: 9500,
    description: "ชุดที่สองของแบรนด์ขนมไทย — กล่อง premium + social template",
    rights_attested_at: new Date().toISOString(),
    rights_attestation_version: "2026-06-14",
  };
  const { error } = await anthemDb.from("projects").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`extra project: ${error.message}`);
  console.log("  ✓ napatsara second project");
}

async function seedExtraJobs() {
  const extraTitles = [
    "Senior Motion Designer — โฆษณา TVC",
    "Product Photographer — สินค้า FMCG",
    "Content Strategist — แบรนด์ F&B",
  ];
  const rows = extraTitles.map((title, i) => ({
    id: catalogJobId(12 + i),
    studio_id: catalogStudioId((i + 2) % 10),
    posted_by: catalogUid(5),
    title,
    role_category: "Design",
    description: "ประกาศงานจาก chatchai (ผู้จ้าง demo) — UX review",
    skills: ["Figma", "Branding"],
    budget_min: 22000 + i * 5000,
    budget_max: 45000 + i * 8000,
    budget_type: "fixed",
    location_type: i % 2 === 0 ? "remote" : "hybrid",
    location: "Bangkok",
    status: "open",
    post_type: "hiring",
    poster_role: "client",
    employment_type: "project",
    cover_image_url: unsplashArt(12 + i, 1200, 720),
  }));
  const { error } = await anthemDb.from("job_posts").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`extra jobs: ${error.message}`);
  console.log("  ✓ extra job posts:", rows.length);
}

async function seedJobApplications() {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    rows.push({
      id: jobAppId(i),
      job_id: catalogJobId(i % 15),
      applicant_id: catalogUid((i + 4) % 20),
      cover_letter: `สวัสดีครับ/ค่ะ สนใจสมัครงานนี้มาก — แนบพอร์ตโฟลิโอ demo (${usernames[(i + 4) % 20]})`,
      portfolio_project_ids: [catalogProjectId((i + 4) % 20)],
      status: i % 3 === 0 ? "shortlisted" : "pending",
    });
  }
  const { error } = await anthemDb.from("job_applications").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`job_applications: ${error.message}`);
  console.log("  ✓ job applications:", rows.length);
}

async function seedGifts() {
  const { data: gifts, error: gErr } = await sharedDb
    .from("gifts")
    .select("id, price_px")
    .eq("active", true)
    .order("display_order")
    .limit(5);
  if (gErr) throw new Error(`gifts lookup: ${gErr.message}`);
  if (!gifts?.length) {
    console.warn("  ~ no active gifts in catalog — skip gift_transactions");
    return;
  }

  const rows = [];
  for (let i = 0; i < 18; i++) {
    const gift = gifts[i % gifts.length];
    const sender = catalogUid((i + 2) % 20);
    const recipient = catalogUid(i % 20 === 1 ? 1 : (i + 7) % 20);
    rows.push({
      id: giftTxId(i),
      sender_id: sender,
      recipient_id: recipient,
      gift_id: gift.id,
      price_px: gift.price_px,
      message: i % 2 === 0 ? "ชอบผลงานมากครับ สู้ๆ!" : "แรงบันดาลใจดีมากค่ะ",
      project_id: catalogProjectId(i % 20),
      created_at: new Date(Date.now() - i * 3600_000).toISOString(),
    });
  }
  const { error } = await sharedDb.from("gift_transactions").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`gift_transactions: ${error.message}`);
  console.log("  ✓ gift transactions:", rows.length);
}

async function seedInspireItems() {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const boardId = inspireBoardId(i);
    const projIdx = (i + 3) % 20;
    rows.push({
      id: inspireItemId(i),
      board_id: boardId,
      project_id: catalogProjectId(projIdx),
      image_url: unsplashArt(projIdx),
    });
  }
  const { error } = await anthemDb.from("inspire_items").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`inspire_items: ${error.message}`);
  console.log("  ✓ inspire items:", rows.length);
}

async function seedExtraHireCollab() {
  const hires = [];
  const collabs = [];
  for (let i = 6; i <= 13; i++) {
    const isHire = i % 2 === 0;
    const client = catalogUid(5);
    const freelancer = catalogUid((i + 2) % 20);
    const projIdx = i % 20;
    if (isHire) {
      hires.push({
        id: hireReqId(i),
        freelancer_id: freelancer,
        client_id: client,
        project_id: catalogProjectId(projIdx),
        project_title: `งานจ้าง demo #${i}`,
        client_name: "ฉัตรชัย วรกุล",
        email: demoEmail("chatchai"),
        budget: "5k-20k",
        budget_amount: 15000 + i * 1000,
        message: "สนใจจ้างออกแบบงานชิ้นนี้ครับ",
        status: i % 3 === 0 ? "ตอบรับ" : "ใหม่",
      });
    } else {
      collabs.push({
        id: collabReqId(i),
        sender_id: catalogUid((i + 1) % 20),
        recipient_id: catalogUid((i + 4) % 20),
        project_id: catalogProjectId(projIdx),
        collab_types: ["joint-project"],
        timeline: "4 สัปดาห์",
        message: "อยากชวนร่วมงานคอลแลป demo",
        attached_project_ids: [catalogProjectId(projIdx)],
        status: "accepted",
      });
    }
  }
  if (hires.length) {
    const { error } = await anthemDb.from("hiring_requests").upsert(hires, { onConflict: "id" });
    if (error) throw new Error(`hiring_requests: ${error.message}`);
  }
  if (collabs.length) {
    const { error } = await anthemDb.from("collab_requests").upsert(collabs, { onConflict: "id" });
    if (error) throw new Error(`collab_requests: ${error.message}`);
  }
  console.log("  ✓ extra hire/collab:", hires.length, "/", collabs.length);
}

async function seedExtraNotifications() {
  const kinds = [
    { kind: "gift", title: "ได้รับของขวัญใหม่", link: "/earnings" },
    { kind: "job", title: "มีผู้สมัครงานของคุณ", link: "/jobs" },
    { kind: "collab", title: "คำขอคอลแลปใหม่", link: "/chat" },
  ];
  const rows = [];
  for (let i = 20; i < 28; i++) {
    const k = kinds[i % kinds.length];
    rows.push({
      id: notificationId(i),
      user_id: catalogUid(i % 20),
      app: "anthem",
      kind: k.kind,
      title: k.title,
      body: "แจ้งเตือน demo สำหรับ UX reviewer",
      link: k.link,
      is_read: false,
      is_dismissed: false,
      created_at: new Date(Date.now() - (i - 20) * 7200_000).toISOString(),
    });
  }
  const { error } = await sharedDb.from("notifications").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`notifications: ${error.message}`);
  console.log("  ✓ extra notifications:", rows.length);
}

async function main() {
  console.log("=== seed-demo-activity (20 users) ===");
  await seedNapatsaraSecondProject();
  await seedExtraJobs();
  await seedJobApplications();
  await seedGifts();
  await seedInspireItems();
  await seedExtraHireCollab();
  await seedExtraNotifications();
  console.log("Activity seed complete.");
}

main().catch((e) => {
  console.error("Activity seed failed:", e.message);
  process.exit(1);
});
