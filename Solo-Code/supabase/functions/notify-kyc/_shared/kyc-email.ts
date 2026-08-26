/** Slim KYC email HTML for the notify-kyc edge function. */
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

const FOOTER_NOTE = "ปิดการแจ้งเตือนได้ที่ Aplus1 → Settings → การแจ้งเตือน";

export function anthemSiteUrl(): string {
  return (
    Deno.env.get("APLUS1_APP_URL") ??
    Deno.env.get("ANTHEM_APP_URL") ??
    "https://aplus1.app"
  ).replace(/\/$/, "");
}

export function anthemEmailFrom(): { from: string } {
  const from =
    Deno.env.get("APLUS1_EMAIL_FROM") ??
    Deno.env.get("ANTHEM_EMAIL_FROM") ??
    "Aplus1 <noreply@aplus1.app>";
  return { from };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
        body: "คุณพร้อมเปิดรับงานจ้างและรับค่าจ้างตามเงื่อนไขแพลตฟอร์ม — การยืนยันมีผล 2 ปี",
        cta: "ดูสถานะการยืนยัน",
        subject: "[Aplus1] ยืนยันตัวตนสำเร็จ",
        badgeColor: brand.success,
        badgeBg: "#ECFDF5",
        badgeBorder: "#A7F3D0",
      }
    : {
        badge: "คำขอไม่ผ่าน",
        title: "คำขอยืนยันตัวตนไม่ผ่าน",
        body: "กรุณาตรวจสอบเหตุผลด้านล่าง แล้วส่งเอกสารใหม่ได้ที่หน้ายืนยันตัวตน",
        cta: "ส่งคำขอใหม่",
        subject: "[Aplus1] คำขอยืนยันตัวตนไม่ผ่าน",
        badgeColor: brand.orange,
        badgeBg: brand.orangeFade,
        badgeBorder: brand.orangeMuted,
      };
  const reasonHtml =
    !approved && data.reason
      ? `<div style="background:${brand.surface};border:1px solid ${brand.border};border-radius:8px;padding:20px 22px;margin:0 0 24px"><p style="color:${brand.mute};font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;font-weight:600">เหตุผล</p><p style="font-size:14px;color:${brand.body};margin:0;line-height:1.5">${escapeHtml(data.reason)}</p></div>`
      : "";
  const html = `<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 0;background:${brand.white};font-family:'IBM Plex Sans Thai','Inter',sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;border:1px solid ${brand.border};border-radius:12px;overflow:hidden">
<tr><td style="background:linear-gradient(180deg,${brand.orangeFade} 0%,${brand.white} 100%);padding:28px 32px 24px;border-bottom:2px solid ${brand.orange}">
<p style="margin:0;font-size:17px;font-weight:600;color:${brand.ink}"><span style="color:${brand.orange}">Aplus</span>1</p>
</td></tr>
<tr><td style="padding:28px 32px 32px">
<p style="display:inline-block;margin:0 0 20px;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid ${copy.badgeBorder};color:${copy.badgeColor};background:${copy.badgeBg}">${escapeHtml(copy.badge)}</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:${brand.ink}">${escapeHtml(copy.title)}</h1>
<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">สวัสดี ${escapeHtml(data.recipientName)} — ${escapeHtml(copy.body)}</p>
${reasonHtml}
<p style="margin:0 0 24px"><a href="${escapeHtml(data.actionUrl)}" style="background:${brand.orange};color:${brand.white};font-size:15px;font-weight:600;border-radius:8px;padding:13px 28px;text-decoration:none;display:inline-block">${escapeHtml(copy.cta)}</a></p>
<p style="font-size:12px;color:${brand.mute};margin:0;text-align:center">${FOOTER_NOTE}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${copy.title}\n\nสวัสดี ${data.recipientName} — ${copy.body}\n\n${copy.cta}: ${data.actionUrl}\n\n${FOOTER_NOTE}`;
  return { html, text, subject: copy.subject };
}
