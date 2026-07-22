import {
  COLLAB_PIPELINE,
  getAlignOverview,
  normalizeStepProgressEntries,
  type CollabAlignPayload,
  type CollabPlanPayload,
  type CollabProgressEntry,
  type CollabStepNotePayload,
} from "@/lib/collabPlanDoc";
import { storageMediaPublicUrl } from "@/lib/storageMediaUrl";

export type CollabPlanPdfMeta = {
  generatedAt?: Date;
  memberNames?: string[];
  conversationId?: string;
  version?: number;
  /** Preview draft — show banner, skip auto-print */
  preview?: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtDateTime(d: Date): string {
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function docRef(meta: CollabPlanPdfMeta): string {
  const ver = meta.version != null ? String(meta.version).padStart(3, "0") : "001";
  const id = meta.conversationId?.slice(0, 8).toUpperCase() ?? "DRAFT";
  return `CP-${ver}-${id}`;
}

function deliverableItems(align: CollabAlignPayload): string[] {
  const items = align.deliverableItems?.length
    ? align.deliverableItems
    : align.deliverables
      ? align.deliverables.split("\n")
      : [];
  return items
    .map((t) => t.replace(/^\s*\d+[\.\)\-]\s*/, "").trim())
    .filter(Boolean);
}

function field(
  label: string,
  value: string,
  opts?: { emphasis?: boolean; mono?: boolean },
): string {
  const text = value.trim() || "—";
  const valueClass = [
    "field-value",
    opts?.emphasis ? "emphasis" : "",
    opts?.mono ? "mono" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <div class="field">
      <p class="field-label">${escapeHtml(label)}</p>
      <div class="${valueClass}">${escapeHtml(text).replace(/\n/g, "<br/>")}</div>
    </div>`;
}

function linkField(label: string, urls: string[]): string {
  if (!urls.length) return field(label, "—");
  const items = urls
    .map(
      (u) =>
        `<li><a href="${escapeHtml(u)}" class="link">${escapeHtml(u)}</a></li>`,
    )
    .join("");
  return `
    <div class="field">
      <p class="field-label">${escapeHtml(label)}</p>
      <ul class="link-list">${items}</ul>
    </div>`;
}

function deliverablesField(align: CollabAlignPayload): string {
  const items = deliverableItems(align);
  if (!items.length) return field("ชิ้นงานที่ต้องทำ", "—");

  const rows = items
    .map(
      (item, i) =>
        `<tr><td class="col-num">${i + 1}</td><td>${escapeHtml(item)}</td></tr>`,
    )
    .join("");

  return `
    <div class="field">
      <p class="field-label">ชิ้นงานที่ต้องทำ</p>
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th>รายการ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function timelineField(align: CollabAlignPayload): string {
  const note = align.timelineNote.trim();
  return `
    <div class="field">
      <p class="field-label">ไทม์ไลน์</p>
      <div class="info-grid">
        <div class="info-cell">
          <span class="info-key">วันเริ่มคอลแลป</span>
          <span class="info-val">${escapeHtml(fmtDate(align.draftAt))}</span>
        </div>
        <div class="info-cell">
          <span class="info-key">กำหนดส่ง</span>
          <span class="info-val">${escapeHtml(fmtDate(align.dueAt))}</span>
        </div>
        <div class="info-cell">
          <span class="info-key">ลงผลงาน / จัดแสดง</span>
          <span class="info-val">${escapeHtml(fmtDate(align.releaseAt))}</span>
        </div>
      </div>
      ${
        note
          ? `<div class="field-value timeline-note">${escapeHtml(note).replace(/\n/g, "<br/>")}</div>`
          : ""
      }
    </div>`;
}

function attachmentField(label: string, names: string[]): string {
  if (!names.length) return "";
  const rows = names
    .map(
      (name, i) =>
        `<tr><td class="col-num">${i + 1}</td><td>${escapeHtml(name)}</td></tr>`,
    )
    .join("");
  return `
    <div class="field">
      <p class="field-label">${escapeHtml(label)}</p>
      <table class="data-table compact">
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function section(
  title: string,
  step: number,
  body: string,
  opts?: { breakBefore?: boolean },
): string {
  const num = String(step).padStart(2, "0");
  const cls = opts?.breakBefore ? "section section-break" : "section";
  return `
    <section class="${cls}">
      <div class="section-head">
        <span class="section-num">${num}</span>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="section-body">${body}</div>
    </section>`;
}

function sectionDivider(): string {
  return `<hr class="section-divider" />`;
}

function progressEntriesHtml(step: CollabStepNotePayload, emptyLabel: string): string {
  const entries = normalizeStepProgressEntries(step);
  if (!entries.length) {
    const legacy = step.note.trim();
    if (legacy) return field("โน้ตความคืบหน้า", legacy);
    return field(emptyLabel, "—");
  }
  const cards = entries
    .map((entry, i) => progressEntryCardHtml(entry, i + 1))
    .join("");
  return `<div class="progress-list">${cards}</div>`;
}

function progressEntryCardHtml(entry: CollabProgressEntry, index: number): string {
  const meta = [entry.date ? fmtDate(entry.date) : "", entry.userName]
    .filter(Boolean)
    .join(" · ");
  const status = entry.confirmedAt
    ? ""
    : ` <span class="progress-draft">(ร่าง)</span>`;
  const images = (entry.images ?? [])
    .map((img) => {
      const url = storageMediaPublicUrl(img.path);
      return `<a class="progress-img" href="${escapeHtml(url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(url)}" alt="${escapeHtml(img.name)}" /></a>`;
    })
    .join("");
  const files = (entry.files ?? [])
    .map((f) => {
      const url = storageMediaPublicUrl(f.path);
      return `<li><a class="link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(f.name)}</a></li>`;
    })
    .join("");
  const comments = (entry.comments ?? [])
    .map((c) => {
      const parts = [
        c.text.trim()
          ? escapeHtml(c.text).replace(/\n/g, "<br/>")
          : "",
        ...(c.links ?? []).map(
          (u) => `<a class="link" href="${escapeHtml(u)}">${escapeHtml(u)}</a>`,
        ),
        ...(c.attachments ?? []).map((a) => escapeHtml(a.name)),
      ].filter(Boolean);
      const reply = c.parentId ? ` <em>(ตอบกลับ)</em>` : "";
      const likes = (c.likedBy?.length ?? 0) > 0 ? ` · ♥ ${c.likedBy!.length}` : "";
      return `<li><strong>${escapeHtml(c.userName)}</strong>${reply}${likes}: ${parts.join(" · ") || "—"}</li>`;
    })
    .join("");
  return `
    <article class="progress-card">
      <p class="progress-meta">#${String(index).padStart(2, "0")}${meta ? ` · ${escapeHtml(meta)}` : ""}${status}</p>
      <div class="progress-body">${
        entry.body.trim()
          ? escapeHtml(entry.body).replace(/\n/g, "<br/>")
          : "—"
      }</div>
      ${images ? `<div class="progress-images">${images}</div>` : ""}
      ${files ? `<ul class="link-list">${files}</ul>` : ""}
      ${
        comments
          ? `<ul class="progress-comments">${comments}</ul>`
          : ""
      }
    </article>`;
}

function pipelineStepsHtml(): string {
  return COLLAB_PIPELINE.map(
    (s) =>
      `<span class="step-chip"><span class="step-chip-n">${s.step}</span>${escapeHtml(s.title)}</span>`,
  ).join("");
}

export function buildCollabPlanPdfHtml(
  payload: CollabPlanPayload,
  meta: CollabPlanPdfMeta = {},
): string {
  const align = payload.align;
  const create = payload.create;
  const finalLinks = payload.review.finalLinks ?? [];
  const generatedAt = meta.generatedAt ?? new Date();
  const members = meta.memberNames?.filter(Boolean).join(", ") || "—";
  const version = meta.version != null ? String(meta.version) : "—";
  const reference = docRef(meta);

  const alignBody = [
    field("ไอเดีย / เป้าหมาย / บรีฟ / ใครทำอะไร", getAlignOverview(align), {
      emphasis: true,
    }),
    linkField("ลิงก์อ้างอิง", align.referenceLinks ?? []),
    align.portfolioRefs?.length
      ? field(
          "ผลงานอ้างอิงในพอร์ต",
          align.portfolioRefs.map((r) => `• ${r.title}`).join("\n"),
        )
      : "",
    timelineField(align),
    `<div class="two-col">${deliverablesField(align)}${field("สิทธิ์ / เครดิต", align.rights, { emphasis: true })}</div>`,
    attachmentField(
      "ไฟล์อ้างอิง",
      align.attachments?.map((a) => a.name) ?? [],
    ),
  ].join("");

  const createBody = [progressEntriesHtml(create, "โน้ตความคืบหน้า")].join("");

  const reviewBody = linkField("ลิงก์ผลงานสุดท้าย", finalLinks);

  return `
    <header class="doc-header">
      <div class="header-top">
        <div class="header-brand">
          <p class="doc-en">COLLABORATION PLAN</p>
          <h1 class="doc-title">สรุปรายละเอียดงานร่วม</h1>
          <p class="doc-kicker">Aplus1 · เอกสารแผนคอลแลป</p>
        </div>
        <div class="header-meta">
          <div class="meta-row">
            <span class="meta-label">เลขที่อ้างอิง</span>
            <span class="meta-value mono">${escapeHtml(reference)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">วันที่พิมพ์</span>
            <span class="meta-value">${escapeHtml(fmtDateTime(generatedAt))}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">เวอร์ชันแผน</span>
            <span class="meta-value">v${escapeHtml(version)}</span>
          </div>
        </div>
      </div>

      <div class="header-rule"></div>

      <div class="parties-grid">
        <div class="party-block">
          <p class="party-label">สมาชิกร่วมงาน / MEMBERS</p>
          <p class="party-value">${escapeHtml(members)}</p>
        </div>
        <div class="party-block">
          <p class="party-label">ขั้นตอนแผน / PIPELINE</p>
          <div class="step-chips">${pipelineStepsHtml()}</div>
        </div>
      </div>

      <p class="doc-note">
        เอกสารสรุปสุดท้าย — ไม่ใช่ใบเสนอราคาจ้างงาน · แก้ไขไม่ได้หลังยืนยันครบทุกคน
      </p>
    </header>

    ${section("จัดแนวทางร่วมกัน", 1, alignBody)}
    ${sectionDivider()}
    ${section("สร้างงาน", 2, createBody, { breakBefore: true })}
    ${sectionDivider()}
    ${section("ยืนยันสุดท้าย", 3, reviewBody, { breakBefore: true })}

    <footer class="doc-footer">
      <div class="footer-rule"></div>
      <p class="footer-main">เอกสารนี้สร้างจากแผนคอลแลปใน Aplus1 · เก็บเป็นหลักฐานงานร่วมและเครดิต</p>
      ${
        meta.conversationId
          ? `<p class="footer-ref mono">ref ${escapeHtml(meta.conversationId.slice(0, 8))}… · พิมพ์ ${escapeHtml(generatedAt.toLocaleString("th-TH"))}</p>`
          : ""
      }
    </footer>`;
}

const PDF_STYLES = `
@page { margin: 14mm 12mm; size: A4 portrait; }

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  font-family: "Sarabun", "Noto Sans Thai", system-ui, sans-serif;
  color: #1c1917;
  font-size: 10.5pt;
  line-height: 1.6;
  background: #fff;
}

body.is-preview {
  background: #44403c;
  padding: 28px 16px 36px;
}

.preview-banner {
  max-width: 210mm;
  margin: 0 auto 14px;
  padding: 10px 14px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 8px;
  font-size: 9.5pt;
  color: #9a3412;
  text-align: center;
}

.sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 14mm 13mm 16mm;
  background: #fff;
  color: #1c1917;
}

body.is-preview .sheet {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 12px 40px rgba(0, 0, 0, 0.22);
}

/* ── Header ── */
.doc-header { margin-bottom: 22px; }

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-brand { min-width: 0; flex: 1; }

.doc-en {
  margin: 0 0 4px;
  font-size: 8pt;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #a8a29e;
  font-weight: 600;
}

.doc-title {
  margin: 0;
  font-size: 21pt;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #0c0a09;
}

.doc-kicker {
  margin: 6px 0 0;
  font-size: 9.5pt;
  color: #ea580c;
  font-weight: 600;
}

.header-meta {
  flex-shrink: 0;
  min-width: 168px;
  text-align: right;
}

.meta-row {
  display: block;
  margin-bottom: 8px;
}

.meta-row:last-child { margin-bottom: 0; }

.meta-label {
  display: block;
  font-size: 7.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a8a29e;
  font-weight: 600;
  margin-bottom: 2px;
}

.meta-value {
  display: block;
  font-size: 10pt;
  font-weight: 600;
  color: #1c1917;
}

.header-rule {
  height: 2px;
  margin: 16px 0 14px;
  background: linear-gradient(90deg, #ea580c 0%, #fb923c 55%, #fed7aa 100%);
}

.parties-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
  margin-bottom: 12px;
}

.party-label {
  margin: 0 0 4px;
  font-size: 7.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a8a29e;
  font-weight: 600;
}

.party-value {
  margin: 0;
  font-size: 10.5pt;
  font-weight: 600;
  color: #1c1917;
  line-height: 1.5;
}

.step-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.step-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 4px;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  background: #fff7ed;
  font-size: 8pt;
  font-weight: 600;
  color: #9a3412;
  white-space: nowrap;
}

.step-chip-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ea580c;
  color: #fff;
  font-size: 7.5pt;
  font-weight: 700;
}

.doc-note {
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  font-size: 8.5pt;
  color: #57534e;
  line-height: 1.5;
}

/* ── Sections ── */
.section {
  margin-bottom: 20px;
}

body:not(.is-preview) .section-break {
  page-break-before: always;
  break-before: page;
}

.section-divider {
  display: none;
  border: none;
  border-top: 1.5px solid #d6d3d1;
  margin: 26px 0 22px;
}

body.is-preview .section-divider {
  display: block;
}

body.is-preview .section-break {
  page-break-before: auto;
  break-before: auto;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 7px;
  border-bottom: 1px solid #e7e5e4;
}

.section-num {
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #ea580c;
  font-variant-numeric: tabular-nums;
}

.section-head h2 {
  margin: 0;
  font-size: 12pt;
  font-weight: 700;
  color: #0c0a09;
}

.section-body { padding-top: 2px; }

.progress-list { display: flex; flex-direction: column; gap: 12px; }

.progress-card {
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  padding: 10px 12px;
  page-break-inside: avoid;
}

.progress-meta {
  margin: 0 0 6px;
  font-size: 8.5pt;
  font-weight: 700;
  color: #ea580c;
}

.progress-body {
  font-size: 10pt;
  line-height: 1.55;
  color: #1c1917;
  white-space: pre-wrap;
}

.progress-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.progress-img {
  display: block;
  width: 72px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e7e5e4;
}

.progress-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.progress-comments {
  margin: 8px 0 0;
  padding-left: 16px;
  font-size: 9pt;
  color: #57534e;
}

/* ── Fields ── */
.field { margin-bottom: 14px; page-break-inside: avoid; }

.field-label {
  margin: 0 0 5px;
  font-size: 7.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a8a29e;
  font-weight: 700;
}

.field-value {
  font-size: 10.5pt;
  color: #1c1917;
  line-height: 1.65;
  padding: 2px 0 10px;
  border-bottom: 1px solid #f5f5f4;
  white-space: pre-wrap;
  word-break: break-word;
}

.field-value.emphasis {
  padding: 10px 12px;
  border: 1px solid #fed7aa;
  border-left: 3px solid #ea580c;
  border-radius: 0 6px 6px 0;
  background: #fffbf7;
}

.field-value.timeline-note {
  margin-top: 8px;
  padding-top: 8px;
  border-bottom: none;
  font-size: 10pt;
  color: #44403c;
}

.mono {
  font-family: ui-monospace, "Cascadia Code", monospace;
  font-size: 9pt;
  letter-spacing: 0.02em;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 4px;
}

.info-cell {
  padding: 8px 10px;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  background: #fafaf9;
}

.info-key {
  display: block;
  font-size: 7.5pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #78716c;
  font-weight: 600;
  margin-bottom: 3px;
}

.info-val {
  display: block;
  font-size: 10pt;
  font-weight: 600;
  color: #1c1917;
}

/* ── Tables ── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.data-table thead th {
  padding: 7px 10px;
  text-align: left;
  font-size: 7.5pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #78716c;
  font-weight: 700;
  border-bottom: 2px solid #e7e5e4;
  background: #fafaf9;
}

.data-table tbody td {
  padding: 8px 10px;
  border-bottom: 1px solid #f5f5f4;
  vertical-align: top;
  line-height: 1.55;
}

.data-table.compact tbody td {
  padding: 6px 10px;
}

.data-table .col-num {
  width: 36px;
  text-align: center;
  color: #78716c;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.data-table tbody tr:last-child td { border-bottom: none; }

/* ── Links ── */
.link-list {
  margin: 0;
  padding: 0 0 0 18px;
  list-style: disc;
}

.link-list li {
  margin: 5px 0;
  word-break: break-all;
  line-height: 1.5;
}

.link {
  color: #c2410c;
  text-decoration: none;
}

.link:hover { text-decoration: underline; }

/* ── Footer ── */
.doc-footer {
  margin-top: 24px;
  padding-top: 0;
  text-align: center;
}

.footer-rule {
  height: 1px;
  background: #e7e5e4;
  margin-bottom: 12px;
}

.footer-main {
  margin: 0;
  font-size: 8.5pt;
  color: #78716c;
  line-height: 1.5;
}

.footer-ref {
  margin: 4px 0 0;
  font-size: 7.5pt;
  color: #a8a29e;
}

@media print {
  body.is-preview {
    background: #fff;
    padding: 0;
  }

  .preview-banner { display: none !important; }

  body.is-preview .sheet {
    box-shadow: none;
    width: auto;
    min-height: auto;
    margin: 0;
    padding: 0;
  }

  .link { color: #1c1917; }
}
`;

export function buildCollabPlanHtmlDocument(
  payload: CollabPlanPayload,
  meta: CollabPlanPdfMeta = {},
): string {
  const body = buildCollabPlanPdfHtml(payload, meta);
  const previewBanner = meta.preview
    ? `<div class="preview-banner">ตัวอย่างเอกสาร — ข้อมูลอาจยังไม่ครบ · กด Ctrl/⌘+P หรือ「บันทึกเป็น PDF」เพื่อเก็บไฟล์</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${meta.preview ? "พรีวิว" : "สรุป"}แผนคอลแลป — Aplus1</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${PDF_STYLES}</style>
</head>
<body class="${meta.preview ? "is-preview" : ""}">
  ${previewBanner}
  <div class="sheet">${body}</div>
</body>
</html>`;
}

export function createCollabPlanPreviewBlobUrl(
  payload: CollabPlanPayload,
  meta: CollabPlanPdfMeta = {},
): string {
  return createCollabPlanBlobUrl(payload, { ...meta, preview: true });
}

export function createCollabPlanBlobUrl(
  payload: CollabPlanPayload,
  meta: CollabPlanPdfMeta = {},
): string {
  const html = buildCollabPlanHtmlDocument(payload, meta);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}

export function openCollabPlanPdfWindow(
  payload: CollabPlanPayload,
  meta: CollabPlanPdfMeta = {},
  opts?: { autoPrint?: boolean },
): boolean {
  const html = buildCollabPlanHtmlDocument(payload, meta);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  win.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
  if (opts?.autoPrint !== false && !meta.preview) {
    win.addEventListener(
      "load",
      () => {
        setTimeout(() => win.print(), 350);
      },
      { once: true },
    );
  }
  return true;
}

export function previewCollabPlanPdf(
  payload: CollabPlanPayload,
  meta: CollabPlanPdfMeta = {},
): boolean {
  return openCollabPlanPdfWindow(payload, { ...meta, preview: true }, { autoPrint: false });
}

export function printCollabPlanPdf(
  payload: CollabPlanPayload,
  meta: CollabPlanPdfMeta = {},
): boolean {
  return openCollabPlanPdfWindow(payload, meta, { autoPrint: true });
}
