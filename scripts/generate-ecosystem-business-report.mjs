#!/usr/bin/env node
/**
 * So1o + an1hem — Ecosystem Business Report (PDF, Thai, A4, CI brand)
 * Usage: node scripts/generate-ecosystem-business-report.mjs
 */
import PDFDocument from "../Anthem-Code/node_modules/pdfkit/js/pdfkit.js";
import { createWriteStream, mkdirSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fonts = {
  regular: join(root, "Anthem-Code/docs/fonts/Sarabun-Regular.ttf"),
  bold: join(root, "Anthem-Code/docs/fonts/Sarabun-Bold.ttf"),
  semi: join(root, "Anthem-Code/docs/fonts/Sarabun-SemiBold.ttf"),
};

const REPORT_DATE = "มิถุนายน 2569";
const OUT_DIR = join(root, "docs/reports");
const PDF_NAME = "So1o-an1hem-Ecosystem-Business-Report-2026-06.pdf";
const pdfPath = join(OUT_DIR, PDF_NAME);

const BRAND = {
  so1o: "#E8740C",
  an1hem: "#e85d24",
  ink: "#1a1a1a",
  muted: "#5c5c5c",
  border: "#e8e8e8",
  bgSoft: "#faf8f6",
  accent: "#fff4ee",
  dark: "#2d2419",
  ok: "#15803d",
  warn: "#b45309",
};

const MARGIN = 44;
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - MARGIN * 2;

function createDoc() {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title: "So1o + an1hem — รายงานธุรกิจและการตลาด Ecosystem",
      Author: "So1o Freelancer / an1hem",
      Subject: "Business Report",
      Keywords: "So1o, an1hem, freelancer, Thailand, ecosystem",
    },
  });
  doc.registerFont("regular", fonts.regular);
  doc.registerFont("bold", fonts.bold);
  doc.registerFont("semi", fonts.semi);
  return doc;
}

function ensureSpace(doc, needed = 56) {
  if (doc.y + needed > doc.page.height - MARGIN) doc.addPage();
}

function cover(doc) {
  const h = 200;
  const y0 = doc.y;
  doc.roundedRect(MARGIN, y0, CONTENT_W, h, 14).fill(BRAND.dark);

  doc.roundedRect(MARGIN + 16, y0 + 18, 40, 40, 8).fill(BRAND.so1o);
  doc.font("bold").fontSize(11).fillColor("#fff").text("S1", MARGIN + 16, y0 + 30, { width: 40, align: "center" });

  doc.roundedRect(MARGIN + 62, y0 + 18, 40, 40, 8).fill(BRAND.an1hem);
  doc.font("bold").fontSize(10).fillColor("#fff").text("a1h", MARGIN + 62, y0 + 30, { width: 40, align: "center" });

  doc.font("bold").fontSize(24).fillColor("#fff").text("So1o + an1hem", MARGIN + 112, y0 + 20);
  doc.font("regular").fontSize(12).fillColor("#d4c4b8").text("รายงานธุรกิจ · การตลาด · คู่แข่ง · ฟีเจอร์", MARGIN + 112, y0 + 50);

  doc.font("regular").fontSize(10).fillColor("rgba(255,255,255,0.92)").text(
    "Freelance OS ไทย — หลังบ้านครบวงจร (So1o) + หน้าร้านโชว์ผลงานชุมชน (an1hem)\nบัญชีเดียว · Supabase เดียว · Pro ครั้งเดียว",
    MARGIN + 16,
    y0 + 78,
    { width: CONTENT_W - 32, lineGap: 3 }
  );

  const pills = [
    `อัปเดต ${REPORT_DATE}`,
    "solofreelancer.com",
    "an1hem.app",
    "zkflkpbmbozrchqncpzi",
  ];
  let px = MARGIN + 16;
  const py = y0 + h - 34;
  doc.font("regular").fontSize(7.5);
  for (const pill of pills) {
    const pw = doc.widthOfString(pill) + 14;
    doc.roundedRect(px, py, pw, 16, 8).fillAndStroke("rgba(255,255,255,0.1)", "rgba(255,255,255,0.2)");
    doc.fillColor("#eee").text(pill, px + 7, py + 4);
    px += pw + 6;
  }

  doc.y = y0 + h + 24;
  doc.fillColor(BRAND.ink);

  doc.font("semi").fontSize(11).fillColor(BRAND.so1o).text("สารบัญ", MARGIN);
  doc.moveDown(0.4);
  const toc = [
    "1. สรุปผู้บริหาร (Executive Summary)",
    "2. CI / Brand Identity",
    "3. So1o Freelancer — หลังบ้านฟรีแลนซ์",
    "4. an1hem — หน้าร้านชุมชนครีเอทีฟ",
    "5. Ecosystem รวม — บัญชีเดียว",
    "6. วิเคราะห์คู่แข่ง",
    "7. โมเดลธุรกิจ & รายได้",
    "8. กลยุทธ์การตลาด",
    "9. เทคโนโลยี & โครงสร้างข้อมูล",
    "10. Roadmap & สถิติอ้างอิง",
  ];
  doc.font("regular").fontSize(9.5);
  for (const line of toc) {
    doc.fillColor(BRAND.ink).text(line, MARGIN + 8, doc.y, { width: CONTENT_W - 16 });
    doc.moveDown(0.12);
  }
  doc.moveDown(0.6);
}

function sectionTitle(doc, num, title, color = BRAND.so1o) {
  ensureSpace(doc, 48);
  const y = doc.y;
  doc.roundedRect(MARGIN, y, 24, 24, 5).fill(BRAND.accent);
  doc.fillColor(color).font("bold").fontSize(11).text(String(num), MARGIN, y + 6, { width: 24, align: "center" });
  doc.fillColor(color).font("bold").fontSize(15).text(title, MARGIN + 32, y + 3, { width: CONTENT_W - 32 });
  doc.moveTo(MARGIN, y + 30).lineTo(MARGIN + CONTENT_W, y + 30).strokeColor(BRAND.accent).lineWidth(2).stroke();
  doc.y = y + 38;
  doc.fillColor(BRAND.ink);
}

function subTitle(doc, text) {
  ensureSpace(doc, 28);
  doc.font("semi").fontSize(11).fillColor(BRAND.ink).text(text, MARGIN);
  doc.moveDown(0.25);
}

function para(doc, text) {
  ensureSpace(doc, 24);
  doc.font("regular").fontSize(9.5).fillColor(BRAND.ink).text(text, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
  doc.moveDown(0.35);
}

function bullets(doc, items) {
  doc.font("regular").fontSize(9.5);
  for (const item of items) {
    ensureSpace(doc, 18);
    doc.fillColor(BRAND.ink).text(`• ${item}`, MARGIN + 4, doc.y, { width: CONTENT_W - 8, lineGap: 1 });
    doc.moveDown(0.1);
  }
  doc.moveDown(0.25);
}

function statRow(doc, stats) {
  ensureSpace(doc, 52);
  const gap = 8;
  const w = (CONTENT_W - gap * (stats.length - 1)) / stats.length;
  const y0 = doc.y;
  let x = MARGIN;
  for (const s of stats) {
    doc.roundedRect(x, y0, w, 46, 8).fillAndStroke(BRAND.accent, BRAND.border);
    doc.font("bold").fontSize(14).fillColor(BRAND.so1o).text(s.value, x + 8, y0 + 8, { width: w - 16, align: "center" });
    doc.font("regular").fontSize(7.5).fillColor(BRAND.muted).text(s.label, x + 6, y0 + 28, { width: w - 12, align: "center" });
    x += w + gap;
  }
  doc.y = y0 + 54;
}

function table(doc, headers, rows, colWidths) {
  const rowPad = 6;
  doc.font("semi").fontSize(8.5);
  let headerH = rowPad * 2 + 10;
  for (let i = 0; i < headers.length; i++) {
    headerH = Math.max(headerH, rowPad * 2 + doc.heightOfString(headers[i], { width: colWidths[i] - 10 }));
  }
  doc.font("regular").fontSize(8.5);
  const rowHeights = rows.map((row) => {
    let h = rowPad * 2;
    for (let i = 0; i < row.length; i++) {
      h = Math.max(h, rowPad * 2 + doc.heightOfString(row[i], { width: colWidths[i] - 10 }));
    }
    return h;
  });
  ensureSpace(doc, headerH + rowHeights.reduce((a, b) => a + b, 0) + 8);
  const startY = doc.y;
  let x = MARGIN;
  let y = startY;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, y, colWidths[i], headerH).fillAndStroke(BRAND.accent, BRAND.border);
    doc.font("semi").fontSize(8.5).fillColor(BRAND.ink).text(headers[i], x + 5, y + rowPad, { width: colWidths[i] - 10 });
    x += colWidths[i];
  }
  y += headerH;
  rows.forEach((row, ri) => {
    x = MARGIN;
    const rh = rowHeights[ri];
    for (let i = 0; i < row.length; i++) {
      doc.rect(x, y, colWidths[i], rh).stroke(BRAND.border);
      doc.font("regular").fontSize(8.5).fillColor(BRAND.ink).text(row[i], x + 5, y + rowPad, { width: colWidths[i] - 10 });
      x += colWidths[i];
    }
    y += rh;
  });
  doc.y = y + 10;
}

function featureGrid(doc, cards) {
  const gap = 8;
  const cols = 2;
  const w = (CONTENT_W - gap) / cols;
  let col = 0;
  let rowY = doc.y;
  let maxH = 0;

  function flushRow() {
    doc.y = rowY + maxH + gap;
    col = 0;
    maxH = 0;
    rowY = doc.y;
  }

  for (const card of cards) {
    if (col === 0) {
      ensureSpace(doc, 80);
      rowY = doc.y;
      maxH = 0;
    }
    const x = MARGIN + col * (w + gap);
    const pad = 8;
    doc.font("semi").fontSize(9);
    const titleH = doc.heightOfString(card.title, { width: w - pad * 2 });
    doc.font("regular").fontSize(8.5);
    let itemsH = 0;
    for (const it of card.items) itemsH += doc.heightOfString(`• ${it}`, { width: w - pad * 2 }) + 3;
    const cardH = pad + titleH + 5 + itemsH + pad;

    doc.roundedRect(x, rowY, w, cardH, 7).fillAndStroke(BRAND.bgSoft, BRAND.border);
    let cy = rowY + pad;
    doc.font("semi").fontSize(9).fillColor(BRAND.so1o).text(card.title, x + pad, cy, { width: w - pad * 2 });
    cy += titleH + 5;
    doc.font("regular").fontSize(8.5).fillColor(BRAND.ink);
    for (const it of card.items) {
      doc.text(`• ${it}`, x + pad, cy, { width: w - pad * 2 });
      cy += doc.heightOfString(`• ${it}`, { width: w - pad * 2 }) + 3;
    }
    maxH = Math.max(maxH, cardH);
    col++;
    if (col >= cols) flushRow();
  }
  if (col > 0) flushRow();
}

function ecosystemDiagram(doc) {
  ensureSpace(doc, 175);
  const y0 = doc.y;
  const boxH = 165;
  doc.roundedRect(MARGIN, y0, CONTENT_W, boxH, 10).stroke(BRAND.border);

  const mid = MARGIN + CONTENT_W / 2;
  doc.roundedRect(mid - 70, y0 + 10, 140, 26, 13).fill(BRAND.dark);
  doc.font("bold").fontSize(10).fillColor("#fff").text("Unified Account · Pro ครั้งเดียว", mid - 70, y0 + 17, { width: 140, align: "center" });

  const leftW = 200;
  const rightW = 200;
  doc.roundedRect(MARGIN + 20, y0 + 48, leftW, 52, 8).fillAndStroke(BRAND.accent, BRAND.so1o);
  doc.font("bold").fontSize(11).fillColor(BRAND.so1o).text("So1o — หลังบ้าน", MARGIN + 28, y0 + 56);
  doc.font("regular").fontSize(8).fillColor(BRAND.ink).text("ใบเสนอราคา · CRM · การเงิน · ภาษี · Brief", MARGIN + 28, y0 + 72, { width: leftW - 16 });

  doc.roundedRect(MARGIN + CONTENT_W - rightW - 20, y0 + 48, rightW, 52, 8).fillAndStroke(BRAND.accent, BRAND.an1hem);
  doc.font("bold").fontSize(11).fillColor(BRAND.an1hem).text("an1hem — หน้าร้าน", MARGIN + CONTENT_W - rightW - 12, y0 + 56);
  doc.font("regular").fontSize(8).fillColor(BRAND.ink).text("พอร์ตโฟลิโอ · ฟีด · จ้างงาน · ของขวัญ", MARGIN + CONTENT_W - rightW - 12, y0 + 72, { width: rightW - 16 });

  doc.moveTo(mid, y0 + 36).lineTo(MARGIN + 120, y0 + 48).strokeColor(BRAND.muted).lineWidth(1).stroke();
  doc.moveTo(mid, y0 + 36).lineTo(MARGIN + CONTENT_W - 120, y0 + 48).stroke();

  doc.roundedRect(mid - 90, y0 + 112, 180, 40, 8).fill("#f0f0f0");
  doc.font("semi").fontSize(8.5).fillColor(BRAND.ink).text("Supabase zkflkpbmbozrchqncpzi", mid - 90, y0 + 120, { width: 180, align: "center" });
  doc.font("regular").fontSize(7.5).fillColor(BRAND.muted).text("public · shared · anthem · so1o", mid - 90, y0 + 134, { width: 180, align: "center" });

  doc.y = y0 + boxH + 10;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const doc = createDoc();
  const out = createWriteStream(pdfPath);
  doc.pipe(out);

  cover(doc);

  // ── 1 Executive Summary ──
  sectionTitle(doc, 1, "สรุปผู้บริหาร (Executive Summary)");
  para(doc,
    "So1o Freelancer และ an1hem เป็น Ecosystem สำหรับฟรีแลนซ์ครีเอทีฟไทย ที่แยกบทบาทชัดเจน: So1o เป็น \"หลังบ้าน\" (My Desk) จัดการลูกค้า ใบเสนอราคา การเงิน ภาษี และ workflow งาน — an1hem เป็น \"หน้าร้าน\" โชว์ผลงาน สร้างชุมชน รับจ้าง และรับการสนับสนุนผ่านระบบ Pixel"
  );
  statRow(doc, [
    { value: "2", label: "แอปใน Ecosystem" },
    { value: "1", label: "บัญชี Supabase" },
    { value: "249฿", label: "Pro / เดือน" },
    { value: "100", label: "Beta Tester เป้า" },
  ]);
  bullets(doc, [
    "Positioning: Freelance OS ไทย — แข่ง \"Excel + Line + นักบัญชี\" ไม่ใช่ FlowAccount ตรงๆ",
    "จุดแข็ง So1o: ภาษีไทย (WHT/50ทวิ), Smart Brief, Creative Labs, AI Mentor",
    "จุดแข็ง an1hem: ฟีดชุมชน, จ้างงาน/Collab, Pixel gifting, AI similar images",
    "Monetization: Stripe subscription, Credit top-up, โฆษณา/Boost an1hem, ถอน Pixel tier 15%/10%, Escrow 5%/2.5%",
  ]);

  // ── 2 Brand CI ──
  sectionTitle(doc, 2, "CI / Brand Identity");
  table(doc, ["องค์ประกอบ", "So1o Freelancer", "an1hem"], [
    ["ชื่อแบรนด์", "So1o Freelancer (So1o)", "Anthem / an1hem"],
    ["โดเมน", "solofreelancer.com", "an1hem.app"],
    ["สีหลัก", "#E8740C / #FF5F05 (Warm Orange)", "#e85d24 (Radiant Orange)"],
    ["ฟอนต์", "IBM Plex Sans Thai + JetBrains Mono", "IBM Plex Sans Thai"],
    ["Tagline", "หลังบ้านครบวงจรสำหรับฟรีแลนซ์", "ชุมชนพอร์ตโฟลิโอและครีเอเตอร์ฟรีแลนซ์"],
    ["Contact", "hello@solofreelancer.com · LINE @solofreelancer", "—"],
    ["Auth", "Email + Google OAuth", "Email + Google OAuth (บัญชีร่วม)"],
  ], [100, 220, CONTENT_W - 320]);

  subTitle(doc, "Visual & Tone");
  bullets(doc, [
    "โทนอบอุ่น มืออาชีพ — พื้นหลัง warm off-white (#F2F1EE / #fafafa)",
    "Gradient signature: deep-orange → orange → warm-glow",
    "รองรับ Dark mode · PWA installable (So1o)",
    "Copy ภาษาไทยเป็นหลัก · PDPA compliant · Made with ♥ for Thai freelancers",
  ]);

  // ── 3 So1o ──
  doc.addPage();
  sectionTitle(doc, 3, "So1o Freelancer — หลังบ้านฟรีแลนซ์", BRAND.so1o);
  para(doc, "เป้าหมาย: ฟรีแลนซ์ไทยสายดีไซน์/กราฟิก/คอนเทนต์ — ทำงานน้อยลง แต่ได้เงินมากขึ้น ด้วยเครื่องมือครบวงจรในแอปเดียว");
  subTitle(doc, "ฟีเจอร์หลัก (แบ่งหมวด)");
  featureGrid(doc, [
    { title: "การเงิน & ภาษี", items: ["Income tracker + กราฟรายเดือน", "Tax estimator ภาษีไทย", "WHT/50ทวิ AI scan", "Subscriptions tracker (SaaS)", "CSV export"] },
    { title: "ลูกค้า & งาน", items: ["CRM Clients", "Pipeline Kanban", "Job Tracker (stages)", "Smart Brief + public link", "Feedback rounds"] },
    { title: "ใบเสนอราคา", items: ["Quotation/Invoice/Receipt", "PDF export + ส่งอีเมล", "ติดตามหนี้", "Fair Price Calculator (AI)", "Usage Rights / License"] },
    { title: "Creative & AI", items: ["Color Lab", "Vision Canvas", "So1o Mentor AI", "Content Planner + AI caption", "Legal Guardian AI"] },
    { title: "ข้อมูล & ทรัพย์สิน", items: ["Brand kit / Assets vault", "Suppliers directory", "Legal Desk + สัญญา", "Inspire curated links", "Daily trends AI"] },
    { title: "Marketing & สาธารณะ", items: ["Landing + Early Access 100", "Blog SEO", "Creative Partner page", "Beta apply form", "an1hem showcase section"] },
    { title: "Client Portal (token)", items: ["/brief/$token", "/track/$token", "/planner/$token", "/vision/$token", "/license/$token"] },
    { title: "Admin Mission Control", items: ["KPI overview", "Users & tickets", "Stripe payments", "AI usage analytics", "Content & banners"] },
  ]);

  subTitle(doc, "แพ็กเกจ & ราคา (So1o)");
  table(doc, ["แพ็ก", "ราคา", "ไฮไลท์"], [
    ["Free", "0 ฿", "3 งาน/เดือน · CRM · ใบเสนอราคาพื้นฐาน · AI 10 ครั้ง/เดือน"],
    ["Pro", "249 ฿/เดือน (2,388 ฿/ปี)", "งานไม่จำกัด · AI ไม่จำกัด · ปลดล็อก an1hem"],
    ["In-House", "599 ฿/ที่นั่ง (เร็วๆ นี้)", "2–50 ที่นั่ง · workspace ทีม"],
    ["Credits Starter", "99 ฿ → 100 credits", "เติม AI credits ไม่หมดอายุ"],
    ["Credits Boost", "399 ฿ → 500 credits", "~0.80 ฿/credit"],
    ["Credits Pro Pack", "1,290 ฿ → 2,000 credits", "~0.65 ฿/credit"],
    ["SO1OBETA", "Pro ฟรี 1 ปี", "100 คนแรก · ต้องมีบัตรยืนยันตัวตน"],
  ], [90, 130, CONTENT_W - 220]);

  // ── 4 an1hem ──
  doc.addPage();
  sectionTitle(doc, 4, "an1hem — หน้าร้านชุมชนครีเอทีฟ", BRAND.an1hem);
  para(doc, "แพลตฟอร์มโชว์เคสผลงานสำหรับฟรีแลนซ์ไทย — ลงผลงาน ติดตามครีเอเตอร์ ส่งของขวัญสนับสนุน ค้นหางานดีไซน์ และสร้างสตูดิโอ");
  featureGrid(doc, [
    { title: "ฟีด & ค้นหา", items: ["Explore / For You / Following", "Projects · Designers · Studios", "ค้นหา + กรองหมวด", "โฆษณาแทรกฟีด (Sponsored)", "Hero สถิติชุมชน"] },
    { title: "Portfolio", items: ["ลง/แก้ผลงาน (20 ภาพ)", "Draft / Published / Private", "ลิขสิทธิ์ 6 preset", "ToolPicker & TagPicker", "AI Similar Images (pgvector)"] },
    { title: "Social", items: ["ไลค์ · คอมเมนต์ · แชร์", "คอลเลกชัน · Inspire boards", "ติดตามครีเอเตอร์", "รายงานเนื้อหา", "นับยอดวิว"] },
    { title: "จ้างงาน & งาน", items: ["ปุ่มสนใจจ้าง (Hire)", "Collab requests", "บอร์ดงาน /jobs", "สมัครงาน", "แจ้งเตือนงานตรงสกิล"] },
    { title: "สตูดิโอ", items: ["สร้าง/จัดการสตูดิโอ", "โปรไฟล์ /s/:slug", "คำเชิญร่วมก่อตั้ง", "เครดิตทีมบนผลงาน", "Studio manage"] },
    { title: "Pixel & การเงิน", items: ["กระเป๋า Pixel (PX)", "ส่งของขวัญบนผลงาน", "เติม Pixel ใช้ทันที", "ถอน Free 15% / Pro 10%", "Welcome Bonus 100 px", "AML/KYC compliance"] },
    { title: "สัญญา & กฎหมาย", items: ["ร่างสัญญา AI", "Freelance / พนักงาน", "PDPA · ลบบัญชี", "ลิขสิทธิ์ /legal/ip", "Cookie consent"] },
    { title: "Admin (19+ หน้า)", items: ["Users · Projects · Jobs", "Wallet · Gifts · Ads", "AML · KYC · Reports", "Chats · Analytics", "Storage · Audit"] },
  ]);

  subTitle(doc, "โฆษณา an1hem (Ad Packages)");
  table(doc, ["แพ็ก", "ราคา", "ระยะเวลา", "ประมาณ Impressions"], [
    ["Basic", "990 ฿", "7 วัน", "≈ 3,000"],
    ["Standard", "2,490 ฿", "14 วัน", "≈ 10,000"],
    ["Premium", "5,900 ฿", "30 วัน", "≈ 30,000"],
  ], [80, 80, 80, CONTENT_W - 240]);

  // ── 5 Ecosystem ──
  doc.addPage();
  sectionTitle(doc, 5, "Ecosystem รวม — บัญชีเดียว");
  ecosystemDiagram(doc);
  bullets(doc, [
    "Supabase project เดียว: zkflkpbmbozrchqncpzi (schemas: public, shared, anthem, so1o)",
    "profiles.user_id = auth.uid() — แถวเดียวสำหรับ subscription_tier ทั้งสองแอป",
    "สมัคร So1o Pro ครั้งเดียว → ใช้สิทธิ์ Pro บน an1hem ทันที",
    "Loop ธุรกิจ: ลงผลงาน an1hem → ลูกค้าจ้าง → ทำใบเสนอราคา So1o → ส่งงาน → โพสต์ผลงานกลับ an1hem",
    "หมายเหตุ: คนละโดเมน = คนละ cookie session (SSO ร่วมอยู่ใน roadmap Q1 2027)",
  ]);

  subTitle(doc, "Shared Infrastructure");
  table(doc, ["ชั้น", "รายละเอียด"], [
    ["Database", "Postgres + RLS · pgvector สำหรับ similar images"],
    ["Auth", "Supabase Auth · Google OAuth · PKCE flow"],
    ["Payments", "Stripe (subscription + credits) · webhook อัปเดต tier"],
    ["AI", "Google Gemini 2.0 Flash (Edge Functions)"],
    ["Storage", "Supabase Storage (project-media + So1o buckets)"],
    ["Deploy", "So1o: Vercel SSR · an1hem: Vercel SPA · Ops Hub: Vercel"],
  ], [110, CONTENT_W - 110]);

  // ── 6 Competitors ──
  sectionTitle(doc, 6, "วิเคราะห์คู่แข่ง");
  subTitle(doc, "ระดับโลก — Client workflow");
  table(doc, ["", "HoneyBook", "Bonsai", "So1o"], [
    ["กลุ่มเป้า", "Creative US/EU", "Freelancer + agency", "ฟรีแลนซ์ไทย ดีไซน์/กราฟิก"],
    ["ใบเสนอราคา/สัญญา", "แข็งมาก", "แข็งมาก", "Quotation + Brief PDF"],
    ["CRM/Pipeline", "ใช่", "ใช่", "CRM + Job tracker"],
    ["ภาษีไทย/WHT", "ไม่", "ไม่", "จุดแข็งหลัก ✓"],
    ["Creative tools", "จำกัด", "จำกัด", "Labs, Color, Vision, AI"],
    ["ราคา", "$19–79/mo USD", "$21–79/mo USD", "Free + 249฿ Pro"],
  ], [95, 115, 115, CONTENT_W - 325]);

  subTitle(doc, "ระดับไทย — บัญชี & โชว์เคส");
  table(doc, ["", "FlowAccount", "Peak", "Behance/Fastwork*", "So1o+an1hem"], [
    ["โฟกัส", "SME บัญชี", "บัญชี+payroll", "Portfolio/Jobs", "Freelance OS + ชุมชน"],
    ["Brief/revision", "ไม่", "ไม่", "จำกัด", "Smart Brief + Feedback"],
    ["Community feed", "ไม่", "ไม่", "บางส่วน", "an1hem feed + gifting"],
    ["ราคา", "หลักร้อย–พัน/เดือน", "คล้ายกัน", "ฟรี–ค่าคอม", "เริ่มฟรี + ecosystem"],
  ], [80, 100, 100, 110, CONTENT_W - 390]);
  doc.font("regular").fontSize(7.5).fillColor(BRAND.muted).text("* คู่แข่งโดยนัยจาก positioning ไม่ได้อ้างอิงในโค้ดโดยตรง", MARGIN);
  doc.moveDown(0.5);

  // ── 7 Business Model ──
  doc.addPage();
  sectionTitle(doc, 7, "โมเดลธุรกิจ & รายได้");
  table(doc, ["สตรีมรายได้", "ผลิตภัณฑ์", "สถานะ", "หมายเหตุ"], [
    ["Subscription", "So1o Pro 249฿/เดือน", "พร้อม (Stripe)", "ปลดล็อกทั้ง ecosystem"],
    ["Credit top-up", "AI credits 99–1,290฿", "พร้อม", "ไม่หมดอายุ"],
    ["Team plan", "In-House 599฿/ที่นั่ง", "Coming soon", "2–50 seats"],
    ["Ads", "an1hem 990–5,900฿", "พร้อม", "Basic/Standard/Premium"],
    ["Platform fee", "ถอน Pixel Free 15% / Pro 10%", "พร้อม", "config ใน gift_limits_config"],
    ["Boost", "an1hem 99–499฿", "พร้อม (Stripe)", "Self-serve + dashboard /portfolio"],
    ["Escrow", "งานจ้าง Free 5% / Pro 2.5%", "พร้อม (Stripe)", "Optional trust layer /pay/:token"],
    ["Client payment", "QR/Payment link (job tracker)", "พร้อมบางส่วน", "โอนตรง ไม่รับประกัน refund"],
  ], [95, 150, 80, CONTENT_W - 325]);

  subTitle(doc, "Unit Economics (อ้างอิงจากราคาในโค้ด)");
  bullets(doc, [
    "Pro รายปี: 2,388฿ (~199฿/เดือน) ประหยัด 600฿/ปี vs รายเดือน",
    "Credit Pro Pack: ~0.65฿/credit — margin จาก Gemini API cost",
    "Ad Premium: 5,900฿/30 วัน ≈ 30,000 impressions",
    "Pixel cashout: Free 15% · Pro 10% · Welcome Bonus สูงสุด 100 px",
  ]);

  // ── 8 Marketing ──
  sectionTitle(doc, 8, "กลยุทธ์การตลาด");
  featureGrid(doc, [
    { title: "Acquisition", items: ["Early Access 100 คน (scarcity)", "Fair Price Calculator ฟรี", "Guest AI Mentor 5 ครั้ง/วัน", "Blog SEO", "Beta code SO1OBETA"] },
    { title: "Conversion", items: ["Landing CTA สมัครฟรี", "Pricing โปร่งใส ไม่มีแฝง", "Ecosystem pitch บัญชีเดียว", "PWA install", "LINE @solofreelancer"] },
    { title: "Retention", items: ["Dashboard onboarding checklist", "Job loop ครบวงจร", "an1hem feed engagement", "Pro unlock ทั้งสองแอป", "Notification + support tickets"] },
    { title: "Content & Trust", items: ["PDPA privacy/export/delete", "Legal pages ครบ", "License certificate", "Admin transparency", "Beta feedback panel"] },
  ]);

  subTitle(doc, "Key Messages (จาก Landing Copy)");
  bullets(doc, [
    "\"ทำงานฟรีแลนซ์ให้ง่ายกว่าเดิม 10 เท่า\"",
    "\"บริหารลูกค้า ใบเสนอราคา การเงิน ภาษี — ในแอปเดียว\"",
    "\"So1o = หลังบ้านงาน · an1hem = หน้าร้านโชว์ผลงาน\"",
    "\"สมัครฟรี ไม่ต้องใช้บัตรเครดิต · ใช้งานภาษาไทย · รองรับภาษีไทย\"",
  ]);

  // ── 9 Tech ──
  doc.addPage();
  sectionTitle(doc, 9, "เทคโนโลยี & โครงสร้างข้อมูล");
  table(doc, ["แอป", "Frontend", "Backend", "Deploy"], [
    ["So1o", "TanStack Start + React 19 + Vite 7", "Supabase + Edge Functions", "Vercel"],
    ["an1hem", "React 18 + Vite + React Router", "Supabase (anthem schema)", "Vercel SPA"],
  ], [60, 170, 170, CONTENT_W - 400]);

  subTitle(doc, "AI Stack (Gemini)");
  table(doc, ["ฟีเจอร์", "Edge Function / Module"], [
    ["So1o Mentor / Design chat", "ai-design-chat"],
    ["Price suggest", "ai-price-suggest"],
    ["Color mentor", "color-mentor"],
    ["Content planner", "planner-ai-assist"],
    ["Contract draft", "generate-contract"],
    ["Similar images", "similar-images + embed-project"],
    ["WHT scan / Brief extract", "Server functions (TanStack)"],
  ], [200, CONTENT_W - 200]);

  // ── 10 Roadmap & Stats ──
  sectionTitle(doc, 10, "Roadmap & สถิติอ้างอิง");
  subTitle(doc, "Roadmap สรุป (จาก docs/ROADMAP.md)");
  table(doc, ["ไตรมาส", "เป้า", "ไฮไลท์"], [
    ["Q3 2026", "Conversion + เก็บเงิน", "Onboarding 3 ขั้น · Help Center · อีเมลแจ้งลูกค้า · เปิด Pro checkout"],
    ["Q4 2026", "Client experience", "Client portal · Approve quotation · Payment link/QR · Export ภาษี"],
    ["Q1 2027", "ทีม & ecosystem", "In-House workspace · SSO So1o↔an1hem · Figma plugin"],
    ["Q2 2027", "Scale & trust", "2FA · Status page · FlowAccount export · Time tracking"],
  ], [70, 120, CONTENT_W - 190]);

  subTitle(doc, "สถิติ & ตัวเลขอ้างอิง (จาก codebase)");
  table(doc, ["ตัวชี้วัด", "ค่า", "แหล่ง"], [
    ["Early Access เป้า", "100 users", "Landing + public-stats"],
    ["Price Calculator baseline", "87+ (DB realtime)", "CalculatorUsageBadge"],
    ["Free plan งาน", "3 งาน/เดือน", "planLimits.ts"],
    ["Free AI uses", "10 ครั้ง/เดือน", "plans.ts"],
    ["Guest Mentor limit", "5 ครั้ง/วัน", "LandingMentorChat"],
    ["Pro ประหยัดรายปี", "600 ฿/ปี", "pricing.tsx"],
    ["In-House seats", "2–50 ที่นั่ง", "pricing.tsx"],
    ["Platform fee ถอน", "Free 15% / Pro 10%", "gift_limits_config"],
    ["Welcome Bonus", "100 px cap", "claim_welcome_mission"],
    ["PX hold", "0 ชม.", "ใช้ส่ง gift ทันที"],
    ["Migrations applied", "118+", "Supabase (มิ.ย. 2026)"],
  ], [140, 120, CONTENT_W - 260]);

  ensureSpace(doc, 50);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).strokeColor(BRAND.border).stroke();
  doc.moveDown(0.6);
  doc.font("regular").fontSize(8).fillColor(BRAND.muted).text(
    "รายงานนี้สร้างอัตโนมัติจาก codebase และเอกสารใน repo · ไม่รวมข้อมูลลับหรือ revenue จริงจาก production\n" +
      `สร้างเมื่อ ${REPORT_DATE} · ${pdfPath}`,
    MARGIN,
    doc.y,
    { width: CONTENT_W, align: "center", lineGap: 2 }
  );

  doc.end();
  await new Promise((res, rej) => {
    out.on("finish", res);
    out.on("error", rej);
  });

  const docsCopy = join(homedir(), "Documents", PDF_NAME);
  try {
    copyFileSync(pdfPath, docsCopy);
    console.log("✓ คัดลอกไป:", docsCopy);
  } catch {
    console.log("  (ข้ามคัดลอก Documents — ใช้ path ใน repo)");
  }
  console.log("✓ PDF:", pdfPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
