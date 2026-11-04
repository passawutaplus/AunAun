/** Admin-side labels and outreach templates for Creator Invitations (text from the UX/UI brief). */
import type { InviteStatus } from "@/lib/creatorInvite";

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  opened: "Opened",
  started: "Started",
  submitted: "Submitted",
  preparing: "Preparing",
  needs_changes: "Needs changes",
  approved: "Approved",
  published: "Published",
  declined: "Declined",
  expired: "Expired",
};

export function inviteStatusTone(s: InviteStatus): "default" | "accent" | "muted" {
  if (s === "submitted" || s === "needs_changes" || s === "approved") return "accent";
  if (s === "declined" || s === "expired" || s === "draft") return "muted";
  return "default";
}

export type InviteTab = "all" | "sent" | "progress" | "team" | "done" | "closed";
export const INVITE_TABS: { id: InviteTab; label: string; statuses: InviteStatus[] | null }[] = [
  { id: "all", label: "ทั้งหมด", statuses: null },
  { id: "sent", label: "ส่งแล้ว", statuses: ["draft", "sent", "opened"] },
  { id: "progress", label: "กำลังกรอก", statuses: ["started"] },
  { id: "team", label: "รอทีม", statuses: ["submitted", "preparing", "needs_changes"] },
  { id: "done", label: "อนุมัติ / เผยแพร่", statuses: ["approved", "published"] },
  { id: "closed", label: "ปิดแล้ว", statuses: ["declined", "expired"] },
];

/** Timeline order shown on the detail page. */
export const INVITE_TIMELINE: { key: string; label: string }[] = [
  { key: "created_at", label: "Draft · สร้างคำเชิญ" },
  { key: "sent_at", label: "Sent" },
  { key: "opened_at", label: "Opened (กดเลือกเส้นทาง)" },
  { key: "started_at", label: "Started" },
  { key: "submitted_at", label: "Submitted" },
  { key: "review_sent_at", label: "Preparing → ส่งลิงก์ตรวจ" },
  { key: "approved_at", label: "Approved" },
  { key: "published_at", label: "Published" },
  { key: "account_created_at", label: "Account created (อีเมล + รหัสสุ่ม)" },
];

export const EVENT_LABEL: Record<string, string> = {
  created: "สร้างคำเชิญ",
  invite_queued: "เข้าคิวส่งอีเมลคำเชิญ",
  reminder_queued: "เข้าคิวส่งเตือน",
  email_invite_sent: "ส่งอีเมลคำเชิญแล้ว",
  email_reminder_sent: "ส่งอีเมลเตือนแล้ว",
  email_received_sent: "ส่งอีเมลยืนยันว่าได้รับข้อมูล",
  email_review_sent: "ส่งอีเมลลิงก์ตรวจแล้ว",
  email_account_sent: "ส่งอีเมลบัญชีพร้อมใช้แล้ว",
  marked_sent: "บันทึกว่าส่งเองทาง DM",
  opened: "ศิลปินเปิดคำเชิญ",
  started: "ศิลปินเริ่มกรอก",
  submitted: "ศิลปินส่งข้อมูล",
  submission_updated: "ศิลปินแก้ข้อมูลที่ส่ง",
  self_signup_linked: "ศิลปินสมัครเองผ่านคำเชิญ",
  draft_started: "เริ่มทำ Draft",
  draft_saved: "บันทึก Draft",
  review_link_created: "สร้างลิงก์ตรวจ",
  review_approve: "ศิลปินอนุมัติ",
  review_changes: "ศิลปินขอแก้ไข",
  review_decline: "ศิลปินปฏิเสธ",
  account_created: "สร้างบัญชี",
  published: "เผยแพร่โปรไฟล์",
  publish_failed: "เผยแพร่ไม่สำเร็จ",
  revoked: "ยกเลิกลิงก์",
  extended: "ต่ออายุ",
  link_regenerated: "สร้างลิงก์ใหม่",
  unsubscribed: "ศิลปินหยุดรับอีเมล",
  expired: "หมดอายุ",
  media_blocked: "ไฟล์ไม่ผ่านการตรวจ",
  temp_password_expired: "รหัสชั่วคราวหมดอายุ",
};

export function eventLabel(kind: string): string {
  if (EVENT_LABEL[kind]) return EVENT_LABEL[kind];
  const m = kind.match(/^email_(\w+?)_(failed|retry|skipped)$/);
  if (m) return `อีเมล ${m[1]} ${m[2] === "failed" ? "ส่งไม่สำเร็จ" : m[2] === "retry" ? "จะลองส่งใหม่" : "ข้าม"}`;
  return kind;
}

export type TemplateId = "email-th" | "email-en" | "dm-th" | "dm-en";

export function outreachTemplate(id: TemplateId, name: string, link: string): string {
  const n = name || "[ชื่อ]";
  switch (id) {
    case "email-th":
      return `เรื่อง: คำเชิญร่วมเป็นครีเอเตอร์กลุ่มแรกของ SAMECOR

สวัสดีครับคุณ${n}

ผมภาสวุฒิ แซ่ล้อ (อั๋น) ผู้ก่อตั้ง SAMECOR ครับ ผมสนใจผลงานของคุณ จึงอยากเชิญมาร่วมเป็นหนึ่งในครีเอเตอร์กลุ่มแรกของแพลตฟอร์มสร้างสรรค์จากประเทศไทย

SAMECOR เป็น Creative Community สำหรับแสดงผลงาน พบผู้คน และสร้างโอกาสผ่านการเชื่อมต่อทั้งออนไลน์และกิจกรรมออนไซต์ ภายใต้แนวคิด “1 Profile. 100+ Opportunities.”

หากสะดวก เราอยากขอข้อมูลสั้น ๆ เพื่อเตรียมโปรไฟล์ให้:
1. ชื่อ/ชื่อศิลปินและสาขาที่ทำงาน
2. ข้อความแนะนำตัวสั้น ๆ
3. ผลงาน 1–3 โปรเจกต์ พร้อมภาพตามสะดวก
4. เว็บไซต์หรือช่องทางติดต่อที่ต้องการแสดง

คุณสามารถตอบกลับอีเมลนี้ กรอกแบบฟอร์ม ${link} หรือสมัครและลงผลงานเองที่ https://samecor.com ได้เลยครับ

เราจะให้เครดิตและส่งโปรไฟล์ให้ตรวจสอบก่อนเผยแพร่โดยไม่มีค่าใช้จ่ายและไม่มีข้อผูกมัด ผลงานยังเป็นสิทธิ์ของคุณเช่นเดิมครับ

ขณะนี้เรากำลังพัฒนา SAMECOR เป็นแอปพลิเคชันด้วย เพื่อให้เข้าถึงผลงาน กิจกรรม และการเชื่อมต่อได้ง่ายขึ้นในอนาคต

ขอบคุณที่พิจารณาคำเชิญครับ
ภาสวุฒิ แซ่ล้อ (อั๋น) · Founder, SAMECOR`;
    case "email-en":
      return `Subject: Invitation to Join SAMECOR — A Creative Platform from Thailand

Dear ${name || "[Name]"},

I'm Passawut Saelore (Aun), Founder of SAMECOR. I'm interested in your creative work and would love to invite you to be among our first featured creators.

SAMECOR is a new creative community from Thailand where artists and designers can showcase work, meet people, and discover opportunities through online connections and real-world events. Our vision is “1 Profile. 100+ Opportunities.”

With your permission, we'd love to prepare a simple profile using:
1. Your artist name and creative discipline
2. A short introduction
3. 1–3 projects with images of your choice
4. Website or preferred social links

You can reply to this email, use our short form at ${link}, or sign up and upload your work yourself at https://samecor.com.

We'll provide proper credit and send the draft for your approval before publishing. Participation is free, with no obligations, and you retain ownership of your work.

We're also developing a mobile app to make SAMECOR easier to access in the future.

Thank you for considering our invitation.
Passawut Saelore (Aun) · Founder, SAMECOR`;
    case "dm-th":
      return `สวัสดีครับคุณ${n} 👋
ผมอั๋น ภาสวุฒิ แซ่ล้อ ผู้ก่อตั้ง SAMECOR ครับ ผมสนใจผลงานของคุณ เลยอยากเชิญร่วมเป็นหนึ่งในครีเอเตอร์กลุ่มแรกของแพลตฟอร์มจากประเทศไทย

SAMECOR เป็นพื้นที่ให้ศิลปินและนักออกแบบโชว์ผลงาน เชื่อมต่อผู้คน และค้นพบโอกาสผ่านกิจกรรมทั้งออนไลน์และออนไซต์ — 1 Profile. 100+ Opportunities.

หากสะดวก เราอยากขอข้อมูลแนะนำตัวสั้น ๆ และผลงาน 1–3 โปรเจกต์ พร้อมภาพที่คุณเลือก เพื่อจัดทำ Draft Profile ให้โดยไม่มีค่าใช้จ่ายและส่งให้คุณอนุมัติก่อนเผยแพร่ครับ

ตอบกลับแชทนี้ได้เลย หรือกรอกฟอร์ม: ${link} หรือสมัครเองที่ https://samecor.com
เรากำลังพัฒนาแอปให้เข้าถึง SAMECOR ได้สะดวกขึ้นด้วยครับ ขอบคุณที่พิจารณานะครับ 🙏
อั๋น · Founder, SAMECOR`;
    case "dm-en":
      return `Hi ${name || "[Name]"}! 👋
I'm Passawut Saelore (Aun), Founder of SAMECOR, a new creative community from Thailand. I'm interested in your work and would love to invite you to be one of our first featured creators.

SAMECOR helps artists and designers showcase their work, connect with people, and discover opportunities online and through real-world creative events — 1 Profile. 100+ Opportunities.

With your permission, we'd love to prepare a simple profile with a short bio and 1–3 projects featuring images of your choice. It's free, and nothing goes public before your approval.

You can reply here, use ${link}, or sign up and upload your own work at https://samecor.com.
We're also developing a mobile app to make it easier to access SAMECOR. Thanks for considering the invitation!
Aun · Founder, SAMECOR`;
  }
}
