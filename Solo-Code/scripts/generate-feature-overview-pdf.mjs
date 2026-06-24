#!/usr/bin/env node
/**
 * Generate docs/So1o-Feature-Overview.pdf (Thai, A4)
 * Usage: node scripts/generate-feature-overview-pdf.mjs
 */
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "docs/So1o-Feature-Overview.pdf");
const fontRegPath = path.join(root, "docs/fonts/Sarabun-Regular.ttf");
const fontBoldPath = path.join(root, "docs/fonts/Sarabun-Bold.ttf");

const BRAND = rgb(1, 0.373, 0.02);
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.36, 0.36, 0.36);
const LIGHT = rgb(0.55, 0.55, 0.55);
const BORDER = rgb(0.91, 0.91, 0.91);
const BG = rgb(0.98, 0.98, 0.98);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_L = 48;
const MARGIN_R = 48;
const MARGIN_T = 56;
const MARGIN_B = 48;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const SECTIONS = [
  {
    title: "1. หน้าสาธารณะ / Marketing",
    blocks: [
      {
        subtitle: "Landing /",
        items: [
          "Hero + นับ Early Access Tester (100 คนแรก)",
          "Fair Price Calculator — คำนวณราคางานฟรี",
          "So1o Mentor AI — guest 5 ครั้ง/วัน",
          "ฟีเจอร์หลัก 9 ชิ้น, Blog, PWA, Dark/Light",
          "ลิงก์ an1hem Showcase + เครื่องมือใบเสนอราคาออนไลน์",
        ],
      },
      {
        subtitle: "หน้าอื่นๆ",
        items: [
          "/pricing — Free/Pro/In-House, Stripe, SO1OBETA",
          "/creative-partner — AI ที่ปรึกษาดีไซน์",
          "/blog — บทความ SEO",
          "/apply — สมัคร Tester · /survey — ปรับ AI persona",
          "/labs — Creative Labs (Color Lab)",
        ],
      },
      {
        subtitle: "กฎหมาย & ระบบ",
        items: ["/privacy · /terms · /cookies · /refund · /unsubscribe"],
      },
    ],
  },
  {
    title: "2. เข้าสู่ระบบ (Auth)",
    blocks: [
      {
        subtitle: null,
        items: [
          "/auth — Login/Signup (อีเมล + Google OAuth)",
          "/auth/callback — OAuth callback",
          "/auth/forgot + /reset-password — ลืมรหัส / ตั้งรหัสใหม่",
          "Redirect: admin → /admin, user → /dashboard",
          "Early Access mode — บัญชีไม่ active ถูกจำกัดสิทธิ์",
        ],
      },
    ],
  },
  {
    title: "3. My Desk — หลังบ้านฟรีแลนซ์ (/dashboard)",
    blocks: [
      {
        subtitle: "งานลูกค้า",
        items: [
          "Pipeline — Kanban ดีล, สัญญาจ้าง, Usage Rights",
          "Smart Brief — AI วิเคราะห์, แชร์ลิงก์ลูกค้า",
          "Quotation — ใบเสนอราคา/ใบแจ้งหนี้/ใบเสร็จ, PDF, อีเมล",
          "Job Tracker — ติดตามงาน, สลิป, QR, License Certificate",
        ],
      },
      {
        subtitle: "การเงิน",
        items: [
          "รายได้ — ซิงค์จาก Quotation, กราฟ, CSV",
          "ภาษี — ประมาณการ, ลดหย่อน, VAT, 50ทวิ + AI scan",
          "Subscription — ติดตามค่า SaaS รายเดือน",
        ],
      },
      {
        subtitle: "วางแผน",
        items: [
          "Content Planner — ปฏิทิน, AI caption, แชร์ลูกค้า",
          "To Do List — โปรเจกต์ Kanban",
          "Feedback ลูกค้า — รอบแก้ไข (revision rounds)",
        ],
      },
      {
        subtitle: "ข้อมูล",
        items: [
          "Client — CRM, ใบแจ้งหนี้ค้างชำระ",
          "Suppliers — คลัง supplier, แชร์การ์ด",
          "Assets — Fonts, Brands, Links, Snippets, Vault",
          "Legal Desk — กฎหมาย, เช็กลิสต์, Legal Guardian AI",
        ],
      },
      {
        subtitle: "อื่นๆ & ตั้งค่า",
        items: [
          "Overview — widgets, Onboarding, สร้างดีลใหม่",
          "ข่าวสาร & เทรนด์ · Inspire — ลิงก์แรงบันดาลใจ",
          "Settings — โปรไฟล์, Billing (Stripe), Export/ลบบัญชี",
          "Command Menu Ctrl+K · Notification · PWA · Support FAB",
        ],
      },
    ],
  },
  {
    title: "4. Support & Feedback",
    blocks: [
      {
        subtitle: null,
        items: [
          "Support FAB — แชททีม, FAQ, เสนอฟีเจอร์, Changelog, แจ้งบั๊ก",
          "ตั๋วของฉัน — ติดตามสถานะ ticket",
          "Give Feedback — ฟีดแบ็ก + สร้าง Support Ticket อัตโนมัติ",
        ],
      },
    ],
  },
  {
    title: "5. Mission Control — Admin (/admin)",
    blocks: [
      {
        subtitle: null,
        items: [
          "ภาพรวม — KPI รวม, ไทม์ไลน์กิจกรรม",
          "ผู้ใช้ & Support — สมาชิก, ตั๋ว & ฟีดแบ็ก, แชท, Early Access",
          "วิเคราะห์การใช้งาน — ฟีเจอร์ยอดนิยม, รูปแบบการใช้, อุปกรณ์, AI Quota",
          "ธุรกิจ — KPI, Subscriptions, Payments (Stripe)",
          "คอนเทนต์ — ประกาศ, แบนเนอร์, บทความ Blog",
          "ระบบ — AI Center, สุขภาพระบบ, Storage, Supabase",
        ],
      },
    ],
  },
  {
    title: "6. ลิงก์สาธารณะให้ลูกค้า",
    blocks: [
      {
        subtitle: null,
        items: [
          "/brief/$token — ลูกค้ากรอก Smart Brief",
          "/track/$token — ดูความคืบหน้า Job Tracker",
          "/planner/$token — อนุมัติ Content Planner",
          "/vision/$token — Vision Canvas + voting",
          "/supplier/$token — Supplier card",
          "/license/$token — ใบรับรองสิทธิลิขสิทธิ์",
        ],
      },
    ],
  },
  {
    title: "7. AI & Edge Functions",
    blocks: [
      {
        subtitle: "AI ในแอป",
        items: [
          "So1o Mentor — Landing, FAB, Creative Partner, Legal Guardian",
          "Brief AI — วิเคราะห์บรีฟ, รูป→บรีฟ",
          "Content AI — caption/hashtag · ภาษี — scan สลิป 50ทวิ",
          "generate-contract — ร่างสัญญา · Color Lab — color-mentor",
        ],
      },
      {
        subtitle: "Quota",
        items: ["Free — AI 10 ครั้ง/เดือน, Job 3/เดือน · Pro — ไม่จำกัด"],
      },
    ],
  },
  {
    title: "8. Ecosystem (an1hem)",
    blocks: [
      {
        subtitle: null,
        items: [
          "แอปแยก — Portfolio, Showcase (VITE_ANTHEM_APP_URL)",
          "Pro plan = บัญชีเดียว So1o + an1hem",
          "Tier sync ผ่าน sync-so1o-tier Edge Function",
          "Shared Squad — ยังไม่เปิดใน UI",
        ],
      },
    ],
  },
  {
    title: "9. กำลังพัฒนา / ยังไม่ ship",
    blocks: [
      {
        subtitle: null,
        items: [
          "Creative Labs — Vision Canvas, Typo Matcher, Mockup Box (UI ยังไม่ครบ)",
          "In-House workspace",
          "Portfolio หลัก — อยู่ที่ an1hem ไม่ใช่ My Desk",
        ],
      },
    ],
  },
  {
    title: "10. Mind Map ภาพรวม",
    blocks: [
      {
        subtitle: "So1o Freelancer",
        items: [
          "Public → Landing, Pricing, Creative Partner, Blog, Apply, Survey, Labs",
          "My Desk → Pipeline, Brief, Quote, Job, รายได้, ภาษี, Content, Client, Legal",
          "Admin → Mission Control, Support/Tickets, Analytics, Business KPI",
          "Client Links → brief/track/planner/vision/supplier/license tokens",
          "AI + Edge Functions · an1hem ecosystem",
        ],
      },
    ],
  },
];

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = ch.trimStart() ? ch : "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

class PdfWriter {
  constructor(pdfDoc, page, font, fontBold) {
    this.pdfDoc = pdfDoc;
    this.page = page;
    this.font = font;
    this.fontBold = fontBold;
    this.y = MARGIN_T;
    this.pageNum = 1;
  }

  ensureSpace(needed) {
    if (this.y + needed > PAGE_H - MARGIN_B) {
      this.newPage();
    }
  }

  newPage() {
    this.page = this.pdfDoc.addPage([PAGE_W, PAGE_H]);
    this.y = MARGIN_T;
    this.pageNum += 1;
    this.drawFooter();
  }

  drawFooter() {
    const text = `So1o Freelancer Feature Overview · หน้า ${this.pageNum}`;
    this.page.drawText(text, {
      x: MARGIN_L,
      y: 28,
      size: 7,
      font: this.font,
      color: LIGHT,
    });
  }

  drawCover() {
    this.page.drawRectangle({
      x: 0,
      y: PAGE_H - 220,
      width: PAGE_W,
      height: 220,
      color: rgb(0.1, 0.1, 0.1),
    });
    this.page.drawRectangle({
      x: PAGE_W - 180,
      y: PAGE_H - 220,
      width: 180,
      height: 220,
      color: BRAND,
      opacity: 0.35,
    });

    this.page.drawText("FEATURE MAP", {
      x: MARGIN_L,
      y: PAGE_H - 72,
      size: 8,
      font: this.fontBold,
      color: BRAND,
    });
    this.page.drawText("So1o Freelancer", {
      x: MARGIN_L,
      y: PAGE_H - 108,
      size: 28,
      font: this.fontBold,
      color: rgb(1, 1, 1),
    });
    const sub = "สรุปฟีเจอร์ทั้งเว็บ — หลังบ้านฟรีแลนซ์ครบวงจร";
    this.page.drawText(sub, {
      x: MARGIN_L,
      y: PAGE_H - 132,
      size: 11,
      font: this.font,
      color: rgb(0.85, 0.85, 0.85),
    });
    this.page.drawText("อัปเดต: มิถุนายน 2026 · solofreelancer.com", {
      x: MARGIN_L,
      y: PAGE_H - 158,
      size: 9,
      font: this.font,
      color: rgb(0.6, 0.6, 0.6),
    });
    this.page.drawText("TanStack + Supabase + Gemini AI", {
      x: MARGIN_L,
      y: PAGE_H - 174,
      size: 9,
      font: this.font,
      color: rgb(0.6, 0.6, 0.6),
    });

    this.y = PAGE_H - 250;

    // TOC box
    this.page.drawRectangle({
      x: MARGIN_L,
      y: this.y - 200,
      width: CONTENT_W,
      height: 200,
      color: BG,
      borderColor: BORDER,
      borderWidth: 1,
    });
    this.page.drawText("สารบัญ", {
      x: MARGIN_L + 14,
      y: this.y - 22,
      size: 12,
      font: this.fontBold,
      color: BRAND,
    });
    const toc = SECTIONS.map((s) => s.title);
    let tocY = this.y - 42;
    const colW = CONTENT_W / 2 - 10;
    toc.forEach((item, i) => {
      const col = i < 5 ? 0 : 1;
      const row = i < 5 ? i : i - 5;
      const x = MARGIN_L + 14 + col * (colW + 10);
      const y = tocY - row * 16;
      this.page.drawText(item, {
        x,
        y,
        size: 8.5,
        font: this.font,
        color: INK,
      });
    });
    this.y -= 220;
    this.drawFooter();
  }

  drawSectionTitle(title) {
    this.ensureSpace(36);
    this.page.drawRectangle({
      x: MARGIN_L,
      y: this.y - 2,
      width: 4,
      height: 18,
      color: BRAND,
    });
    this.page.drawText(title, {
      x: MARGIN_L + 12,
      y: this.y,
      size: 13,
      font: this.fontBold,
      color: INK,
    });
    this.y -= 28;
  }

  drawSubtitle(text) {
    this.ensureSpace(20);
    this.page.drawText(text, {
      x: MARGIN_L + 4,
      y: this.y,
      size: 10,
      font: this.fontBold,
      color: BRAND,
    });
    this.y -= 16;
  }

  drawBullet(text) {
    const lines = wrapText(text, this.font, 9, CONTENT_W - 20);
    this.ensureSpace(lines.length * 13 + 4);
    for (const line of lines) {
      this.page.drawText("•", {
        x: MARGIN_L + 6,
        y: this.y,
        size: 9,
        font: this.font,
        color: BRAND,
      });
      this.page.drawText(line, {
        x: MARGIN_L + 18,
        y: this.y,
        size: 9,
        font: this.font,
        color: MUTED,
      });
      this.y -= 13;
    }
    this.y -= 4;
  }
}

async function main() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fs.readFileSync(fontRegPath));
  const fontBold = await pdfDoc.embedFont(fs.readFileSync(fontBoldPath));

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const w = new PdfWriter(pdfDoc, page, font, fontBold);
  w.drawCover();

  for (const section of SECTIONS) {
    w.drawSectionTitle(section.title);
    for (const block of section.blocks) {
      if (block.subtitle) w.drawSubtitle(block.subtitle);
      for (const item of block.items) {
        w.drawBullet(item);
      }
      w.y -= 4;
    }
    w.y -= 8;
  }

  const bytes = await pdfDoc.save();
  fs.writeFileSync(outPath, bytes);
  console.log("✓ PDF saved:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
