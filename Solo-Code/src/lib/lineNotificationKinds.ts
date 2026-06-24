/** LINE notification preference keys (stored in profiles.line_notify_prefs). */

export type LineNotifyKind =
  | "portal_slip"
  | "portal_tracker_comment"
  | "portal_brief"
  | "portal_planner"
  | "portal_quotation"
  | "anthem_hire"
  | "anthem_chat"
  | "anthem_job_match"
  | "anthem_collab"
  | "anthem_gift"
  | "anthem_follow"
  | "anthem_job_application"
  | "anthem_topup"
  | "anthem_cashout"
  | "inhouse_invite"
  | "inhouse_member_join"
  | "inhouse_chat"
  | "inhouse_task"
  | "support_ticket"
  | "billing";

export type UserLocale = "th" | "en";

export const DEFAULT_LINE_NOTIFY_PREFS: Record<LineNotifyKind, boolean> = {
  portal_slip: true,
  portal_tracker_comment: true,
  portal_brief: true,
  portal_planner: true,
  portal_quotation: true,
  anthem_hire: true,
  anthem_chat: true,
  anthem_job_match: true,
  anthem_collab: true,
  anthem_gift: true,
  anthem_follow: true,
  anthem_job_application: true,
  anthem_topup: true,
  anthem_cashout: true,
  inhouse_invite: true,
  inhouse_member_join: true,
  inhouse_chat: true,
  inhouse_task: true,
  support_ticket: false,
  billing: false,
};

export interface LineNotifyGroup {
  id: string;
  label: Record<UserLocale, string>;
  description: Record<UserLocale, string>;
  kinds: Array<{
    key: LineNotifyKind;
    label: Record<UserLocale, string>;
    hint: Record<UserLocale, string>;
  }>;
}

/** Hero / customer portal events — primary value for Pro LINE alerts. */
export const LINE_NOTIFY_GROUPS: LineNotifyGroup[] = [
  {
    id: "portal",
    label: { th: "จากลูกค้าในหน้าที่แชร์", en: "Customer portal" },
    description: {
      th: "แจ้งเตือนเมื่อลูกค้าทำอะไรบนหน้าที่คุณแชร์ให้",
      en: "When clients act on your shared links",
    },
    kinds: [
      {
        key: "portal_slip",
        label: { th: "อัปโหลดสลิปชำระเงิน", en: "Payment slip uploaded" },
        hint: {
          th: "ลูกค้าส่งสลิปในลิงก์ติดตามงาน",
          en: "Client uploads a slip on the tracking page",
        },
      },
      {
        key: "portal_tracker_comment",
        label: { th: "คอมเมนต์ในงาน", en: "Job step comment" },
        hint: {
          th: "ลูกค้าคอมเมนต์ในขั้นตอนงาน",
          en: "Client comments on a workflow step",
        },
      },
      {
        key: "portal_brief",
        label: { th: "ยืนยันบรีฟงาน", en: "Brief confirmed" },
        hint: {
          th: "ลูกค้ายืนยันบรีฟครบถ้วน",
          en: "Client confirms the creative brief",
        },
      },
      {
        key: "portal_planner",
        label: { th: "อนุมัติ / ขอแก้คอนเทนต์", en: "Content approval" },
        hint: {
          th: "ลูกค้าอนุมัติหรือขอแก้โพสต์",
          en: "Client approves or requests changes",
        },
      },
      {
        key: "portal_quotation",
        label: { th: "อัปเดตใบเสนอราคา", en: "Quotation update" },
        hint: {
          th: "เร็วๆ นี้ — เมื่อลูกค้าตอบรับหรือแก้ไขใบเสนอราคา",
          en: "Coming soon — client accepts or updates a quotation",
        },
      },
    ],
  },
  {
    id: "anthem",
    label: { th: "จากหน้าร้านโชว์เคส", en: "Pixel100 showcase" },
    description: {
      th: "คำขอจ้าง แชท ของขวัญ และกิจกรรมจากหน้าร้าน Pixel100",
      en: "Hire, chat, gifts, and showcase activity on Pixel100",
    },
    kinds: [
      {
        key: "anthem_hire",
        label: { th: "คำขอจ้างงานใหม่", en: "New hire request" },
        hint: { th: "จากผลงานในหน้าร้าน", en: "From your showcase project" },
      },
      {
        key: "anthem_chat",
        label: { th: "ข้อความแชทใหม่", en: "New chat message" },
        hint: { th: "แชทจ้างงานหรือคอลแลป", en: "Hire or collab live chat" },
      },
      {
        key: "anthem_collab",
        label: { th: "คำขอคอลแลป", en: "Collab request" },
        hint: { th: "มีคนอยากร่วมงานกับคุณ", en: "Someone wants to collaborate" },
      },
      {
        key: "anthem_gift",
        label: { th: "ได้รับของขวัญ PX", en: "Gift received" },
        hint: { th: "เมื่อมีคนส่งของขวัญสนับสนุน", en: "When someone sends you a gift" },
      },
      {
        key: "anthem_follow",
        label: { th: "ผู้ติดตามใหม่", en: "New follower" },
        hint: { th: "เมื่อมีคนกดติดตามโปรไฟล์", en: "When someone follows you" },
      },
      {
        key: "anthem_job_match",
        label: { th: "งานตรงสกิล", en: "Job match" },
        hint: { th: "ประกาศงานที่ตรงกับสกิลของคุณ", en: "Job board match for your skills" },
      },
      {
        key: "anthem_job_application",
        label: { th: "ผู้สมัครงานใหม่", en: "New job application" },
        hint: { th: "เมื่อมีคนสมัครงานที่คุณประกาศ", en: "When someone applies to your job post" },
      },
      {
        key: "anthem_topup",
        label: { th: "เติม Pixel สำเร็จ", en: "Pixel top-up" },
        hint: { th: "ยืนยันการเติม px เข้ากระเป๋า", en: "Confirm px added to your wallet" },
      },
      {
        key: "anthem_cashout",
        label: { th: "ถอนเงิน / สถานะคำขอ", en: "Cashout updates" },
        hint: { th: "อัปเดตคำขอถอนและโอนเงิน", en: "Cashout request status updates" },
      },
    ],
  },
  {
    id: "inhouse",
    label: { th: "In-House Workspace", en: "In-House workspace" },
    description: {
      th: "คำเชิญทีม แชท และงานที่มอบหมายใน workspace",
      en: "Team invites, workspace chat, and task assignments",
    },
    kinds: [
      {
        key: "inhouse_invite",
        label: { th: "คำเชิญเข้าร่วมทีม", en: "Team invite" },
        hint: {
          th: "เมื่อ admin เชิญคุณเข้า org",
          en: "When an admin invites you to an org",
        },
      },
      {
        key: "inhouse_member_join",
        label: { th: "สมาชิกใหม่เข้าร่วม", en: "New member joined" },
        hint: {
          th: "เมื่อมีคนยอมรับคำเชิญของทีมคุณ",
          en: "When someone accepts your team invite",
        },
      },
      {
        key: "inhouse_chat",
        label: { th: "ข้อความใน workspace", en: "Workspace message" },
        hint: {
          th: "แชทในช่องของ workspace",
          en: "Messages in workspace channels",
        },
      },
      {
        key: "inhouse_task",
        label: { th: "มอบหมายงาน / due date", en: "Task assignment / due date" },
        hint: {
          th: "ถูก assign to-do หรือใกล้ครบกำหนด",
          en: "Assigned a task or due today",
        },
      },
    ],
  },
  {
    id: "system",
    label: { th: "ระบบและบัญชี", en: "Account & support" },
    description: {
      th: "การแจ้งเตือนจากระบบโดยตรง",
      en: "Notifications from So1o itself",
    },
    kinds: [
      {
        key: "support_ticket",
        label: { th: "ตั๋วซัพพอร์ต", en: "Support tickets" },
        hint: {
          th: "สถานะตั๋วช่วยเหลือ / ฟีดแบ็กเปลี่ยน",
          en: "Support or feedback ticket status changes",
        },
      },
      {
        key: "billing",
        label: { th: "การชำระเงินแพ็กเกจ", en: "Subscription billing" },
        hint: {
          th: "แจ้งเตือนเมื่อบัตรถูกปฏิเสธหรือใกล้หมดอายุ",
          en: "Card declined, renewal, or cancellation alerts",
        },
      },
    ],
  },
];

export function mergeLineNotifyPrefs(raw: unknown): Record<LineNotifyKind, boolean> {
  const base = { ...DEFAULT_LINE_NOTIFY_PREFS };
  if (!raw || typeof raw !== "object") return base;
  for (const key of Object.keys(base) as LineNotifyKind[]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "boolean") base[key] = v;
  }
  return base;
}

export function pickLocale(raw: unknown): UserLocale {
  return raw === "en" ? "en" : "th";
}
