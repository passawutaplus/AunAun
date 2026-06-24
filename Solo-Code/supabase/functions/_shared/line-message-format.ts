type LineNotifyKind =
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

export const LINE_NOTIFICATION_HEADER = "[So1o Freelancer Notification]";
export const ANTHEM_LINE_HEADER = "[Pixel100 Notification]";

const ANTHEM_KINDS = new Set<string>([
  "anthem_hire",
  "anthem_chat",
  "anthem_job_match",
  "anthem_collab",
  "anthem_gift",
  "anthem_follow",
  "anthem_job_application",
  "anthem_topup",
  "anthem_cashout",
]);

function lineHeader(kind: LineNotifyKind): string {
  return ANTHEM_KINDS.has(kind) ? ANTHEM_LINE_HEADER : LINE_NOTIFICATION_HEADER;
}

const SOLO_BASE = (Deno.env.get("SOLO_SITE_URL") ?? "https://solofreelancer.com").replace(
  /\/$/,
  "",
);
const ANTHEM_BASE = (Deno.env.get("ANTHEM_APP_URL") ?? "https://pixel100.com").replace(/\/$/, "");

type KindCopy = {
  hook: string;
  cta: string;
  path: string;
  app: "solo" | "anthem";
};

const LINE_KIND_COPY: Record<LineNotifyKind, KindCopy> = {
  portal_slip: {
    hook: "ลูกค้าชำระเงินแล้ว 💸",
    cta: "ไปตรวจสลิปกันเล้ยย",
    path: "/dashboard?tab=finance&sub=jobs",
    app: "solo",
  },
  portal_tracker_comment: {
    hook: "มีคอมเมนต์ใหม่ในงาน!!",
    cta: "ไปตอบลูกค้ากันต่อเล้ยย",
    path: "/dashboard?tab=finance&sub=jobs",
    app: "solo",
  },
  portal_brief: {
    hook: "ลูกค้ายืนยันบรีฟแล้ว!!",
    cta: "ไปดูบรีฟแล้วลุยต่อเลยย",
    path: "/dashboard?tab=planner&sub=briefs",
    app: "solo",
  },
  portal_planner: {
    hook: "ลูกค้าตอบคอนเทนต์แล้ว!!",
    cta: "ไปจัดการคอนเทนต์กันต่อเล้ยย",
    path: "/dashboard?tab=planner&sub=content",
    app: "solo",
  },
  portal_quotation: {
    hook: "มีอัปเดตใบเสนอราคา!!",
    cta: "ไปดูใบเสนอราคากันต่อเล้ยย",
    path: "/dashboard?tab=finance&sub=quotations",
    app: "solo",
  },
  anthem_hire: {
    hook: "มีงานใหม่เข้ามาแล้ว!!",
    cta: "ไปตอบคำขอจ้างกันเล้ยย",
    path: "/dashboard?tab=overview",
    app: "solo",
  },
  anthem_chat: {
    hook: "มีข้อความใหม่ในแชท!!",
    cta: "ไปตอบแชทกันต่อเล้ยย",
    path: "/chat",
    app: "anthem",
  },
  anthem_job_match: {
    hook: "พบงานตรงสกิลของคุณ!!",
    cta: "ไปดูงานแล้วลุยต่อเลยย",
    path: "/jobs",
    app: "anthem",
  },
  anthem_collab: {
    hook: "มีคนอยากร่วมงานกับคุณ!!",
    cta: "ไปดูคำขอคอลแลปเลย",
    path: "/portfolio/manage?focus=collab",
    app: "anthem",
  },
  anthem_gift: {
    hook: "มีของขวัญ PX เข้ามา!!",
    cta: "ไปดูของขวัญที่ได้รับ",
    path: "/earnings",
    app: "anthem",
  },
  anthem_follow: {
    hook: "มีผู้ติดตามใหม่!!",
    cta: "ไปดูโปรไฟล์ของคุณ",
    path: "/portfolio/manage",
    app: "anthem",
  },
  anthem_job_application: {
    hook: "มีผู้สมัครงานใหม่!!",
    cta: "ไปดูใบสมัครงาน",
    path: "/jobs",
    app: "anthem",
  },
  anthem_topup: {
    hook: "เติม Pixel สำเร็จแล้ว!!",
    cta: "ไปดูกระเป๋า px",
    path: "/earnings",
    app: "anthem",
  },
  anthem_cashout: {
    hook: "อัปเดตคำขอถอนเงินแล้ว",
    cta: "ไปดูรายละเอียดที่ Earnings",
    path: "/earnings",
    app: "anthem",
  },
  inhouse_invite: {
    hook: "มีคำเชิญเข้าร่วมทีม!!",
    cta: "ไปดูคำเชิญกันเล้ยย",
    path: "/inhouse",
    app: "solo",
  },
  inhouse_member_join: {
    hook: "มีสมาชิกใหม่เข้าร่วมทีม!!",
    cta: "ไปดูทีมกันต่อเล้ยย",
    path: "/inhouse",
    app: "solo",
  },
  inhouse_chat: {
    hook: "มีข้อความใหม่ใน workspace!!",
    cta: "ไปตอบแชทกันต่อเล้ยย",
    path: "/inhouse",
    app: "solo",
  },
  inhouse_task: {
    hook: "มีงานมอบหมายให้คุณ!!",
    cta: "ไปดูงานกันต่อเล้ยย",
    path: "/inhouse",
    app: "solo",
  },
  support_ticket: {
    hook: "อัปเดตตั๋วช่วยเหลือแล้ว",
    cta: "ไปเช็กสถานะกันต่อเล้ยย",
    path: "/dashboard?tab=settings",
    app: "solo",
  },
  billing: {
    hook: "อัปเดตการชำระเงินแล้ว",
    cta: "ไปดูบัญชีต่อได้เลยย",
    path: "/dashboard?tab=settings",
    app: "solo",
  },
};

export function lineNotificationLink(kind: LineNotifyKind, overridePath?: string): string {
  const copy = LINE_KIND_COPY[kind];
  const path = overridePath ?? copy.path;
  const base = copy.app === "anthem" ? ANTHEM_BASE : SOLO_BASE;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type LinePersonalization = {
  displayName?: string | null;
  brandName?: string | null;
};

export function formatPersonalLine(opts?: LinePersonalization): string | null {
  const brand = opts?.brandName?.trim();
  const rawName = opts?.displayName?.trim();
  const name = rawName ? (rawName.startsWith("คุณ") ? rawName : `คุณ${rawName}`) : null;

  if (brand && name) return `${brand} (${name})`;
  if (brand) return brand;
  if (name) return name;
  return null;
}

export function formatLineNotification(
  kind: LineNotifyKind,
  body: string,
  opts?: { link?: string } & LinePersonalization,
): string {
  const copy = LINE_KIND_COPY[kind];
  const url = opts?.link ?? lineNotificationLink(kind);
  const detail = body.trim();
  const personal = formatPersonalLine(opts);

  const lines = [copy.hook, "", lineHeader(kind), detail, ""];
  if (personal) lines.push(personal);
  lines.push(copy.cta, url);
  return lines.join("\n");
}
