/**
 * SAMECOR notification email HTML — mirrors Anthem react-email templates for Deno edge.
 * Keep in sync with Anthem-Code/src/lib/email-templates/
 */

// Brand Book Ver.0.1 — Studio White canvas, Gallery Black ink, one red accent (never small red text: 3.7:1)
const brand = {
  red: "#EE3D29",
  redSoft: "#FDECE9",
  /** Emphasis inside body copy — ink, not red (contrast) */
  orange: "#111111",
  ink: "#111111",
  body: "#3D3D3D",
  mute: "#666666",
  faint: "#8C8C8C",
  border: "#E6E6E3",
  surface: "#F3F2EC",
  canvas: "#F8F7F2",
  white: "#FFFFFF",
  success: "#18794E",
} as const;

const TAGLINE = "You Create. We Connect.";
// Brand used as the sender name until the company is registered — keep in sync with Anthem-Code/src/lib/legalConfig.ts
const LEGAL_NAME = "SAMECOR";
const LEGAL_ADDRESS = "90 เพชรเกษม 63/2 แขวงหลักสอง เขตบางแค กรุงเทพมหานคร 10160";
const FACEBOOK_URL = "https://www.facebook.com/samecor2026";

// SAMECOR LINE OA (contact) — keep in sync with Anthem-Code/src/lib/brandConfig.ts
const LINE_URL = "https://lin.ee/te9XZuh";
const LINE_ID = "@567rveid";
const FOOTER_NOTE = "ปิดการแจ้งเตือนทางอีเมลได้ที่ SAMECOR → ตั้งค่า → การแจ้งเตือน";

export function anthemSiteUrl(): string {
  return (
    Deno.env.get("APLUS1_APP_URL") ??
    Deno.env.get("ANTHEM_APP_URL") ??
    "https://samecor.com"
  ).replace(/\/$/, "");
}

export function anthemEmailFrom(): { from: string; senderDomain: string } {
  const from = Deno.env.get("APLUS1_EMAIL_FROM") ?? Deno.env.get("ANTHEM_EMAIL_FROM") ?? "SAMECOR <noreply@samecor.com>";
  const senderDomain = Deno.env.get("APLUS1_EMAIL_SENDER_DOMAIN") ?? Deno.env.get("ANTHEM_EMAIL_SENDER_DOMAIN") ?? "samecor.com";
  return { from, senderDomain };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type BadgeTone = "brand" | "success";

/** Flat icon tiles in public/email/flat (brand red on soft red) — legacy names map onto them */
const ICON_ALIAS: Record<string, string> = { check: "kyc", warning: "info" };

function cardRow(label: string, value: string, highlight = false): string {
  const v = escapeHtml(value);
  return `<p style="color:${brand.mute};font-size:12px;margin:0 0 4px;font-weight:500">${escapeHtml(label)}</p>
<p style="font-size:15px;color:${highlight ? brand.ink : brand.body};font-weight:${highlight ? 600 : 400};margin:0 0 12px;line-height:1.6">${v}</p>`;
}

function layout(opts: {
  preview: string;
  badge: string;
  badgeTone: BadgeTone;
  icon: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Why this email arrived — shown in the footer */
  reason?: string;
  /** Security / account emails cannot be switched off, so they skip the opt-out line */
  optOut?: boolean;
  /** Extra block between the button and the fallback link (e.g. "didn't ask for this?") */
  afterCtaHtml?: string;
}): { html: string; text: string } {
  const siteUrl = anthemSiteUrl();
  const siteDomain = new URL(siteUrl).host;
  const icon = ICON_ALIAS[opts.icon] ?? opts.icon;
  const iconUrl = `${siteUrl}/email/flat/${icon}.png`;
  const logoUrl = `${siteUrl}/email/logo-horizontal.png`;
  const year = new Date().getFullYear();
  const reason = opts.reason ?? "คุณได้รับอีเมลนี้เพราะมีความเคลื่อนไหวในบัญชี SAMECOR ของคุณ";
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${brand.body};text-decoration:none">${label}</a>`;

  const html = `<!DOCTYPE html>
<html lang="th" dir="ltr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light"/>
<title>${escapeHtml(opts.title)} — SAMECOR</title></head>
<body style="margin:0;padding:0;background:${brand.canvas};font-family:'IBM Plex Sans Thai','IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.canvas}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%">
<tr><td style="padding:0 4px 20px"><a href="${siteUrl}" style="text-decoration:none"><img src="${logoUrl}" alt="SAMECOR" width="120" style="display:block;width:120px;height:auto;border:0"/></a></td></tr>
</table>
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:${brand.white};border:1px solid ${brand.border};border-radius:16px;overflow:hidden">
<tr><td style="height:3px;background:${brand.red};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:36px 40px 32px">
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 12px"><tr>
<td style="vertical-align:middle"><img src="${iconUrl}" alt="" width="28" height="28" style="display:block;border:0"/></td>
<td style="vertical-align:middle;padding-left:10px;font-size:13px;font-weight:600;color:${opts.badgeTone === "success" ? brand.success : brand.mute}">${escapeHtml(opts.badge)}</td>
</tr></table>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.4;font-weight:600;color:${brand.ink}">${escapeHtml(opts.title)}</h1>
${opts.bodyHtml}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px"><tr><td style="background:${brand.ink};border-radius:999px">
<a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:${brand.white};text-decoration:none">${escapeHtml(opts.ctaLabel)}</a>
</td></tr></table>
${opts.afterCtaHtml ?? ""}
<p style="margin:0 0 4px;font-size:12px;color:${brand.mute}">ปุ่มกดไม่ได้? คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์</p>
<p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all"><a href="${escapeHtml(opts.ctaUrl)}" style="color:${brand.body}">${escapeHtml(opts.ctaUrl)}</a></p>
</td></tr>
<tr><td style="padding:16px 40px;border-top:1px solid ${brand.border};background:#FBFAF7">
<p style="margin:0;font-size:12px;line-height:1.6;color:${brand.mute}"><img src="${siteUrl}/email/flat/shield-16.png" alt="" width="16" height="16" style="vertical-align:-3px;border:0"/>&nbsp; SAMECOR จะไม่ขอรหัสผ่าน รหัส OTP หรือข้อมูลบัตรของคุณทางอีเมล โทรศัพท์ หรือ LINE</p>
</td></tr>
</table>
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%">
<tr><td style="padding:28px 24px 0;text-align:center">
<p style="margin:0 0 14px;font-family:'Agrandir Wide','IBM Plex Sans',Arial,sans-serif;font-size:15px;color:${brand.ink}">${TAGLINE}</p>
<p style="margin:0 0 12px;font-size:13px;color:${brand.body}"><a href="${siteUrl}" style="color:${brand.ink};font-weight:600;text-decoration:none">${siteDomain}</a>
&nbsp;·&nbsp;${link(`${siteUrl}/help`, "ศูนย์ช่วยเหลือ")}&nbsp;·&nbsp;${link(`${siteUrl}/legal/privacy`, "ความเป็นส่วนตัว")}&nbsp;·&nbsp;${link(`${siteUrl}/legal/terms`, "ข้อกำหนด")}</p>
<p style="margin:0 0 12px;font-size:12px;color:${brand.mute}">ติดต่อเรา: <img src="${siteUrl}/email/flat/line-16.png" alt="" width="14" height="14" style="vertical-align:-2px;border:0"/> <a href="${LINE_URL}" style="color:${brand.ink};text-decoration:none;font-weight:600">LINE ${LINE_ID}</a>
&nbsp;·&nbsp;<img src="${siteUrl}/email/flat/facebook-16.png" alt="" width="14" height="14" style="vertical-align:-2px;border:0"/> <a href="${FACEBOOK_URL}" style="color:${brand.ink};text-decoration:none;font-weight:600">Facebook</a></p>
<p style="margin:0 0 6px;font-size:11px;line-height:1.6;color:${brand.faint}">${LEGAL_NAME} · ${LEGAL_ADDRESS}</p>
<p style="margin:0 0 6px;font-size:11px;line-height:1.6;color:${brand.faint}">${escapeHtml(reason)}${opts.optOut === false ? "" : ` · ${FOOTER_NOTE}`}</p>
<p style="margin:0 0 24px;font-size:11px;color:${brand.faint}">© ${year} SAMECOR</p>
</td></tr></table>
</td></tr></table></body></html>`;

  const text = `${opts.title}

${opts.preview}

${opts.ctaLabel}: ${opts.ctaUrl}

${TAGLINE}
${siteDomain} · LINE ${LINE_ID}
${LEGAL_NAME} · ${LEGAL_ADDRESS}
${FOOTER_NOTE}`;
  return { html, text };
}

export function renderHireRequestEmail(data: {
  recipientName: string;
  clientName: string;
  projectTitle: string;
  message?: string;
  budgetAmount?: string;
  deadline?: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [
    cardRow("ลูกค้า", data.clientName, true),
    cardRow("โปรเจกต์", data.projectTitle),
    ...(data.budgetAmount ? [cardRow("งบประมาณ", data.budgetAmount)] : []),
    ...(data.deadline ? [cardRow("กำหนดส่ง", data.deadline)] : []),
    ...(data.message ? [cardRow("ข้อความ", data.message)] : []),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.clientName)}</strong> ส่งคำขอจ้างผ่าน SAMECOR สำหรับ <strong style="color:${brand.ink}">${escapeHtml(data.projectTitle)}</strong></p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `${data.clientName} ส่งคำขอจ้าง — ${data.projectTitle}`,
    badge: "คำขอจ้างใหม่",
    badgeTone: "brand",
    icon: "hire",
    title: "มีคนสนใจจ้างงาน",
    bodyHtml,
    ctaLabel: "เปิดแชทและตอบกลับ",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] คำขอจ้างใหม่ — ${data.projectTitle}` };
}

export function renderChatMessageEmail(data: {
  recipientName: string;
  senderName: string;
  conversationTitle: string;
  preview: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [
    cardRow("จาก", data.senderName, true),
    cardRow("ข้อความ", data.preview || "(ไฟล์แนบ)"),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.senderName)}</strong> ส่งข้อความใน <strong style="color:${brand.ink}">${escapeHtml(data.conversationTitle)}</strong></p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `${data.senderName}: ${data.preview.slice(0, 60) || "ข้อความใหม่"}`,
    badge: "ข้อความใหม่",
    badgeTone: "brand",
    icon: "chat",
    title: "มีข้อความในแชท",
    bodyHtml,
    ctaLabel: "เปิดแชท",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] ข้อความใหม่จาก ${data.senderName}` };
}

export function renderJobMatchEmail(data: {
  recipientName: string;
  jobTitle: string;
  roleCategory?: string;
  matchScore?: number;
  matchReasons?: string[];
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [
    cardRow("ตำแหน่ง", data.jobTitle, true),
    ...(data.roleCategory ? [cardRow("หมวด", data.roleCategory)] : []),
    ...(data.matchScore ? [cardRow("ความตรง", `${data.matchScore}%`)] : []),
    ...(data.matchReasons?.length ? [cardRow("เหตุผล", data.matchReasons.join(" · "))] : []),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — พบงานที่ตรงกับโปรไฟล์ของคุณบน SAMECOR</p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `พบงานตรงสกิล — ${data.jobTitle}`,
    badge: "งานแนะนำ",
    badgeTone: "success",
    icon: "job",
    title: "มีงานตรงกับคุณ",
    bodyHtml,
    ctaLabel: "ดูรายละเอียดงาน",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] งานแนะนำ — ${data.jobTitle}` };
}

export function renderCollabRequestEmail(data: {
  recipientName: string;
  senderName: string;
  projectTitle?: string;
  collabTypes?: string;
  message?: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [
    cardRow("จาก", data.senderName, true),
    ...(data.projectTitle ? [cardRow("อ้างอิงผลงาน", data.projectTitle)] : []),
    ...(data.collabTypes ? [cardRow("ประเภท", data.collabTypes)] : []),
    ...(data.message ? [cardRow("ข้อความ", data.message)] : []),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.senderName)}</strong> ส่งคำขอร่วมงานผ่าน SAMECOR</p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `${data.senderName} อยากร่วมงาน`,
    badge: "คำขอคอลแลป",
    badgeTone: "brand",
    icon: "collab",
    title: "มีคนอยากร่วมงาน",
    bodyHtml,
    ctaLabel: "ดูคำขอคอลแลป",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] คำขอคอลแลปจาก ${data.senderName}` };
}

export function renderGiftReceivedEmail(data: {
  recipientName: string;
  senderName: string;
  giftName: string;
  pricePx: number;
  message?: string;
  projectTitle?: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [
    cardRow("จาก", data.senderName, true),
    cardRow("ของขวัญ", data.giftName),
    cardRow("มูลค่า", `${data.pricePx.toLocaleString("th-TH")} px`, true),
    ...(data.projectTitle ? [cardRow("ที่ผลงาน", data.projectTitle)] : []),
    ...(data.message ? [cardRow("ข้อความ", data.message)] : []),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.senderName)}</strong> ส่ง <strong style="color:${brand.orange}">${escapeHtml(data.giftName)}</strong> สนับสนุนคุณบน SAMECOR</p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `${data.senderName} ส่ง ${data.giftName}`,
    badge: "ของขวัญใหม่",
    badgeTone: "success",
    icon: "gift",
    title: "ได้รับของขวัญ PX",
    bodyHtml,
    ctaLabel: "ดูรายได้และของขวัญ",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] ${data.senderName} ส่งของขวัญ ${data.giftName}` };
}

export function renderFollowEmail(data: {
  recipientName: string;
  followerName: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [cardRow("ผู้ติดตาม", data.followerName, true)].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.followerName)}</strong> เริ่มติดตามโปรไฟล์ของคุณบน SAMECOR</p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `${data.followerName} เริ่มติดตามคุณ`,
    badge: "ผู้ติดตามใหม่",
    badgeTone: "brand",
    icon: "follow",
    title: "มีคนติดตามคุณ",
    bodyHtml,
    ctaLabel: "ดูโปรไฟล์ของฉัน",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] ${data.followerName} เริ่มติดตามคุณ` };
}

export function renderJobApplicationEmail(data: {
  recipientName: string;
  applicantName: string;
  jobTitle: string;
  coverPreview?: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [
    cardRow("ผู้สมัคร", data.applicantName, true),
    cardRow("ตำแหน่ง", data.jobTitle),
    ...(data.coverPreview ? [cardRow("จดหมายสั้นๆ", data.coverPreview)] : []),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.applicantName)}</strong> สมัครงาน <strong style="color:${brand.ink}">${escapeHtml(data.jobTitle)}</strong></p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `${data.applicantName} สมัคร ${data.jobTitle}`,
    badge: "ใบสมัครใหม่",
    badgeTone: "brand",
    icon: "application",
    title: "มีผู้สมัครงาน",
    bodyHtml,
    ctaLabel: "ดูใบสมัคร",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] ผู้สมัครใหม่ — ${data.jobTitle}` };
}

export function renderTopupSuccessEmail(data: {
  recipientName: string;
  amountPx: number;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [
    cardRow("จำนวนที่เติม", `${data.amountPx.toLocaleString("th-TH")} px`, true),
    cardRow("หมายเหตุ", "ยอดที่เติมอาจมีช่วงพัก 24 ชม. ก่อนใช้ส่งของขวัญ (AML)"),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — การเติม Pixel ของคุณบน SAMECOR สำเร็จแล้ว</p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: `เติม ${data.amountPx} px สำเร็จ`,
    badge: "เติม Pixel สำเร็จ",
    badgeTone: "success",
    icon: "topup",
    title: "ยอด px เข้ากระเป๋าแล้ว",
    bodyHtml,
    ctaLabel: "เปิดกระเป๋า Pixel",
    ctaUrl: data.actionUrl,
  });
  return {
    html,
    text,
    subject: `[SAMECOR] เติม Pixel สำเร็จ +${data.amountPx.toLocaleString("th-TH")} px`,
  };
}

export function renderCashoutStatusEmail(data: {
  recipientName: string;
  status: "submitted" | "paid" | "rejected";
  grossPx: number;
  netPx?: number;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const copy = {
    submitted: {
      badge: "ส่งคำขอถอนแล้ว",
      title: "รับคำขอถอนเงินแล้ว",
      tone: "brand" as BadgeTone,
      body: "เราได้รับคำขอถอนเงินของคุณแล้ว — ทีมงานจะตรวจสอบและดำเนินการต่อ",
      subject: `[SAMECOR] รับคำขอถอน ${data.grossPx.toLocaleString("th-TH")} px แล้ว`,
    },
    paid: {
      badge: "ถอนเงินสำเร็จ",
      title: "โอนเงินเข้าบัญชีแล้ว",
      tone: "success" as BadgeTone,
      body: "คำขอถอนเงินของคุณดำเนินการสำเร็จแล้ว",
      subject: `[SAMECOR] ถอนเงินสำเร็จ ฿${(data.netPx ?? 0).toLocaleString("th-TH")}`,
    },
    rejected: {
      badge: "คำขอถูกปฏิเสธ",
      title: "ไม่สามารถถอนได้",
      tone: "brand" as BadgeTone,
      body: "คำขอถอนถูกปฏิเสธ — ยอด px ถูกคืนเข้ากระเป๋า earned แล้ว",
      subject: `[SAMECOR] คำขอถอนถูกปฏิเสธ`,
    },
  }[data.status];
  const rows = [
    cardRow("ยอดที่ขอถอน", `${data.grossPx.toLocaleString("th-TH")} px`, true),
    ...(data.status === "paid" && data.netPx
      ? [cardRow("โอนสุทธิ", `฿${data.netPx.toLocaleString("th-TH")}`)]
      : []),
  ].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — ${copy.body}</p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${rows}</div>`;
  const { html, text } = layout({
    preview: copy.title,
    badge: copy.badge,
    badgeTone: copy.tone,
    icon: "cashout",
    title: copy.title,
    bodyHtml,
    ctaLabel: "ดูรายได้",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: copy.subject };
}

export function renderKycStatusEmail(data: {
  recipientName: string;
  status: "approved" | "rejected";
  reason?: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const approved = data.status === "approved";
  const copy = approved
    ? {
        badge: "ยืนยันตัวตนสำเร็จ",
        title: "คำขอยืนยันตัวตนได้รับการอนุมัติแล้ว",
        tone: "success" as BadgeTone,
        body: "คุณพร้อมเปิดรับงานจ้างและรับค่าจ้างตามเงื่อนไขแพลตฟอร์ม — การยืนยันมีผล 2 ปี",
        cta: "ดูสถานะการยืนยัน",
        subject: "[SAMECOR] ยืนยันตัวตนสำเร็จ",
      }
    : {
        badge: "คำขอไม่ผ่าน",
        title: "คำขอยืนยันตัวตนไม่ผ่าน",
        tone: "brand" as BadgeTone,
        body: "กรุณาตรวจสอบเหตุผลด้านล่าง แล้วส่งเอกสารใหม่ได้ที่หน้ายืนยันตัวตน",
        cta: "ส่งคำขอใหม่",
        subject: "[SAMECOR] คำขอยืนยันตัวตนไม่ผ่าน",
      };
  const reason = !approved && data.reason ? cardRow("เหตุผล", data.reason) : "";
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — ${copy.body}</p>
${reason ? `<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px">${reason}</div>` : ""}`;
  const { html, text } = layout({
    preview: copy.title,
    badge: copy.badge,
    badgeTone: copy.tone,
    icon: approved ? "check" : "warning",
    title: copy.title,
    bodyHtml,
    ctaLabel: copy.cta,
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: copy.subject };
}

export function renderWinbackEmail(data: {
  recipientName: string;
  daysInactive: number;
  unreadCount: number;
  releases: { title: string; tag: string }[];
  actionUrl: string;
  changelogUrl: string;
}): { html: string; text: string; subject: string } {
  const tagLabel: Record<string, string> = { new: "ใหม่", improved: "ปรับปรุง", fixed: "แก้แล้ว" };
  const releaseRows = data.releases
    .slice(0, 3)
    .map(
      (r) =>
        `<p style="font-size:14px;color:${brand.body};margin:0 0 8px;line-height:1.5"><span style="color:${brand.orange};font-weight:600">${escapeHtml(tagLabel[r.tag] ?? "ใหม่")}</span> · ${escapeHtml(r.title)}</p>`,
    )
    .join("");
  const unread =
    data.unreadCount > 0
      ? `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">มี <strong style="color:${brand.ink}">${data.unreadCount} การแจ้งเตือน</strong> รอคุณอยู่</p>`
      : "";
  const releasesBlock = releaseRows
    ? `<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px"><p style="color:${brand.mute};font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;font-weight:600">มีอะไรใหม่ช่วงที่คุณไม่อยู่</p>${releaseRows}<p style="font-size:13px;margin:8px 0 0"><a href="${escapeHtml(data.changelogUrl)}" style="color:${brand.orange}">ดูอัปเดตทั้งหมด</a></p></div>`
    : "";
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — ไม่ได้เจอกัน ${data.daysInactive} วันแล้ว ผลงานของคุณยังรอให้คนเจออยู่บน SAMECOR</p>
${unread}${releasesBlock}`;
  const { html, text } = layout({
    preview: "มีอะไรใหม่บน SAMECOR ช่วงที่คุณไม่อยู่",
    badge: "คิดถึงนะ",
    badgeTone: "brand",
    icon: "bell",
    title: "กลับมาดูกันหน่อยไหม",
    bodyHtml,
    ctaLabel: "เปิด SAMECOR",
    ctaUrl: data.actionUrl,
  });
  return { html, text, subject: `[SAMECOR] ${data.recipientName} มีอะไรใหม่รอคุณอยู่` };
}

/**
 * Supabase Auth email templates (Dashboard → Authentication → Emails → Templates), built from the same layout.
 * Links go to samecor.com via {{ .RedirectTo }} + token_hash (the app verifies it), never to supabase.co.
 * Regenerate with the script in Solo-Code/supabase/email-templates/README.md.
 */
export function renderAuthEmailTemplate(kind: "recovery" | "confirmation" | "magic_link"): {
  subject: string;
  html: string;
} {
  const copy = {
    recovery: {
      subject: "ตั้งรหัสผ่านใหม่สำหรับบัญชี SAMECOR",
      badge: "ความปลอดภัยบัญชี", icon: "key", title: "ตั้งรหัสผ่านใหม่",
      preview: "ลิงก์สำหรับตั้งรหัสผ่านใหม่ ใช้ได้ภายใน 1 ชั่วโมง",
      lead: "เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี SAMECOR ที่ใช้อีเมล",
      tail: "กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่",
      cta: "ตั้งรหัสผ่านใหม่", type: "recovery",
      noteTitle: "ไม่ได้เป็นคนขอใช่ไหม?",
      note: "ไม่ต้องทำอะไร รหัสผ่านเดิมของคุณยังใช้ได้ตามปกติ ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุภายใน 1 ชั่วโมง",
      reason: "อีเมลนี้ส่งถึง {{ .Email }} เพราะมีคำขอตั้งรหัสผ่านใหม่บน SAMECOR",
    },
    confirmation: {
      subject: "ยืนยันอีเมลเพื่อเริ่มใช้ SAMECOR",
      badge: "ยินดีต้อนรับ", icon: "welcome", title: "ยืนยันอีเมลของคุณ",
      preview: "อีกขั้นเดียว แล้วเริ่มลงผลงานบน SAMECOR ได้เลย",
      lead: "ยินดีต้อนรับสู่ SAMECOR พื้นที่ให้ผลงานของคุณถูกค้นพบ กดยืนยันอีเมล",
      tail: "แล้วเริ่มลงผลงานและเชื่อมต่อกับครีเอเตอร์ได้เลย",
      cta: "ยืนยันอีเมล", type: "email",
      noteTitle: "ไม่ได้สมัคร SAMECOR ใช่ไหม?",
      note: "ไม่ต้องทำอะไร ถ้าไม่กดยืนยัน บัญชีนี้จะไม่ถูกเปิดใช้ ลิงก์ใช้ได้ครั้งเดียวและหมดอายุภายใน 1 ชั่วโมง",
      reason: "อีเมลนี้ส่งถึง {{ .Email }} เพราะมีการสมัครบัญชี SAMECOR ด้วยอีเมลนี้",
    },
    magic_link: {
      subject: "ลิงก์เข้าสู่ระบบ SAMECOR",
      badge: "เข้าสู่ระบบ", icon: "mail", title: "เข้าสู่ระบบ SAMECOR",
      preview: "กดลิงก์เพื่อเข้าสู่ระบบ ไม่ต้องใช้รหัสผ่าน",
      lead: "กดปุ่มด้านล่างเพื่อเข้าสู่ระบบบัญชี",
      tail: "โดยไม่ต้องใช้รหัสผ่าน",
      cta: "เข้าสู่ระบบ", type: "magiclink",
      noteTitle: "ไม่ได้ขอลิงก์นี้ใช่ไหม?",
      note: "ไม่ต้องทำอะไร และอย่าส่งต่อลิงก์นี้ให้ใคร ลิงก์ใช้ได้ครั้งเดียวและหมดอายุภายใน 1 ชั่วโมง",
      reason: "อีเมลนี้ส่งถึง {{ .Email }} เพราะมีคำขอเข้าสู่ระบบ SAMECOR",
    },
  }[kind];
  const siteUrl = anthemSiteUrl();
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.7;margin:0 0 24px">${copy.lead} <strong style="color:${brand.ink}">{{ .Email }}</strong> ${copy.tail}</p>`;
  const afterCtaHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.surface};border-radius:12px;margin:0 0 24px"><tr>
<td style="padding:16px 0 16px 20px;width:20px;vertical-align:top"><img src="${siteUrl}/email/flat/info-16.png" alt="" width="16" height="16" style="display:block;border:0;margin-top:3px"/></td>
<td style="padding:16px 20px 16px 10px"><p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${brand.ink}">${copy.noteTitle}</p>
<p style="margin:0;font-size:13px;line-height:1.65;color:${brand.body}">${copy.note}</p></td></tr></table>`;
  const { html } = layout({
    preview: copy.preview,
    badge: copy.badge,
    badgeTone: "brand",
    icon: copy.icon,
    title: copy.title,
    bodyHtml,
    ctaLabel: copy.cta,
    ctaUrl: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=${copy.type}`,
    reason: copy.reason,
    optOut: false,
    afterCtaHtml,
  });
  return { subject: copy.subject, html };
}

export type AnthemEmailTemplate =
  | "hire-request"
  | "chat-message"
  | "job-match"
  | "collab-request"
  | "gift-received"
  | "follow"
  | "job-application"
  | "topup-success"
  | "cashout-status"
  | "kyc-status"
  | "winback";

export function renderAnthemEmail(
  template: AnthemEmailTemplate,
  data: Record<string, unknown>,
): { html: string; text: string; subject: string } {
  switch (template) {
    case "hire-request":
      return renderHireRequestEmail(data as Parameters<typeof renderHireRequestEmail>[0]);
    case "chat-message":
      return renderChatMessageEmail(data as Parameters<typeof renderChatMessageEmail>[0]);
    case "job-match":
      return renderJobMatchEmail(data as Parameters<typeof renderJobMatchEmail>[0]);
    case "collab-request":
      return renderCollabRequestEmail(data as Parameters<typeof renderCollabRequestEmail>[0]);
    case "gift-received":
      return renderGiftReceivedEmail(data as Parameters<typeof renderGiftReceivedEmail>[0]);
    case "follow":
      return renderFollowEmail(data as Parameters<typeof renderFollowEmail>[0]);
    case "job-application":
      return renderJobApplicationEmail(data as Parameters<typeof renderJobApplicationEmail>[0]);
    case "topup-success":
      return renderTopupSuccessEmail(data as Parameters<typeof renderTopupSuccessEmail>[0]);
    case "cashout-status":
      return renderCashoutStatusEmail(data as Parameters<typeof renderCashoutStatusEmail>[0]);
    case "kyc-status":
      return renderKycStatusEmail(data as Parameters<typeof renderKycStatusEmail>[0]);
    case "winback":
      return renderWinbackEmail(data as Parameters<typeof renderWinbackEmail>[0]);
  }
}
