#!/usr/bin/env node
/**
 * Enrich 20 @demo.pixel100.com profiles for UX review (social links, FAQ, experience).
 * Run after run-seed.mjs — idempotent upsert by user_id.
 */
import { createClient } from "@supabase/supabase-js";
import { loadSeedEnv, getSupabaseClients } from "./seed-demo-env.mjs";
import { catalogUid } from "./demo-catalog-ids.mjs";
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

const verifiedUsers = new Set([0, 1, 5, 8, 10, 16]);

function skillsFor(i) {
  if (i === 0) return ["Logo", "Branding", "Illustrator"];
  if (i === 1) return ["Branding", "Packaging", "Figma"];
  if (i === 2) return ["Procreate", "Illustration", "Character"];
  if (i === 6) return ["Figma", "UX Research", "Design System"];
  if (i === 8) return ["Lightroom", "Photoshop", "Product Photo"];
  if (i === 12) return ["After Effects", "Premiere", "Motion"];
  return ["Design", "Creative"];
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
      answer: "งานมาตรฐาน 5–14 วันทำการ ขึ้นกับ scope — งานด่วนแจ้งล่วงหน้าได้ที่ LINE @" + un,
    },
    {
      question: "ชำระเงินอย่างไร?",
      answer: "มัดจำ 50% ก่อนเริ่มงาน ที่เหลือหลังส่งมอบไฟล์ — รองรับโอนธนาคารและใบเสนอราคาผ่าน So1o",
    },
  ];
}

function buildProfiles() {
  return Array.from({ length: 20 }, (_, i) => {
    const un = usernames[i];
    const loc = i % 3 === 0 ? "Bangkok" : i % 3 === 1 ? "Chiang Mai" : "Phuket";
    return {
      user_id: catalogUid(i),
      display_name: names[i],
      username: un,
      email: `${un}@demo.pixel100.com`,
      role: roles[i],
      bio: bios[i],
      tagline: taglines[i],
      skills: skillsFor(i),
      location: loc,
      website: `https://${un}.demo.pixel100.com`,
      instagram: un,
      line_id: un,
      facebook: i % 4 === 0 ? `https://facebook.com/${un}.design` : "",
      avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${un}&backgroundColor=f5f0e8,e8dcc8`,
      cover_url: unsplashArt(i + 3, 1600, 500),
      is_verified: verifiedUsers.has(i),
      onboarding_completed: true,
      experience: experienceFor(i, roles[i]),
      profile_faq: faqFor(i),
    };
  });
}

async function main() {
  const { publicDb } = getSupabaseClients(createClient);
  const profiles = buildProfiles();

  const { error } = await publicDb.from("profiles").upsert(profiles, { onConflict: "user_id" });
  if (error) throw new Error(`profiles upsert: ${error.message}`);

  console.log("=== seed-demo-profiles ===");
  console.log(`Enriched ${profiles.length} demo profiles (@demo.pixel100.com)`);
  for (const un of ["phatsawut", "napatsara", "chatchai"]) {
    const { data, error: qErr } = await publicDb
      .from("profiles")
      .select("username, display_name, website, instagram, profile_faq, is_verified")
      .eq("username", un)
      .maybeSingle();
    if (qErr) console.warn(`  ${un}:`, qErr.message);
    else console.log(`  @${data.username}: ${data.display_name} | FAQ ${data.profile_faq?.length ?? 0} | verified=${data.is_verified}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
