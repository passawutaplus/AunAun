#!/usr/bin/env npx tsx
/** Generate UX checklist PDF from src/data/uxResearchGuide.ts (sync with /research) */
import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  ADMIN_APPENDIX,
  DESIGN_CHECKLIST,
  FEATURE_SECTIONS,
  FEEDBACK_TEMPLATE,
  MODERATED_TASKS,
  NEW_USER_JOURNEY,
  OUT_OF_SCOPE,
  PAGE_MAP,
  RESEARCH_INTRO,
  RESEARCH_PERSONAS,
} from "../src/data/uxResearchGuide.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PDF_NAME = "aplus1-ux-usability-checklist.pdf";
const OUTPUT_PATHS = [
  join(root, "docs", PDF_NAME),
  join(root, "public", PDF_NAME),
];

const fonts = {
  regular: join(root, "docs/fonts/Sarabun-Regular.ttf"),
  bold: join(root, "docs/fonts/Sarabun-Bold.ttf"),
  semi: join(root, "docs/fonts/Sarabun-SemiBold.ttf"),
};

const COLORS = {
  primary: "#e85d24",
  text: "#1a1a1a",
  muted: "#5c5c5c",
  border: "#c8c8c8",
  bgSoft: "#faf8f6",
  accent: "#fff4ee",
  coverDark: "#2d2419",
};

const MARGIN = 42;
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOX = 10;
const GAP = 6;
const GENERATED = "29 มิ.ย. 2026";

function createDoc() {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title: "Aplus1 — UX/UI Usability Test Checklist",
      Author: "Pixel100",
      Subject: "Usability Test",
    },
  });
  doc.registerFont("regular", fonts.regular);
  doc.registerFont("bold", fonts.bold);
  doc.registerFont("semi", fonts.semi);
  return doc;
}

function ensureSpace(doc: InstanceType<typeof PDFDocument>, needed = 36) {
  if (doc.y + needed > doc.page.height - MARGIN) doc.addPage();
}

function sectionTitle(doc: InstanceType<typeof PDFDocument>, label: string, title: string) {
  ensureSpace(doc, 40);
  const y = doc.y;
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 5).fill(COLORS.accent);
  doc.font("bold").fontSize(10.5).fillColor(COLORS.primary).text(`${label}  ${title}`, MARGIN + 8, y + 5);
  doc.y = y + 28;
  doc.fillColor(COLORS.text);
}

function note(doc: InstanceType<typeof PDFDocument>, text: string, size = 8.5) {
  ensureSpace(doc, 20);
  doc.font("regular").fontSize(size).fillColor(COLORS.muted).text(text, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.25);
  doc.fillColor(COLORS.text);
}

function labelLine(doc: InstanceType<typeof PDFDocument>, label: string, value: string) {
  ensureSpace(doc, 16);
  doc.font("semi").fontSize(8.5).fillColor(COLORS.primary).text(`${label}: `, MARGIN, doc.y, { continued: true });
  doc.font("regular").fillColor(COLORS.text).text(value, { width: CONTENT_W });
  doc.moveDown(0.1);
}

function checkbox(doc: InstanceType<typeof PDFDocument>, text: string, opts: { indent?: number; fontSize?: number } = {}) {
  const { indent = 0, fontSize = 9 } = opts;
  const x = MARGIN + indent;
  doc.font("regular").fontSize(fontSize);
  const textW = CONTENT_W - indent - BOX - GAP;
  const textH = doc.heightOfString(text, { width: textW });
  const rowH = Math.max(BOX + 2, textH + 2);
  ensureSpace(doc, rowH + 3);
  const y = doc.y;
  doc.rect(x, y + 1, BOX, BOX).strokeColor(COLORS.border).lineWidth(0.7).stroke();
  doc.fillColor(COLORS.text).text(text, x + BOX + GAP, y, { width: textW });
  doc.y = y + rowH + 2;
}

function bulletLines(doc: InstanceType<typeof PDFDocument>, items: string[], prefix = "•") {
  doc.font("regular").fontSize(8.5).fillColor(COLORS.muted);
  for (const item of items) {
    ensureSpace(doc, 14);
    doc.text(`${prefix} ${item}`, MARGIN + 4, doc.y, { width: CONTENT_W - 4 });
    doc.moveDown(0.05);
  }
  doc.moveDown(0.15);
  doc.fillColor(COLORS.text);
}

function cover(doc: InstanceType<typeof PDFDocument>) {
  const h = 152;
  const y0 = doc.y;
  doc.roundedRect(MARGIN, y0, CONTENT_W, h, 12).fill(COLORS.coverDark);
  doc.roundedRect(MARGIN + 14, y0 + 18, 38, 38, 8).fill(COLORS.primary);
  doc.font("bold").fontSize(10).fillColor("#fff").text("1PX", MARGIN + 14, y0 + 30, { width: 38, align: "center" });
  doc.font("bold").fontSize(20).fillColor("#fff").text("Aplus1 (Pixel100)", MARGIN + 62, y0 + 18);
  doc.font("regular").fontSize(10.5).fillColor("#d4c4b8").text("UX/UI Usability Test Checklist", MARGIN + 62, y0 + 44);
  doc.font("regular").fontSize(9).fillColor("rgba(255,255,255,0.92)").text(
    "เช็คลิสทดสอบการใช้งานครบ — Journey · Design · Tasks T1–T8 · Features A–T",
    MARGIN + 14, y0 + 72, { width: CONTENT_W - 28 },
  );
  doc.font("regular").fontSize(8).fillColor("#bbb").text(
    `Demo ${RESEARCH_INTRO.demoUrl} · ในแอป ${RESEARCH_INTRO.inAppPath} · อัปเดต ${GENERATED}`,
    MARGIN + 14, y0 + h - 22, { width: CONTENT_W - 28 },
  );
  doc.y = y0 + h + 16;
  doc.fillColor(COLORS.text);
}

function writePdf(doc: InstanceType<typeof PDFDocument>) {
  cover(doc);

  sectionTitle(doc, "01", "ข้อมูลการทดสอบ");
  labelLine(doc, "URL Demo", RESEARCH_INTRO.demoUrl);
  labelLine(doc, "Production", "https://aplus1.app");
  labelLine(doc, "ระยะเวลา", `Quick ${RESEARCH_INTRO.quickMinutes} นาที (T1–T4) · Full ${RESEARCH_INTRO.fullHours} ชม. (A–T)`);
  labelLine(doc, "อุปกรณ์", RESEARCH_INTRO.devices.join(" · "));
  labelLine(doc, "Viewport", RESEARCH_INTRO.viewports.join(" · "));
  note(doc, "Reviewer: _______________________   วันที่: ____________   Facilitator: _______________________");

  sectionTitle(doc, "02", "วิธีใช้เช็คลิส");
  [
    "อ่านข้อควรระวัง demo (หน้า 2)",
    "เลือก Persona ตามบทบาท",
    "ทำ Moderated tasks T1–T8 (ถ้ามี facilitator)",
    "ไล่ Feature checklist A–T — tick ☐ เมื่อทดสอบแล้ว",
    "ประเมิน Design foundation ข้ามฟีเจอร์",
    "บันทึก feedback ตาม template ท้ายเอกสาร",
  ].forEach((s) => checkbox(doc, s, { fontSize: 8.5 }));

  sectionTitle(doc, "03", "ข้อควรระวัง (โหมด demo)");
  [
    "บัญชี *@demo.pixel100.com บันทึกถาวร — ใช้ร่วมกัน อย่าสมัครใหม่",
    "อย่าใส่ข้อมูลส่วนตัวจริง · ไม่มีการชำระเงินจริง",
    "รหัสผ่าน demo: pixel100-demo-seed — หมุนใหม่หลังจบรอบรีวิว",
    "บัญชีเพิ่มเติม 50 ครีเอเตอร์ — ดู demo-catalog.md",
  ].forEach((s) => checkbox(doc, s, { fontSize: 8.5 }));

  sectionTitle(doc, "04", "Persona & บัญชีทดสอบ");
  for (const p of RESEARCH_PERSONAS) {
    ensureSpace(doc, 28);
    doc.font("semi").fontSize(9).fillColor(COLORS.text).text(p.label, MARGIN);
    doc.font("regular").fontSize(8.5).fillColor(COLORS.muted).text(`${p.email} — ${p.note}`, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.2);
  }

  sectionTitle(doc, "05", "New user journey");
  note(doc, "ตอบโจทย์: คนใหม่รู้ว่าต้องทำอะไรต่อไหม?");
  for (const j of NEW_USER_JOURNEY) {
    checkbox(doc, `${j.step}. ${j.title} (${j.where}) — ${j.criteria}`, { fontSize: 8.5 });
  }

  sectionTitle(doc, "06", "Design & UI foundation");
  note(doc, "เช็คลิสข้ามฟีเจอร์ — เน้น visual/UX");
  for (const item of DESIGN_CHECKLIST) checkbox(doc, item.text, { fontSize: 8.5 });

  doc.addPage();
  sectionTitle(doc, "07", "Moderated tasks (T1–T8)");
  for (const t of MODERATED_TASKS) {
    ensureSpace(doc, 70);
    doc.font("semi").fontSize(9.5).fillColor(COLORS.primary).text(`${t.id} — ${t.title} · ${t.persona}`, MARGIN);
    doc.moveDown(0.1);
    bulletLines(doc, t.steps, "→");
    labelLine(doc, "สำเร็จเมื่อ", t.success);
    if (t.interviewQuestions.length) {
      note(doc, "ถาม:");
      bulletLines(doc, t.interviewQuestions, "?");
    }
    checkbox(doc, "ทดสอบแล้ว — ผ่าน");
    checkbox(doc, "ทดสอบแล้ว — มีปัญหา (บันทึก feedback ท้ายเอกสาร)");
    doc.moveDown(0.15);
  }

  doc.addPage();
  sectionTitle(doc, "08", "Feature checklist (A–T)");
  note(doc, "Tick ☐ เมื่อทดสอบแล้ว — บันทึกปัญหาที่หน้า Feedback");

  for (const f of FEATURE_SECTIONS) {
    ensureSpace(doc, 80);
    doc.font("semi").fontSize(10).fillColor(COLORS.primary).text(`${f.id} — ${f.title}`, MARGIN);
    labelLine(doc, "Paths", f.paths);
    labelLine(doc, "บัญชี", f.account);
    note(doc, "ขั้นตอนทดสอบ:");
    bulletLines(doc, f.steps, "→");
    note(doc, "เกณฑ์ UX:");
    bulletLines(doc, f.uxCriteria, "•");
    labelLine(doc, "สำเร็จเมื่อ", f.success);
    for (const item of f.items) checkbox(doc, item.text, { fontSize: 8.5 });
    doc.moveDown(0.2);
  }

  doc.addPage();
  sectionTitle(doc, "09", "แผนที่หน้า");
  for (const group of PAGE_MAP) {
    ensureSpace(doc, 24);
    doc.font("semi").fontSize(9).fillColor(COLORS.primary).text(group.group, MARGIN);
    doc.moveDown(0.1);
    for (const p of group.pages) {
      checkbox(doc, `${p.path} — ${p.label}${p.auth ? " (login)" : ""}`, { fontSize: 8, indent: 4 });
    }
    doc.moveDown(0.15);
  }

  sectionTitle(doc, "10", "Feedback template");
  note(doc, "บันทึกแต่ละประเด็น — ส่งกลับทีม (Figma / Notion / Google Form)");
  note(doc, `ฟิลด์: ${FEEDBACK_TEMPLATE.fields.join(" · ")}`);
  note(doc, "คำถามเปิด:");
  for (const q of FEEDBACK_TEMPLATE.prompts) checkbox(doc, q, { fontSize: 8.5 });

  for (let n = 0; n < 3; n++) {
    ensureSpace(doc, 95);
    doc.font("semi").fontSize(9).fillColor(COLORS.primary).text(`Issue ${n + 1}`, MARGIN);
    doc.moveDown(0.1);
    const rows = [
      "Persona: _______________________________________________",
      "Task / Section: _________________________________________",
      "Severity: ☐ blocker  ☐ major  ☐ minor  ☐ suggestion",
      "หน้า + viewport: ________________________________________",
      "Screenshot: ____________________________________________",
    ];
    for (const r of rows) {
      doc.font("regular").fontSize(8.5).fillColor(COLORS.text).text(r, MARGIN);
      doc.moveDown(0.15);
    }
    const y = doc.y + 2;
    doc.rect(MARGIN, y, CONTENT_W, 44).stroke(COLORS.border);
    doc.font("regular").fontSize(8).fillColor(COLORS.muted).text("ปัญหา / ข้อเสนอ", MARGIN + 4, y + 4);
    doc.y = y + 50;
    doc.moveDown(0.2);
  }

  sectionTitle(doc, "11", "Out of scope");
  for (const item of OUT_OF_SCOPE) checkbox(doc, item, { fontSize: 8.5 });

  sectionTitle(doc, "12", "ภาคผนวก — Admin (Optional / staff only)");
  note(doc, ADMIN_APPENDIX.note);
  for (const item of ADMIN_APPENDIX.items) checkbox(doc, item, { fontSize: 8.5 });

  ensureSpace(doc, 28);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(0.35);
  doc.font("regular").fontSize(7.5).fillColor(COLORS.muted).text(
    `Aplus1 UX/UI Checklist · sync กับ src/data/uxResearchGuide.ts · อัปเดต ${GENERATED}`,
    { align: "center", width: CONTENT_W },
  );
  doc.text(`โหลด: ${RESEARCH_INTRO.demoUrl}/${PDF_NAME}`, { align: "center", width: CONTENT_W });
  doc.text("Regenerate: cd Anthem-Code && npm run docs:ux-checklist-pdf", { align: "center", width: CONTENT_W });
}

async function main() {
  for (const pdfPath of OUTPUT_PATHS) {
    const doc = createDoc();
    const out = createWriteStream(pdfPath);
    doc.pipe(out);
    writePdf(doc);
    doc.end();
    await new Promise<void>((res, rej) => {
      out.on("finish", () => res());
      out.on("error", rej);
    });
    console.log("✓ PDF:", pdfPath);
  }
}

main().catch((e: Error) => {
  console.error(e.message || e);
  process.exit(1);
});
