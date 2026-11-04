/**
 * Creator Invitation V1 — shared server logic for the creator-invite, creator-invite-admin and
 * creator-invite-mail edge functions: tokens, emails (TH/EN), the throttled outbox, audit events.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { anthemSiteUrl, escapeHtml, layout } from "./anthem-email-html.ts";
import { sendResendEmail } from "./resend-send.ts";
import { supabaseSecretKey } from "./supabase-keys.ts";

export const INVITE_BUCKET = "creator-invite-media";
export const BULK_EMAILS_PER_HOUR = 50;
export const REMINDER_AFTER_DAYS = 5;
export const REVIEW_LINK_DAYS = 14;
export const TEMP_PASSWORD_DAYS = 7;
export const DECLINE_PURGE_DAYS = 30;
export const CONSENT_TEXT_VERSION = "creator-invite-2026-11-04";

export type Lang = "th" | "en";
export type InviteRow = {
  id: string;
  token_cipher: string;
  review_token_cipher: string | null;
  display_name: string;
  discipline: string | null;
  country: string | null;
  contact_email: string | null;
  social_handle: string | null;
  language: Lang;
  personal_note: string | null;
  status: string;
  send_mode: string;
  auto_reminder: boolean;
  reminder_sent_at: string | null;
  sent_at: string | null;
  expires_at: string;
  revoked_at: string | null;
  unsubscribed_at: string | null;
  review_expires_at: string | null;
  user_id: string | null;
};

// ---------------------------------------------------------------------------
// Tokens: 32 random bytes (base64url). Lookup by sha256 hex; AES-GCM copy so links can be rebuilt.
// ---------------------------------------------------------------------------
function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function newToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

export function isTokenShape(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}

export async function hashToken(token: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return Array.from(d, (b) => b.toString(16).padStart(2, "0")).join("");
}

let cachedKey: Promise<CryptoKey> | null = null;
function cipherKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    const material = Deno.env.get("CREATOR_INVITE_TOKEN_KEY") || supabaseSecretKey();
    if (!material) throw new Error("no token key material");
    cachedKey = (async () => {
      const base = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(material),
        "HKDF",
        false,
        ["deriveKey"],
      );
      return crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new TextEncoder().encode("samecor-creator-invite"),
          info: new TextEncoder().encode("token-v1"),
        },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    })();
  }
  return cachedKey;
}

export async function encryptToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await cipherKey(),
      new TextEncoder().encode(token),
    ),
  );
  return `v1.${b64url(iv)}.${b64url(ct)}`;
}

export async function decryptToken(cipher: string | null | undefined): Promise<string | null> {
  if (!cipher) return null;
  const [v, iv, ct] = cipher.split(".");
  if (v !== "v1" || !iv || !ct) return null;
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(iv) as BufferSource },
      await cipherKey(),
      fromB64url(ct) as BufferSource,
    );
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

export async function mintToken(): Promise<{ token: string; hash: string; cipher: string }> {
  const token = newToken();
  return { token, hash: await hashToken(token), cipher: await encryptToken(token) };
}

/** One-time password: 20 chars, no look-alike characters. */
export function randomPassword(length = 20): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
  const out: string[] = [];
  const buf = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      // rejection sampling keeps the distribution uniform
      if (b < Math.floor(256 / alphabet.length) * alphabet.length)
        out.push(alphabet[b % alphabet.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

export const inviteLink = (token: string) => `${anthemSiteUrl()}/invite/creator/${token}`;
export const reviewLink = (token: string) => `${anthemSiteUrl()}/invite/review/${token}`;
export const unsubscribeLink = (token: string) => `${inviteLink(token)}?unsubscribe=1`;

export function isActive(inv: Pick<InviteRow, "revoked_at" | "expires_at" | "status">): boolean {
  return (
    !inv.revoked_at &&
    new Date(inv.expires_at).getTime() > Date.now() &&
    !["declined", "expired", "published"].includes(inv.status)
  );
}

export async function logEvent(
  admin: SupabaseClient,
  invitationId: string,
  kind: string,
  actorType: "admin" | "artist" | "system",
  actorId: string | null = null,
  detail: Record<string, unknown> = {},
) {
  const { error } = await admin.schema("anthem").from("invite_events").insert({
    invitation_id: invitationId,
    kind,
    actor_type: actorType,
    actor_id: actorId,
    detail,
  });
  if (error) console.error("[creator-invite] event", kind, error.message);
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------
export type InviteEmailKind = "invite" | "reminder" | "received" | "review" | "account";

const p = (html: string) =>
  `<p style="font-size:15px;color:#3D3D3D;line-height:1.7;margin:0 0 14px">${html}</p>`;
const list = (items: string[]) =>
  `<ul style="font-size:15px;color:#3D3D3D;line-height:1.7;margin:0 0 16px;padding-left:20px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const box = (html: string) =>
  `<div style="background:#F3F2EC;border:1px solid #E6E6E3;border-radius:8px;padding:16px 18px;margin:0 0 20px">${html}</div>`;

export function inviteEmailFrom(): { from: string; replyTo: string } {
  return {
    from: Deno.env.get("CREATOR_INVITE_EMAIL_FROM") ?? "Aun · SAMECOR <invite@samecor.com>",
    replyTo: Deno.env.get("CREATOR_INVITE_REPLY_TO") ?? "info@samecor.com",
  };
}

export function renderInviteEmail(
  kind: InviteEmailKind,
  d: {
    lang: Lang;
    name: string;
    note?: string | null;
    link: string;
    unsubscribe?: string;
    email?: string;
    password?: string;
    profileUrl?: string;
  },
): { subject: string; html: string; text: string } {
  const en = d.lang === "en";
  const name = escapeHtml(d.name);
  const note = d.note
    ? box(
        `<p style="margin:0;font-size:14px;color:#3D3D3D;line-height:1.7">“${escapeHtml(d.note)}”</p>`,
      )
    : "";
  const unsub = d.unsubscribe
    ? `<p style="margin:0 0 16px;font-size:12px;color:#666">${en ? "Not interested? " : "ไม่สะดวกรับอีเมลนี้? "}<a href="${escapeHtml(d.unsubscribe)}" style="color:#3D3D3D">${en ? "Stop invitation emails" : "หยุดรับอีเมลคำเชิญ"}</a></p>`
    : "";
  const reason = en
    ? "You received this because the SAMECOR team personally invited you."
    : "คุณได้รับอีเมลนี้เพราะทีม SAMECOR เชิญคุณเป็นการส่วนตัว";

  let subject: string;
  let title: string;
  let badge: string;
  let body: string;
  let cta: string;
  let preview: string;
  let icon = "info";
  let ctaUrl = d.link;
  let textExtra = "";

  switch (kind) {
    case "invite":
    case "reminder": {
      const reminder = kind === "reminder";
      subject = en
        ? reminder
          ? "A gentle reminder: your SAMECOR invitation"
          : "Invitation to Join SAMECOR — A Creative Platform from Thailand"
        : reminder
          ? "เตือนความจำ: คำเชิญร่วมเป็นครีเอเตอร์กลุ่มแรกของ SAMECOR"
          : "คำเชิญร่วมเป็นครีเอเตอร์กลุ่มแรกของ SAMECOR";
      title = en ? `An invitation for ${d.name}` : `คำเชิญสำหรับคุณ${d.name}`;
      badge = reminder ? (en ? "Reminder" : "เตือนความจำ") : "Founding Creator Invitation";
      preview = en
        ? "We'll prepare your space. You choose what to share."
        : "เราจะเตรียมพื้นที่ให้ คุณเลือกเองว่าจะแชร์อะไร";
      body = en
        ? (reminder
            ? p(`Dear ${name}, just a short note in case our invitation got buried.`)
            : p(`Dear ${name},`)) +
          p(
            "I'm Passawut Saelore (Aun), Founder of SAMECOR. I'm interested in your creative work and would love to invite you to be among our first featured creators.",
          ) +
          p(
            "SAMECOR is a new creative community from Thailand where artists and designers can showcase work, meet people, and discover opportunities through online connections and real-world events — <strong>1 Profile. 100+ Opportunities.</strong>",
          ) +
          note +
          p("With your permission, we'd love to prepare a simple profile using:") +
          list([
            "Your artist name and creative discipline",
            "A short introduction",
            "1–2 projects with images of your choice",
            "Website or preferred social links",
          ]) +
          p(
            "You can use the short form below, reply to this email, or sign up and upload your work yourself at samecor.com. We'll give proper credit and send the draft for your approval before anything is published. It's free, with no obligations, and you keep ownership of your work.",
          ) +
          p(
            "Thank you for considering our invitation.<br/>Passawut Saelore (Aun) · Founder, SAMECOR",
          )
        : (reminder
            ? p(`สวัสดีครับคุณ${name} ขอส่งคำเชิญนี้อีกครั้ง เผื่ออีเมลก่อนหน้าหลุดไปครับ`)
            : p(`สวัสดีครับคุณ${name}`)) +
          p(
            "ผมภาสวุฒิ แซ่ล้อ (อั๋น) ผู้ก่อตั้ง SAMECOR ครับ ผมสนใจผลงานของคุณ จึงอยากเชิญมาร่วมเป็นหนึ่งในครีเอเตอร์กลุ่มแรกของแพลตฟอร์มสร้างสรรค์จากประเทศไทย",
          ) +
          p(
            "SAMECOR เป็น Creative Community สำหรับแสดงผลงาน พบผู้คน และสร้างโอกาสผ่านการเชื่อมต่อทั้งออนไลน์และกิจกรรมออนไซต์ ภายใต้แนวคิด <strong>“1 Profile. 100+ Opportunities.”</strong>",
          ) +
          note +
          p("หากสะดวก เราอยากขอข้อมูลสั้น ๆ เพื่อเตรียมโปรไฟล์ให้:") +
          list([
            "ชื่อ/ชื่อศิลปินและสาขาที่ทำงาน",
            "ข้อความแนะนำตัวสั้น ๆ",
            "ผลงาน 1–2 โปรเจกต์ พร้อมภาพตามสะดวก",
            "เว็บไซต์หรือช่องทางติดต่อที่ต้องการแสดง",
          ]) +
          p(
            "กรอกแบบฟอร์มสั้น ๆ จากปุ่มด้านล่าง ตอบกลับอีเมลนี้ หรือสมัครและลงผลงานเองที่ samecor.com ได้เลยครับ เราจะให้เครดิตและส่งโปรไฟล์ให้ตรวจก่อนเผยแพร่ ไม่มีค่าใช้จ่าย ไม่มีข้อผูกมัด และผลงานยังเป็นสิทธิ์ของคุณเช่นเดิมครับ",
          ) +
          p("ขอบคุณที่พิจารณาคำเชิญครับ<br/>ภาสวุฒิ แซ่ล้อ (อั๋น) · Founder, SAMECOR");
      cta = en ? "Open my invitation" : "เปิดคำเชิญของฉัน";
      break;
    }
    case "received":
      subject = en
        ? "We've received your details — SAMECOR"
        : "เราได้รับข้อมูลของคุณแล้ว — SAMECOR";
      title = en ? "Thank you — we've got it" : "ขอบคุณ เราได้รับข้อมูลแล้ว";
      badge = en ? "Submitted" : "ส่งแล้ว";
      icon = "kyc";
      preview = en
        ? "We'll prepare a private draft and send it for your approval."
        : "ทีมจะเตรียมโปรไฟล์ร่างแบบส่วนตัว แล้วส่งให้คุณตรวจก่อนเผยแพร่";
      body = en
        ? p(
            `Thank you, ${name}. Our team will prepare a private draft of your profile and email you a review link, usually within 3 working days.`,
          ) +
          p(
            "Nothing is published until you approve it. You can still edit what you sent until we start preparing the draft.",
          )
        : p(
            `ขอบคุณ คุณ${name} ทีมจะเตรียมโปรไฟล์ร่างแบบส่วนตัว แล้วส่งลิงก์ให้ตรวจทางอีเมลภายในประมาณ 3 วันทำการ`,
          ) +
          p(
            "ไม่มีอะไรเผยแพร่จนกว่าคุณกดอนุมัติ และยังกลับไปแก้ข้อมูลที่ส่งได้จนกว่าทีมจะเริ่มทำ Draft",
          );
      cta = en ? "View or edit what I sent" : "ดูหรือแก้ข้อมูลที่ส่ง";
      break;
    case "review":
      subject = en
        ? "Your SAMECOR profile draft is ready for review"
        : "โปรไฟล์ร่าง SAMECOR ของคุณพร้อมให้ตรวจแล้ว";
      title = en ? "Review your profile before it goes live" : "ตรวจโปรไฟล์ก่อนเผยแพร่";
      badge = en ? "Awaiting your approval" : "รอคุณอนุมัติ";
      preview = en
        ? "Approve, request changes, or decline — your call."
        : "อนุมัติ ขอแก้ไข หรือปฏิเสธ — คุณเป็นคนตัดสินใจ";
      body = en
        ? p(
            `Hi ${name}, we've prepared a draft of your profile. The link shows exactly what visitors will see — text, images and links.`,
          ) +
          p(
            `Approve it, ask for changes, or decline. The link expires in ${REVIEW_LINK_DAYS} days.`,
          )
        : p(
            `สวัสดีครับคุณ${name} ทีมเตรียมโปรไฟล์ร่างให้แล้ว ลิงก์นี้แสดงทุกอย่างที่จะเห็นบนหน้าสาธารณะ ทั้งข้อความ รูป และลิงก์`,
          ) + p(`กดอนุมัติ ขอแก้ไข หรือปฏิเสธได้เลยครับ ลิงก์หมดอายุใน ${REVIEW_LINK_DAYS} วัน`);
      cta = en ? "Review my profile" : "ตรวจโปรไฟล์ของฉัน";
      break;
    case "account": {
      subject = en ? "Your SAMECOR profile is live" : "โปรไฟล์ SAMECOR ของคุณออนไลน์แล้ว";
      title = en ? "Your profile is live" : "โปรไฟล์ของคุณออนไลน์แล้ว";
      badge = en ? "Published" : "เผยแพร่แล้ว";
      icon = "kyc";
      preview = en
        ? "Sign in details for your new SAMECOR account inside."
        : "ข้อมูลเข้าใช้บัญชี SAMECOR ของคุณอยู่ในอีเมลนี้";
      ctaUrl = d.profileUrl ?? d.link;
      const creds = d.password
        ? box(
            `<p style="margin:0 0 6px;font-size:13px;color:#666">${en ? "Sign-in email" : "อีเมลเข้าใช้"}</p>` +
              `<p style="margin:0 0 12px;font-size:15px;color:#111;font-weight:600">${escapeHtml(d.email ?? "")}</p>` +
              `<p style="margin:0 0 6px;font-size:13px;color:#666">${en ? "One-time password" : "รหัสผ่านชั่วคราว (ใช้ครั้งเดียว)"}</p>` +
              `<p style="margin:0;font-size:17px;color:#111;font-weight:600;font-family:Menlo,Consolas,monospace;letter-spacing:.5px">${escapeHtml(d.password)}</p>`,
          )
        : "";
      body = en
        ? p(`Welcome to SAMECOR, ${name}. Your approved profile is now public.`) +
          (d.password
            ? p(
                "We created your account with this email address. Sign in with the one-time password below — you'll be asked to set your own password straight away.",
              ) +
              creds +
              p(
                `The one-time password works for ${TEMP_PASSWORD_DAYS} days. After that, use “Forgot password” on the sign-in page.`,
              ) +
              p(
                "Prefer Google or Apple sign-in? Reply to this email and we'll link it for you (the email must match).",
              )
            : p("It's linked to the account you created with your invitation."))
        : p(`ยินดีต้อนรับสู่ SAMECOR คุณ${name} โปรไฟล์ที่คุณอนุมัติเผยแพร่แล้ว`) +
          (d.password
            ? p(
                "เราสร้างบัญชีให้ด้วยอีเมลนี้แล้ว เข้าสู่ระบบด้วยรหัสผ่านชั่วคราวด้านล่าง แล้วระบบจะให้ตั้งรหัสใหม่ทันที",
              ) +
              creds +
              p(
                `รหัสชั่วคราวใช้ได้ ${TEMP_PASSWORD_DAYS} วัน หลังจากนั้นใช้ “ลืมรหัสผ่าน” ที่หน้าเข้าสู่ระบบ`,
              ) +
              p(
                "อยากเข้าด้วย Google หรือ Apple? ตอบกลับอีเมลนี้ ทีมจะเชื่อมบัญชีให้ (อีเมลต้องตรงกัน)",
              )
            : p("โปรไฟล์ผูกกับบัญชีที่คุณสมัครผ่านคำเชิญแล้ว"));
      cta = en ? "Sign in to SAMECOR" : "เข้าสู่ระบบ SAMECOR";
      if (d.password) {
        textExtra = `\n${en ? "Sign-in email" : "อีเมลเข้าใช้"}: ${d.email}\n${en ? "One-time password" : "รหัสผ่านชั่วคราว"}: ${d.password}\n`;
      }
      break;
    }
  }

  const { html, text } = layout({
    lang: d.lang,
    preview,
    badge,
    badgeTone: kind === "received" || kind === "account" ? "success" : "brand",
    icon,
    title,
    bodyHtml: body,
    ctaLabel: cta,
    ctaUrl,
    reason,
    optOut: false,
    afterCtaHtml: unsub,
  });
  return { subject, html, text: textExtra ? `${text}\n${textExtra}` : text };
}

// ---------------------------------------------------------------------------
// Outbox
// ---------------------------------------------------------------------------
export async function enqueueEmail(
  admin: SupabaseClient,
  invitationId: string,
  kind: "invite" | "reminder" | "received" | "review",
  notBefore?: string | null,
) {
  const { error } = await admin
    .schema("anthem")
    .from("invite_email_outbox")
    .insert({
      invitation_id: invitationId,
      kind,
      not_before: notBefore ?? new Date().toISOString(),
    });
  if (error) throw new Error(`enqueue ${kind}: ${error.message}`);
}

const INVITE_COLS =
  "id, token_cipher, review_token_cipher, display_name, discipline, country, contact_email, social_handle, language, personal_note, status, send_mode, auto_reminder, reminder_sent_at, sent_at, expires_at, revoked_at, unsubscribed_at, review_expires_at, user_id";
export { INVITE_COLS };

/** Sends due outbox rows. Invitations and reminders share a 50/hour budget; transactional mail is not throttled. */
export async function processOutbox(
  admin: SupabaseClient,
  max = 25,
): Promise<{ sent: number; failed: number; skipped: number; deferred: number }> {
  const anthem = admin.schema("anthem");
  const res = { sent: 0, failed: 0, skipped: 0, deferred: 0 };
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: bulkSent } = await anthem
    .from("invite_email_outbox")
    .select("id", { count: "exact", head: true })
    .in("kind", ["invite", "reminder"])
    .eq("status", "sent")
    .gte("sent_at", hourAgo);
  let bulkBudget = Math.max(0, BULK_EMAILS_PER_HOUR - (bulkSent ?? 0));

  // Stuck "sending" rows (function died mid-send) go back to pending after 15 minutes.
  await anthem
    .from("invite_email_outbox")
    .update({ status: "pending" })
    .eq("status", "sending")
    .lt("not_before", new Date(Date.now() - 15 * 60_000).toISOString());

  const { data: due } = await anthem
    .from("invite_email_outbox")
    .select("id, invitation_id, kind, attempts")
    .eq("status", "pending")
    .lte("not_before", new Date().toISOString())
    .order("id")
    .limit(max);

  const { from, replyTo } = inviteEmailFrom();
  for (const row of due ?? []) {
    const bulk = row.kind === "invite" || row.kind === "reminder";
    if (bulk && bulkBudget <= 0) {
      res.deferred++;
      continue;
    }
    const { data: claimed } = await anthem
      .from("invite_email_outbox")
      .update({
        status: "sending",
        attempts: row.attempts + 1,
        not_before: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const { data: inv } = await anthem
      .from("creator_invitations")
      .select(INVITE_COLS)
      .eq("id", row.invitation_id)
      .maybeSingle<InviteRow>();
    const skip = async (reason: string) => {
      await anthem
        .from("invite_email_outbox")
        .update({ status: "skipped", last_error: reason })
        .eq("id", row.id);
      if (inv)
        await logEvent(admin, inv.id, `email_${row.kind}_skipped`, "system", null, { reason });
      res.skipped++;
    };
    if (!inv) {
      await anthem
        .from("invite_email_outbox")
        .update({ status: "skipped", last_error: "invitation gone" })
        .eq("id", row.id);
      res.skipped++;
      continue;
    }
    if (!inv.contact_email) {
      await skip("no_email");
      continue;
    }
    if (bulk && inv.unsubscribed_at) {
      await skip("unsubscribed");
      continue;
    }
    if (bulk && !isActive(inv)) {
      await skip("inactive");
      continue;
    }
    if (row.kind === "reminder" && !["sent", "opened"].includes(inv.status)) {
      await skip("already_responded");
      continue;
    }

    const token = await decryptToken(
      row.kind === "review" ? inv.review_token_cipher : inv.token_cipher,
    );
    if (!token) {
      await skip("token_unreadable");
      continue;
    }
    const link = row.kind === "review" ? reviewLink(token) : inviteLink(token);
    const inviteToken = row.kind === "review" ? await decryptToken(inv.token_cipher) : token;
    const mail = renderInviteEmail(row.kind, {
      lang: inv.language,
      name: inv.display_name,
      note: row.kind === "invite" || row.kind === "reminder" ? inv.personal_note : null,
      link,
      unsubscribe: bulk && inviteToken ? unsubscribeLink(inviteToken) : undefined,
    });
    const r = await sendResendEmail({
      to: inv.contact_email,
      from,
      replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      idempotencyKey: `creator-invite-${row.id}`,
      headers:
        bulk && inviteToken
          ? { "List-Unsubscribe": `<${unsubscribeLink(inviteToken)}>` }
          : undefined,
    });
    if (r.ok) {
      await anthem
        .from("invite_email_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_id: r.id ?? null,
          last_error: null,
        })
        .eq("id", row.id);
      if (row.kind === "invite") {
        const patch: Record<string, unknown> = {
          sent_at: new Date().toISOString(),
          sent_channel: "email",
        };
        if (inv.status === "draft") patch.status = "sent";
        await anthem.from("creator_invitations").update(patch).eq("id", inv.id);
      }
      if (row.kind === "reminder")
        await anthem
          .from("creator_invitations")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", inv.id);
      await logEvent(admin, inv.id, `email_${row.kind}_sent`, "system", null, {
        provider_id: r.id ?? null,
      });
      if (bulk) bulkBudget--;
      res.sent++;
    } else {
      const giveUp = !r.retryable || row.attempts + 1 >= 5;
      await anthem
        .from("invite_email_outbox")
        .update({
          status: giveUp ? "failed" : "pending",
          last_error: r.message.slice(0, 300),
          not_before: new Date(Date.now() + 10 * 60_000 * (row.attempts + 1)).toISOString(),
        })
        .eq("id", row.id);
      await logEvent(
        admin,
        inv.id,
        `email_${row.kind}_${giveUp ? "failed" : "retry"}`,
        "system",
        null,
        { error: r.message.slice(0, 200), status: r.status ?? null },
      );
      res.failed++;
    }
  }
  return res;
}

/** Signed view URLs (1 hour) for media rows. */
export async function signedMediaUrls(
  admin: SupabaseClient,
  rows: { id: string; storage_path: string }[],
): Promise<Record<string, string>> {
  if (rows.length === 0) return {};
  const { data } = await admin.storage.from(INVITE_BUCKET).createSignedUrls(
    rows.map((r) => r.storage_path),
    3600,
  );
  const out: Record<string, string> = {};
  rows.forEach((r, i) => {
    const u = data?.[i]?.signedUrl;
    if (u) out[r.id] = u;
  });
  return out;
}

/** Delete an invitation and all its private data (storage objects first). */
export async function purgeInvitation(admin: SupabaseClient, invitationId: string): Promise<void> {
  const anthem = admin.schema("anthem");
  const { data: media } = await anthem
    .from("invite_media")
    .select("storage_path")
    .eq("invitation_id", invitationId);
  const paths = (media ?? []).map((m: { storage_path: string }) => m.storage_path);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from(INVITE_BUCKET).remove(paths.slice(i, i + 100));
  }
  await anthem.from("creator_invitations").delete().eq("id", invitationId);
}

export function clientIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function ipHash(req: Request): Promise<string> {
  return (await hashToken(`ip:${clientIp(req)}`)).slice(0, 32);
}
