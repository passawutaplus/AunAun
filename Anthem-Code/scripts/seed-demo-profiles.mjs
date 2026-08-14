#!/usr/bin/env node
/**
 * Enrich all 20 @demo.pixel100.com profiles for UX/mockup (full public profile surface).
 * Run after run-seed.mjs — idempotent upsert by user_id.
 */
import { createClient } from "@supabase/supabase-js";
import { loadSeedEnv, getSupabaseClients } from "./seed-demo-env.mjs";
import {
  catalogUid,
  catalogProjectId,
  collectionId,
} from "./demo-catalog-ids.mjs";
import {
  DEMO_CATALOG,
  demoCatalogAvatarUrl,
  demoCatalogCoverUrl,
} from "./demo-images.mjs";

loadSeedEnv();

const usernames = DEMO_CATALOG.map((c) => c.username);
const names = DEMO_CATALOG.map((c) => c.displayName);
const roles = DEMO_CATALOG.map((c) => c.role);
const bios = DEMO_CATALOG.map((c) => c.bio);

const EXTRA_PROJECT_ID = "00000000-0000-0000-0002-000000000014";

function opportunityFor(c) {
  return {
    status: c.opportunityStatus,
    types: c.opportunityTypes,
    openForWork: c.openForWork,
    badge: c.badge,
  };
}

function employmentTypesFor(i) {
  if (i % 6 === 0) return ["freelance", "project"];
  if (i % 6 === 1) return ["freelance", "contract"];
  if (i % 6 === 2) return ["project", "internship"];
  return ["freelance", "project", "contract"];
}

function experienceFor(i, role) {
  const company = i % 2 === 0 ? "Freelance Studio" : "Creative Collective BKK";
  return [
    {
      title: role,
      company,
      period: "2022 – ปัจจุบัน",
      description: `${bios[i]} — รับงานสำหรับแบรนด์ไทยและ SME`,
    },
    {
      title: "Junior Designer",
      company: "Bangkok Design House",
      period: "2019 – 2022",
      description: "ทำงานร่วมทีมกับ art director และลูกค้าโดยตรง",
    },
  ];
}

function faqFor(i) {
  const duration = DEMO_CATALOG[i].project.durationLabel;
  return [
    {
      question: "รับงานประเภทไหนบ้าง?",
      answer: `${names[i]} รับงานด้าน ${roles[i]} โดยเฉพาะ ${bios[i]} — ทักแชทหรือส่ง brief ผ่านระบบได้เลย`,
    },
    {
      question: "ใช้เวลาทำงานประมาณเท่าไหร่?",
      answer: `งานชิ้นล่าสุดใช้เวลา ${duration} — งานมาตรฐานประมาณ 1–6 สัปดาห์ ขึ้นกับขอบเขต`,
    },
    {
      question: "ชำระเงินอย่างไร?",
      answer: "มัดจำ 50% ก่อนเริ่มงาน ที่เหลือหลังส่งมอบไฟล์ — รองรับโอนธนาคารและใบเสนอราคา",
    },
  ];
}

function buildProfiles() {
  return DEMO_CATALOG.map((c, i) => {
    const opp = opportunityFor(c);
    return {
      user_id: catalogUid(i),
      display_name: c.displayName,
      username: c.username,
      email: `${c.username}@demo.pixel100.com`,
      role: c.role,
      bio: c.bio,
      tagline: c.tagline,
      brand_name: i % 3 === 0 ? `${c.displayName.split(" ")[0]} Studio` : null,
      skills: c.skills,
      location: c.location,
      website: `https://${c.username}.demo.pixel100.com`,
      instagram: c.username,
      line_id: `@${c.username}`,
      facebook: i % 4 === 0 ? `https://facebook.com/${c.username}.design` : null,
      phone: `08${String(10000000 + i * 137).slice(0, 8)}`,
      avatar_url: demoCatalogAvatarUrl(i),
      cover_url: demoCatalogCoverUrl(i),
      is_verified: c.verified,
      verified_at: c.verified ? new Date().toISOString() : null,
      onboarding_completed: true,
      account_status: "active",
      experience: experienceFor(i, c.role),
      profile_faq: faqFor(i),
      opportunity_status: opp.status,
      opportunity_types: opp.types,
      open_for_work: opp.openForWork,
      open_for_work_badge: opp.badge,
      preferred_employment_types: employmentTypesFor(i),
      preferred_categories: [c.project.category],
      feed_interests: [c.project.category, c.role.split(" ")[0], "portfolio"],
      feed_interests_at: new Date().toISOString(),
      notify_email: true,
      notify_hire: true,
      notify_job_match: i % 2 === 0,
    };
  });
}

function buildCollections() {
  return DEMO_CATALOG.map((c, i) => ({
    id: collectionId(i),
    owner_id: catalogUid(i),
    name: i % 2 === 0 ? "ผลงานเด่น" : "Best of Portfolio",
    description: `คัดผลงานที่ ${c.displayName} ภูมิใจ — ดูสไตล์และเบื้องหลังงาน`,
    category: c.project.category,
    is_public: true,
    cover_url: demoCatalogCoverUrl(i),
  }));
}

function buildCollectionItems() {
  const items = Array.from({ length: 20 }, (_, i) => ({
    collection_id: collectionId(i),
    project_id: catalogProjectId(i),
  }));
  items.push({
    collection_id: collectionId(1),
    project_id: EXTRA_PROJECT_ID,
  });
  return items;
}

async function main() {
  const { publicDb, anthemDb } = getSupabaseClients(createClient);
  const profiles = buildProfiles();

  const { error } = await publicDb.from("profiles").upsert(profiles, { onConflict: "user_id" });
  if (error) throw new Error(`profiles upsert: ${error.message}`);

  const collections = buildCollections();
  const collectionIds = collections.map((c) => c.id);
  await anthemDb.from("collection_items").delete().in("collection_id", collectionIds);
  await anthemDb.from("collections").delete().in("id", collectionIds);
  const { error: cErr } = await anthemDb.from("collections").insert(collections);
  if (cErr) throw new Error(`collections insert: ${cErr.message}`);

  const items = buildCollectionItems();
  const { error: iErr } = await anthemDb.from("collection_items").insert(items);
  if (iErr && !`${iErr.message}`.includes("duplicate")) {
    throw new Error(`collection_items insert: ${iErr.message}`);
  }

  console.log("=== seed-demo-profiles (full mockup) ===");
  console.log(`Profiles: ${profiles.length} | Collections: ${collections.length} | Items: ${items.length}`);

  for (const un of ["phatsawut", "napatsara", "chatchai"]) {
    const { data, error: qErr } = await publicDb
      .from("profiles")
      .select(
        "username, display_name, opportunity_status, opportunity_types, open_for_work, skills, profile_faq, is_verified",
      )
      .eq("username", un)
      .maybeSingle();
    if (qErr) console.warn(`  ${un}:`, qErr.message);
    else {
      console.log(
        `  @${data.username}: ${data.opportunity_status} | types=${(data.opportunity_types ?? []).join(",")} | skills=${(data.skills ?? []).length} | FAQ=${data.profile_faq?.length ?? 0}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
