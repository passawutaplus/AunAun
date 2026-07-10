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
import { unsplashArt } from "./demo-images.mjs";

loadSeedEnv();

const usernames = [
  "phatsawut", "napatsara", "pimchanok", "wannakorn", "thanya", "chatchai", "atittaya", "ploypailin",
  "thanakorn", "anucha", "parichat", "jessada", "supatra", "wathanyu", "kritsana", "siriporn",
  "kittipong", "manatsanan", "nattawut", "phattranit",
];
const names = [
  "ภัสวุฒิ ศรีวงค์", "นภัสรา ทองดี", "พิมพ์ชนก ใจดี", "วรรณกร พันธ์ทอง", "ธัญญา รัตนพร",
  "ฉัตรชัย วรกุล", "อาทิตยา จันทร์เพ็ญ", "พลอยไพลิน ขจร", "ธนกร แสงทอง", "อนุชา ภูมิดี",
  "ปาริชาต สวยงาม", "เจษฎา ท่องเที่ยว", "สุพัตรา โมชั่น", "วทัญญู เสียงดี", "กฤษณา เมโลดี้",
  "ศิริพร เงินงาม", "กิตติพงษ์ ดิจิทัล", "มนัสนันท์ อาร์ต", "ณัฐวุฒิ ภาพถ่าย", "ภัทรานิษฐ์ คอนเทนต์",
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
const taglines = [
  "โลโก้ที่เล่าเรื่องแบรนด์ได้ในพริบตา",
  "แบรนด์ไทยโมเดิร์น จำง่าย ใช้ได้จริง",
  "ภาพประกอบอบอุ่น สำหรับทุกวัย",
  "ลายผ้าไทยผสมโมเดิร์น",
  "เซรามิกมือทอ earth tone",
  "เว็บ + โปสเตอร์ที่ขายได้",
  "UX ที่ลด friction การจอง",
  "คอนเทนต์อาหารเหนือที่ดูแล้วหิว",
  "รีวิวคาเฟ่โทนมินิมอล",
  "ถ่ายสินค้า OTOP ให้ดูพรีเมียม",
  "พรีเวดดิ้งธรรมชาติ โทนอบอุ่น",
  "Vlog ท่องเที่ยวตัดต่อไหลลื่น",
  "Motion อธิบายสินค้าเข้าใจง่าย",
  "Sound design สำหรับพอดแคสต์",
  "Jingle & เพลงโฆษณา",
  "เครื่องประดับเงินแฮนด์เมด",
  "Landing page ที่ convert",
  "ภาพประกอบดิจิทัล & sticker",
  "สตรีทโฟโต้เล่าเรื่องเมือง",
  "กลยุทธ์คอนเทนต์แบรนด์",
];
const projCats = [
  "Graphic", "Graphic", "Illustration", "Craft", "Craft", "Web/UI", "Web/UI", "Web/UI", "Content", "Content",
  "Photography", "Photography", "Video", "Video", "Music/Audio", "Music/Audio", "Illustration", "Craft", "Graphic", "Web/UI",
];
const skillsByUser = [
  ["Illustrator", "Photoshop", "Branding"],
  ["Illustrator", "Figma", "Packaging"],
  ["Procreate", "Photoshop", "Character Design"],
  ["Illustrator", "Procreate", "Textile"],
  ["Ceramics", "Lightroom", "Product Styling"],
  ["Figma", "Webflow", "Print Design"],
  ["Figma", "UX Research", "Design System"],
  ["CapCut", "Premiere", "Social Content"],
  ["Lightroom", "Canva", "UGC"],
  ["Lightroom", "Photoshop", "Product Photo"],
  ["Lightroom", "Capture One", "Wedding"],
  ["Premiere", "After Effects", "Color Grading"],
  ["After Effects", "Illustrator", "Motion"],
  ["Audition", "Logic Pro", "Sound Design"],
  ["Logic Pro", "Ableton", "Composition"],
  ["Procreate", "Illustrator", "Jewelry CAD"],
  ["Figma", "React", "Tailwind"],
  ["Procreate", "Photoshop", "Sticker"],
  ["Lightroom", "Street Photo"],
  ["Notion", "Strategy", "Copywriting"],
];

const verifiedUsers = new Set([0, 1, 5, 8, 10, 16]);
const EXTRA_PROJECT_ID = "00000000-0000-0000-0002-000000000014";

function opportunityFor(i) {
  if (i % 11 === 10) {
    return { status: "not_available", types: [], openForWork: false, badge: null };
  }
  if (i % 7 === 3) {
    return {
      status: "soft_open",
      types: ["collaboration", "connection"],
      openForWork: true,
      badge: "คุยโอกาสได้",
    };
  }
  const cat = projCats[i];
  let types = ["paid_work", "collaboration"];
  if (cat === "Content") types = ["connection", "feedback_mentor"];
  if (cat === "Photography") types = ["paid_work", "connection"];
  if (cat === "Music/Audio" || cat === "Video") types = ["paid_work", "collaboration"];
  if (i === 5) types = ["paid_work", "join_team", "feedback_mentor"];
  return {
    status: "open_to_opportunities",
    types,
    openForWork: true,
    badge: i % 4 === 0 ? "รับงานอยู่" : "Open for Work",
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
      title: role.split(" & ")[0] ?? role,
      company,
      period: "2022 – ปัจจุบัน",
      description: `รับงาน ${bios[i]} สำหรับแบรนด์ไทยและ SME`,
    },
    {
      title: "Junior Designer",
      company: "Bangkok Design House",
      period: "2019 – 2022",
      description: "ทำงานร่วมทีมกับ art director และ client โดยตรง",
    },
  ];
}

function faqFor(i) {
  const un = usernames[i];
  return [
    {
      question: "รับงานประเภทไหนบ้าง?",
      answer: `${names[i]} รับงานด้าน${roles[i]} โดยเฉพาะ ${bios[i]} — ทักแชทหรือส่ง brief ผ่านระบบจ้างงานได้เลย`,
    },
    {
      question: "ใช้เวลาทำงานประมาณกี่วัน?",
      answer: `งานมาตรฐาน 5–14 วันทำการ ขึ้นกับ scope — งานด่วนแจ้งล่วงหน้าได้ที่ LINE @${un}`,
    },
    {
      question: "ชำระเงินอย่างไร?",
      answer: "มัดจำ 50% ก่อนเริ่มงาน ที่เหลือหลังส่งมอบไฟล์ — รองรับโอนธนาคารและใบเสนอราคา",
    },
  ];
}

function buildProfiles() {
  return Array.from({ length: 20 }, (_, i) => {
    const un = usernames[i];
    const loc = i % 3 === 0 ? "Bangkok" : i % 3 === 1 ? "Chiang Mai" : "Phuket";
    const opp = opportunityFor(i);
    return {
      user_id: catalogUid(i),
      display_name: names[i],
      username: un,
      email: `${un}@demo.pixel100.com`,
      role: roles[i],
      bio: bios[i],
      tagline: taglines[i],
      brand_name: i % 3 === 0 ? `${names[i].split(" ")[0]} Studio` : null,
      skills: skillsByUser[i],
      location: loc,
      website: `https://${un}.demo.pixel100.com`,
      instagram: un,
      line_id: `@${un}`,
      facebook: i % 4 === 0 ? `https://facebook.com/${un}.design` : null,
      phone: `08${String(10000000 + i * 137).slice(0, 8)}`,
      avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${un}&backgroundColor=f5f0e8,e8dcc8`,
      cover_url: unsplashArt(i + 3, 1600, 500),
      is_verified: verifiedUsers.has(i),
      verified_at: verifiedUsers.has(i) ? new Date().toISOString() : null,
      onboarding_completed: true,
      account_status: "active",
      experience: experienceFor(i, roles[i]),
      profile_faq: faqFor(i),
      opportunity_status: opp.status,
      opportunity_types: opp.types,
      open_for_work: opp.openForWork,
      open_for_work_badge: opp.badge,
      preferred_employment_types: employmentTypesFor(i),
      preferred_categories: [projCats[i]],
      feed_interests: [projCats[i], roles[i].split(" ")[0], "portfolio"],
      feed_interests_at: new Date().toISOString(),
      notify_email: true,
      notify_hire: true,
      notify_job_match: i % 2 === 0,
    };
  });
}

function buildCollections() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: collectionId(i),
    owner_id: catalogUid(i),
    name: i % 2 === 0 ? "ผลงานเด่น" : "Best of Portfolio",
    description: `คัดผลงานที่ ${names[i]} ภูมิใจ — สำหรับดูสไตล์และบริบทงาน`,
    category: projCats[i],
    is_public: true,
    cover_url: unsplashArt(i + 1, 800, 600),
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
