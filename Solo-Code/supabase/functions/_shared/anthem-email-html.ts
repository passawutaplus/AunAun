/**
 * Pixel100 notification email HTML — mirrors Anthem react-email templates for Deno edge.
 * Keep in sync with Anthem-Code/src/lib/email-templates/
 */

const brand = {
  orange: "#FF4F18",
  orangeFade: "#FFF4EF",
  orangeMuted: "#FFE4D6",
  ink: "#141517",
  body: "#4A4A4A",
  mute: "#9CA3AF",
  border: "#E8E6E3",
  surface: "#F2F4F7",
  white: "#FFFFFF",
  success: "#059669",
} as const;

const LINE_URL = "https://lin.ee/q3W9Qds";
const LINE_ID = "@solofreelancer";
const FOOTER_NOTE = "ปิดการแจ้งเตือนได้ที่ Pixel100 → Settings → การแจ้งเตือน";

export function anthemSiteUrl(): string {
  return (Deno.env.get("ANTHEM_APP_URL") ?? "https://1px-demo.vercel.app").replace(/\/$/, "");
}

export function anthemEmailFrom(): { from: string; senderDomain: string } {
  const from = Deno.env.get("ANTHEM_EMAIL_FROM") ?? "Pixel100 <noreply@pixel100.com>";
  const senderDomain = Deno.env.get("ANTHEM_EMAIL_SENDER_DOMAIN") ?? "notify.pixel100.com";
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

function badgeColors(tone: BadgeTone) {
  if (tone === "success") {
    return { border: "#A7F3D0", color: brand.success, bg: "#ECFDF5" };
  }
  return { border: brand.orangeMuted, color: brand.orange, bg: brand.orangeFade };
}

function cardRow(label: string, value: string, highlight = false): string {
  const v = escapeHtml(value);
  return `<p style="color:${brand.mute};font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;font-weight:600">${escapeHtml(label)}</p>
<p style="font-size:14px;color:${highlight ? brand.orange : brand.body};font-weight:${highlight ? 600 : 400};margin:0 0 10px;line-height:1.5">${v}</p>`;
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
}): { html: string; text: string } {
  const siteUrl = anthemSiteUrl();
  const siteDomain = new URL(siteUrl).host;
  const badge = badgeColors(opts.badgeTone);
  const iconUrl = `${siteUrl}/email/icons/${opts.icon}.png`;
  const logoUrl = `${siteUrl}/email/logo.png`;
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="th" dir="ltr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(opts.title)} — Pixel100</title></head>
<body style="margin:0;padding:24px 0;background:${brand.white};font-family:'IBM Plex Sans Thai','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.white}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;border:1px solid ${brand.border};border-radius:12px;overflow:hidden;background:${brand.white}">
<tr><td style="background:linear-gradient(180deg,${brand.orangeFade} 0%,${brand.white} 100%);padding:28px 32px 24px;border-bottom:2px solid ${brand.orange}">
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="vertical-align:middle;padding-right:10px"><img src="${logoUrl}" alt="Pixel100" width="32" height="32" style="border-radius:8px;display:block"/></td>
<td style="vertical-align:middle"><p style="margin:0;font-size:17px;font-weight:600;letter-spacing:-0.02em;color:${brand.ink};line-height:1.2"><span style="color:${brand.orange}">1</span>PX</p>
<p style="margin:2px 0 0;font-size:12px;color:${brand.mute}">ชุมชนครีเอทีฟ — ทุกคนคือ 1 PX</p></td>
</tr></table></td></tr>
<tr><td style="padding:28px 32px 32px">
<p style="display:inline-block;margin:0 0 20px;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.06em;border:1px solid ${badge.border};color:${badge.color};background:${badge.bg}">${escapeHtml(opts.badge)}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px"><tr>
<td style="width:32px;vertical-align:middle"><img src="${iconUrl}" alt="" width="24" height="24"/></td>
<td style="vertical-align:middle;padding-left:10px"><h1 style="margin:0;font-size:22px;font-weight:600;color:${brand.ink};line-height:1.3">${escapeHtml(opts.title)}</h1></td>
</tr></table>
${opts.bodyHtml}
<p style="margin:0 0 24px"><a href="${escapeHtml(opts.ctaUrl)}" style="background:${brand.orange};color:${brand.white};font-size:15px;font-weight:600;border-radius:8px;padding:13px 28px;text-decoration:none;display:inline-block">${escapeHtml(opts.ctaLabel)}</a></p>
<hr style="border:none;border-top:1px solid ${brand.border};margin:28px 0 24px"/>
<p style="font-size:12px;color:${brand.mute};margin:0 0 20px;line-height:1.5;text-align:center">${FOOTER_NOTE}</p>
<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:10px;padding:14px 18px;text-align:center;max-width:320px;margin:0 auto 24px">
<p style="margin:0;font-size:11px;color:${brand.body}">อีเมลอย่างเป็นทางการจาก Pixel100</p>
<p style="margin:4px 0 0;font-size:11px;color:${brand.mute}">แจ้งเตือนผ่าน LINE ได้ที่ <a href="${LINE_URL}" style="color:${brand.orange};text-decoration:none;font-weight:600">${LINE_ID}</a></p>
</div>
<p style="font-size:11px;font-weight:600;color:${brand.body};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;text-align:center">ติดต่อเรา</p>
<p style="font-size:12px;color:${brand.mute};margin:0 0 8px;text-align:center"><a href="${siteUrl}" style="color:${brand.body};text-decoration:none">${siteDomain}</a></p>
<p style="font-size:12px;color:${brand.mute};margin:0;text-align:center">© ${year} Pixel100</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = `${opts.title}\n\n${opts.preview}\n\n${opts.ctaLabel}: ${opts.ctaUrl}\n\n${FOOTER_NOTE}`;
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
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.clientName)}</strong> ส่งคำขอจ้างผ่าน Pixel100 สำหรับ <strong style="color:${brand.ink}">${escapeHtml(data.projectTitle)}</strong></p>
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
  return { html, text, subject: `[Pixel100] คำขอจ้างใหม่ — ${data.projectTitle}` };
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
  return { html, text, subject: `[Pixel100] ข้อความใหม่จาก ${data.senderName}` };
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
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — พบงานที่ตรงกับโปรไฟล์ของคุณบน Pixel100</p>
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
  return { html, text, subject: `[Pixel100] งานแนะนำ — ${data.jobTitle}` };
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
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.senderName)}</strong> ส่งคำขอร่วมงานผ่าน Pixel100</p>
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
  return { html, text, subject: `[Pixel100] คำขอคอลแลปจาก ${data.senderName}` };
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
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.senderName)}</strong> ส่ง <strong style="color:${brand.orange}">${escapeHtml(data.giftName)}</strong> สนับสนุนคุณบน Pixel100</p>
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
  return { html, text, subject: `[Pixel100] ${data.senderName} ส่งของขวัญ ${data.giftName}` };
}

export function renderFollowEmail(data: {
  recipientName: string;
  followerName: string;
  actionUrl: string;
}): { html: string; text: string; subject: string } {
  const rows = [cardRow("ผู้ติดตาม", data.followerName, true)].join("");
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — <strong style="color:${brand.ink}">${escapeHtml(data.followerName)}</strong> เริ่มติดตามโปรไฟล์ของคุณบน Pixel100</p>
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
  return { html, text, subject: `[Pixel100] ${data.followerName} เริ่มติดตามคุณ` };
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
  return { html, text, subject: `[Pixel100] ผู้สมัครใหม่ — ${data.jobTitle}` };
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
  const bodyHtml = `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — การเติม Pixel ของคุณบน Pixel100 สำเร็จแล้ว</p>
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
    subject: `[Pixel100] เติม Pixel สำเร็จ +${data.amountPx.toLocaleString("th-TH")} px`,
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
      subject: `[Pixel100] รับคำขอถอน ${data.grossPx.toLocaleString("th-TH")} px แล้ว`,
    },
    paid: {
      badge: "ถอนเงินสำเร็จ",
      title: "โอนเงินเข้าบัญชีแล้ว",
      tone: "success" as BadgeTone,
      body: "คำขอถอนเงินของคุณดำเนินการสำเร็จแล้ว",
      subject: `[Pixel100] ถอนเงินสำเร็จ ฿${(data.netPx ?? 0).toLocaleString("th-TH")}`,
    },
    rejected: {
      badge: "คำขอถูกปฏิเสธ",
      title: "ไม่สามารถถอนได้",
      tone: "brand" as BadgeTone,
      body: "คำขอถอนถูกปฏิเสธ — ยอด px ถูกคืนเข้ากระเป๋า earned แล้ว",
      subject: `[Pixel100] คำขอถอนถูกปฏิเสธ`,
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

export type AnthemEmailTemplate =
  | "hire-request"
  | "chat-message"
  | "job-match"
  | "collab-request"
  | "gift-received"
  | "follow"
  | "job-application"
  | "topup-success"
  | "cashout-status";

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
  }
}
