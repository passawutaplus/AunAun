#!/usr/bin/env node
/** Generate docs/anthem-feature-map.pdf — readable Thai feature map */
import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pdfPath = join(root, "docs/anthem-feature-map.pdf");
const fonts = {
  regular: join(root, "docs/fonts/Sarabun-Regular.ttf"),
  bold: join(root, "docs/fonts/Sarabun-Bold.ttf"),
  semi: join(root, "docs/fonts/Sarabun-SemiBold.ttf"),
};

const COLORS = {
  primary: "#e85d24",
  text: "#1a1a1a",
  muted: "#5c5c5c",
  border: "#e8e8e8",
  bgSoft: "#faf8f6",
  accent: "#fff4ee",
  ok: "#15803d",
  pending: "#b45309",
  coverDark: "#1a1a1a",
};

const MARGIN = 48;
const PAGE_W = 595.28; // A4
const CONTENT_W = PAGE_W - MARGIN * 2;

function createDoc() {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title: "Anthem — สรุปฟีเจอร์ทั้งเว็บ",
      Author: "Anthem",
      Subject: "Feature Map",
    },
  });
  doc.registerFont("regular", fonts.regular);
  doc.registerFont("bold", fonts.bold);
  doc.registerFont("semi", fonts.semi);
  return doc;
}

function ensureSpace(doc, needed = 60) {
  if (doc.y + needed > doc.page.height - MARGIN) {
    doc.addPage();
  }
}

function sectionTitle(doc, num, title) {
  ensureSpace(doc, 50);
  const y = doc.y;
  doc
    .roundedRect(MARGIN, y, 22, 22, 4)
    .fill(COLORS.accent);
  doc
    .fillColor(COLORS.primary)
    .font("bold")
    .fontSize(11)
    .text(String(num), MARGIN, y + 5, { width: 22, align: "center" });
  doc
    .fillColor(COLORS.primary)
    .font("bold")
    .fontSize(14)
    .text(title, MARGIN + 30, y + 2, { width: CONTENT_W - 30 });
  doc
    .moveTo(MARGIN, y + 28)
    .lineTo(MARGIN + CONTENT_W, y + 28)
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .stroke();
  doc.y = y + 36;
  doc.fillColor(COLORS.text);
}

function card(doc, title, items, x, width) {
  const pad = 10;
  const startY = doc.y;
  doc.font("semi").fontSize(10).fillColor(COLORS.text);
  const titleH = doc.heightOfString(title, { width: width - pad * 2 });
  doc.font("regular").fontSize(9.5);
  let itemsH = 0;
  for (const item of items) itemsH += doc.heightOfString(item, { width: width - pad * 2 }) + 4;
  const cardH = pad + titleH + 6 + itemsH + pad;

  doc
    .roundedRect(x, startY, width, cardH, 8)
    .fillAndStroke(COLORS.bgSoft, COLORS.border);

  let cy = startY + pad;
  doc.font("semi").fontSize(10).fillColor(COLORS.text).text(title, x + pad, cy, { width: width - pad * 2 });
  cy += titleH + 6;
  doc.font("regular").fontSize(9.5);
  for (const item of items) {
    doc.fillColor(COLORS.text).text(`• ${item}`, x + pad, cy, { width: width - pad * 2 });
    cy += doc.heightOfString(`• ${item}`, { width: width - pad * 2 }) + 4;
  }
  return startY + cardH + 8;
}

function twoCards(doc, left, right) {
  ensureSpace(doc, 120);
  const gap = 10;
  const w = (CONTENT_W - gap) / 2;
  const y0 = doc.y;
  const y1 = card(doc, left.title, left.items, MARGIN, w);
  doc.y = y0;
  const y2 = card(doc, right.title, right.items, MARGIN + w + gap, w);
  doc.y = Math.max(y1, y2);
}

function bulletList(doc, items) {
  ensureSpace(doc, 30);
  doc.font("regular").fontSize(9.5).fillColor(COLORS.text);
  for (const item of items) {
    ensureSpace(doc, 20);
    doc.text(`• ${item}`, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.15);
  }
  doc.moveDown(0.3);
}

function table(doc, headers, rows, colWidths) {
  const rowPad = 7;
  doc.font("semi").fontSize(9);
  let headerH = rowPad * 2;
  for (let i = 0; i < headers.length; i++) {
    headerH = Math.max(headerH, rowPad * 2 + doc.heightOfString(headers[i], { width: colWidths[i] - 12 }));
  }
  let totalH = headerH;
  doc.font("regular");
  const rowHeights = rows.map((row) => {
    let h = rowPad * 2;
    for (let i = 0; i < row.length; i++) {
      h = Math.max(h, rowPad * 2 + doc.heightOfString(row[i], { width: colWidths[i] - 12 }));
    }
    totalH += h;
    return h;
  });
  ensureSpace(doc, totalH + 10);

  const startY = doc.y;
  let x = MARGIN;
  let y = startY;

  // header
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, y, colWidths[i], headerH).fillAndStroke(COLORS.accent, COLORS.border);
    doc.font("semi").fontSize(9).fillColor(COLORS.text).text(headers[i], x + 6, y + rowPad, { width: colWidths[i] - 12 });
    x += colWidths[i];
  }
  y += headerH;

  doc.font("regular").fontSize(9);
  rows.forEach((row, ri) => {
    x = MARGIN;
    const rh = rowHeights[ri];
    for (let i = 0; i < row.length; i++) {
      doc.rect(x, y, colWidths[i], rh).stroke(COLORS.border);
      let color = COLORS.text;
      if (row[i] === "ใช้งานได้") color = COLORS.ok;
      if (row[i].includes("ยังไม่ทำ") || row[i].includes("แผนอนาคต")) color = COLORS.pending;
      doc.fillColor(color).font(row[i] === "ใช้งานได้" || row[i].includes("ยังไม่ทำ") ? "semi" : "regular");
      doc.text(row[i], x + 6, y + rowPad, { width: colWidths[i] - 12 });
      x += colWidths[i];
    }
    y += rh;
  });
  doc.y = y + 12;
  doc.fillColor(COLORS.text).font("regular");
}

function mindMap(doc) {
  ensureSpace(doc, 200);
  const startY = doc.y;
  const boxH = 170;
  doc.roundedRect(MARGIN, startY, CONTENT_W, boxH, 8).stroke(COLORS.border);

  const centerW = 120;
  const cx = MARGIN + CONTENT_W / 2 - centerW / 2;
  doc.roundedRect(cx, startY + 12, centerW, 28, 14).fill(COLORS.primary);
  doc.font("bold").fontSize(12).fillColor("#fff").text("Anthem", cx, startY + 19, { width: centerW, align: "center" });

  const branches = [
    ["Feed", "ฟีด · ค้นหา · Designers · Studios"],
    ["Portfolio", "ลงงาน · พรีวิว · ลิขสิทธิ์ · Explore"],
    ["Social", "ไลค์ · คอมเมนต์ · คอลเลกชัน · รายงาน"],
    ["จ้างงาน", "Hire · Collab · คำขอ"],
    ["งาน/สตูดิโอ", "Jobs · สมัคร · สตูดิโอ"],
    ["สื่อสาร", "แชต · แจ้งเตือน"],
    ["การเงิน", "PX · ของขวัญ · โฆษณา · KYC"],
    ["กฎหมาย", "สัญญา AI · PDPA · ลิขสิทธิ์"],
    ["Admin", "Dashboard · Moderation · Wallet"],
  ];

  const cols = 3;
  const gap = 8;
  const bw = (CONTENT_W - 24 - gap * (cols - 1)) / cols;
  const bh = 36;
  let row = 0;
  let col = 0;
  const baseY = startY + 52;

  for (const [label, desc] of branches) {
    const bx = MARGIN + 12 + col * (bw + gap);
    const by = baseY + row * (bh + gap);
    doc.roundedRect(bx, by, bw, bh, 6).fillAndStroke(COLORS.bgSoft, COLORS.border);
    doc.font("semi").fontSize(8.5).fillColor(COLORS.primary).text(label, bx + 6, by + 5, { width: bw - 12 });
    doc.font("regular").fontSize(7.5).fillColor(COLORS.text).text(desc, bx + 6, by + 17, { width: bw - 12 });
    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  }
  doc.y = startY + boxH + 12;
}

function cover(doc) {
  const h = 130;
  doc
    .roundedRect(MARGIN, doc.y, CONTENT_W, h, 12)
    .fill("#2d2419");

  const y0 = doc.y;
  doc.roundedRect(MARGIN + 14, y0 + 16, 36, 36, 8).fill(COLORS.primary);
  doc.font("bold").fontSize(9).fillColor("#fff").text("a1h", MARGIN + 14, y0 + 27, { width: 36, align: "center" });

  doc.font("bold").fontSize(22).fillColor("#fff").text("Anthem (an1hem)", MARGIN + 58, y0 + 18);
  doc.font("regular").fontSize(11).fillColor("#d4c4b8").text("สรุปฟีเจอร์ทั้งเว็บ — Feature Map", MARGIN + 58, y0 + 46);

  doc.font("regular").fontSize(10).fillColor("rgba(255,255,255,0.9)").text(
    "แพลตฟอร์มพอร์ตโฟลิโอ + จับคู่งานสำหรับครีเอเตอร์ไทย รวมโชว์ผลงาน จ้างงาน สตูดิโอ กระเป๋า PX และหลังบ้านแอดมิน",
    MARGIN + 14,
    y0 + 72,
    { width: CONTENT_W - 28 }
  );

  const pills = ["React + Vite + TypeScript", "Supabase", "อัปเดต มิ.ย. 2026"];
  let px = MARGIN + 14;
  const py = y0 + h - 28;
  doc.font("regular").fontSize(8);
  for (const pill of pills) {
    const pw = doc.widthOfString(pill) + 16;
    doc.roundedRect(px, py, pw, 18, 9).fillAndStroke("rgba(255,255,255,0.12)", "rgba(255,255,255,0.18)");
    doc.fillColor("#eee").text(pill, px + 8, py + 5);
    px += pw + 8;
  }

  doc.y = y0 + h + 20;
  doc.fillColor(COLORS.text);
}

async function main() {
  const doc = createDoc();
  const out = createWriteStream(pdfPath);
  doc.pipe(out);

  cover(doc);

  sectionTitle(doc, 1, "หน้าแรก & การค้นหา");
  twoCards(doc,
    { title: "ฟีด & โหมด", items: [
      "ฟีดผลงาน /",
      "โหมด: Explore, For You, Following, Newest, Top 1, Collections",
      "มุมมอง: Projects / Designers / Studios",
      "ค้นหา + กรองหมวด (Graphic, Illustration, Web/UI ฯลฯ)",
      "Hero สถิติดีไซเนอร์ & ผลงาน",
    ]},
    { title: "นำทาง", items: [
      "ปุ่ม + ลงผลงานใหม่ (header)",
      "Bottom nav มือถือ: Home, Jobs, New, Alerts, Profile",
      "โฆษณาแทรกในฟีด (AdCard)",
      "Skeleton โหลด — ไม่กระพริบ empty",
    ]}
  );

  sectionTitle(doc, 2, "ผลงาน (Portfolio)");
  twoCards(doc,
    { title: "ดู & จัดการ", items: [
      "รายละเอียด /project/:id",
      "ลง/แก้ /portfolio/new",
      "จัดการ /portfolio/manage",
      "พอร์ตตัวเอง /portfolio",
      "Explore เครื่องมือ/แท็ก /explore/...",
      "ภาพคล้าย AI /similar/:id",
    ]},
    { title: "ตอนลงผลงาน", items: [
      "ภาพปก + แกลเลอรี (สูงสุด 20, WebP)",
      "Draft / Published / Private",
      "เปิด-ปิดปุ่มจ้าง & Collab",
      "พรีวิวตา — ดูเหมือนหน้าจริง",
      "ลิขสิทธิ์ 6 preset + ยืนยันสิทธิ์",
      "ToolPicker & TagPicker (แนะนำที่ใช้บ่อย)",
      "เครดิตสตูดิโอ / ทีม",
    ]}
  );

  sectionTitle(doc, 3, "โปรไฟล์ & ชุมชน");
  bulletList(doc, [
    "โปรไฟล์สาธารณะ /u/:userId — ติดตาม, ผลงานล่าสุด",
    "ไลค์ผลงาน / ไลค์รายภาพ · คอมเมนต์ · แชร์ลิงก์",
    "คอลเลกชัน /collections · Inspire boards /inspire/:id",
    "รายงานเนื้อหา (ละเมิดลิขสิทธิ์ ฯลฯ) · นับยอดวิว (ต้อง consent)",
    "บล็อกลิขสิทธิ์บนหน้า detail (หุบได้) — ไม่แสดงบนการ์ดฟีด",
  ]);

  sectionTitle(doc, 4, "จ้างงาน & ร่วมงาน");
  bulletList(doc, [
    "ปุ่ม สนใจจ้างงาน → HireDialog",
    "ปุ่ม อยากร่วมงานด้วย → CollabDialog",
    "คำขอจ้าง / Collab ใน Portfolio Manage",
    "แสดงงบประมาณงานบนหน้า project",
  ]);

  sectionTitle(doc, 5, "งาน & สตูดิโอ");
  twoCards(doc,
    { title: "บอร์ดงาน", items: [
      "ประกาศงาน /jobs",
      "รายละเอียด + สมัคร /jobs/:id",
      "แจ้งเตือนงานตรงสกิล (Settings)",
    ]},
    { title: "สตูดิโอ", items: [
      "โปรไฟล์ /s/:slug",
      "สร้าง /studio/new",
      "จัดการ /studio/manage",
      "คำเชิญร่วมก่อตั้ง /studio/invites",
    ]}
  );

  sectionTitle(doc, 6, "แชต & แจ้งเตือน");
  bulletList(doc, [
    "รายการแชต /chat · แชตสด /chat/:id",
    "การแจ้งเตือน /notifications",
  ]);

  sectionTitle(doc, 7, "การเงิน & โฆษณา (PX)");
  bulletList(doc, [
    "กระเป๋า PX (WalletBadge) · ส่งของขวัญบนผลงาน",
    "รายได้ /earnings — earned / top-up / cashout",
    "โฆษณา /advertise · รายละเอียดแคมเปญ /ads/:id",
    "ยืนยันตัวตน KYC /verify",
  ]);

  sectionTitle(doc, 8, "สัญญา & กฎหมาย");
  twoCards(doc,
    { title: "สัญญา AI", items: [
      "ร่างสัญญา /contracts/new",
      "Freelance / พนักงานประจำ",
      "ดึงลิขสิทธิ์จากผลงาน → ip_owner",
      "รายการร่าง /contracts",
    ]},
    { title: "กฎหมาย & PDPA", items: [
      "Privacy · Terms · Cookies · สิทธิข้อมูล",
      "ลิขสิทธิ์ /legal/ip",
      "Cookie consent · ฟีดแบ็ก (FAB)",
      "รายงาน/ฟีดแบ็กของฉัน",
    ]}
  );

  sectionTitle(doc, 9, "บัญชี & ตั้งค่า");
  bulletList(doc, [
    "สมัคร / Login /auth · OAuth callback",
    "ตั้งค่า /settings — โปรไฟล์, สกิล, ประสบการณ์, ติดต่อ",
    "การแจ้งเตือน · หมวดงานที่สนใจ · ธีมสว่าง/มืด",
    "PDPA · ลบบัญชี · ลิงก์แอดมิน (role admin)",
  ]);

  sectionTitle(doc, 10, "หลังบ้านแอดมิน /admin");
  table(doc, ["หมวด", "หน้าที่มี"], [
    ["ภาพรวม", "Dashboard, Activity, Analytics"],
    ["ผู้ใช้", "Users, Studios"],
    ["คอนเทนต์", "Projects, Collections, Comments, Inspire"],
    ["ตลาดงาน", "Jobs, Applications, Hiring, Collabs, Contracts"],
    ["การเงิน", "Wallet & Ledger, Gifts, Ads"],
    ["สื่อสาร", "Chats, Notifications"],
    ["ความปลอดภัย", "AML, KYC, Reports, Feedback"],
    ["ระบบ", "Storage, Audit log, System health"],
  ], [120, CONTENT_W - 120]);
  doc.font("regular").fontSize(9).fillColor(COLORS.muted).text(
    "Badge แจ้งเตือน sidebar · Admin alert banner · platform_events",
    MARGIN,
    doc.y
  );
  doc.moveDown(0.8);

  sectionTitle(doc, 11, "Mind Map (ภาพรวม)");
  mindMap(doc);

  sectionTitle(doc, 12, "สถานะ & สิ่งที่ยังไม่ทำ");
  table(doc, ["หมวด", "สถานะ"], [
    ["ฟีด, ผลงาน, ลิขสิทธิ์, Explore", "ใช้งานได้"],
    ["จ้าง/Collab, งาน, สตูดิโอ, แชต", "ใช้งานได้"],
    ["PX / ของขวัญ / โฆษณา", "ใช้งานได้ (cashout จำลอง)"],
    ["แอดมิน", "ครบใน repo — บาง migration ต้อง push"],
    ["Stripe cashout จริง", "ยังไม่ทำ"],
    ["Email/Slack webhook นอกแอป", "ยังไม่ทำ"],
    ["Watermark / ใบอนุญาต PDF", "แผนอนาคต"],
  ], [CONTENT_W * 0.62, CONTENT_W * 0.38]);

  ensureSpace(doc, 40);
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_W, doc.y)
    .strokeColor(COLORS.border)
    .stroke();
  doc.moveDown(0.5);
  doc.font("regular").fontSize(8).fillColor(COLORS.muted).text(
    "Anthem Feature Map · สร้างอัตโนมัติจาก codebase · docs/anthem-feature-map.pdf",
    { align: "center", width: CONTENT_W }
  );
  doc.text("Demo: phatsawut@demo.an1hem.app · Admin: passawut.a.plus@gmail.com", { align: "center", width: CONTENT_W });

  doc.end();
  await new Promise((res, rej) => {
    out.on("finish", res);
    out.on("error", rej);
  });
  console.log("✓ PDF:", pdfPath);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
