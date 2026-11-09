import { demoImageUrl } from "@/lib/demoImages";
import { COMMON, formatDateRange, getLang, tr, type Entry, type Lang } from "@/lib/i18n";
import { EXHIBITION_SHARED as S } from "@/lib/i18n/exhibition/shared";

/** Exhibition & events (anthem.events). Writes go through the event_* RPCs; see the migration for the rules. */
export const EVENT_CATEGORIES = [
  { id: "exhibition", label: "Exhibition", th: "นิทรรศการ" },
  { id: "workshop", label: "Workshop", th: "เวิร์กช็อป" },
  { id: "art_fair", label: "Art Fair", th: "อาร์ตแฟร์" },
  { id: "talk_forum", label: "Talk & Forum", th: "ทอล์ก & ฟอรัม" },
  { id: "open_call", label: "Open Call", th: "เปิดรับผลงาน" },
  { id: "other", label: "Other", th: "อื่น ๆ" },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number]["id"];
export type EventStatus = "draft" | "pending" | "published" | "needs_revision" | "rejected";
/** What the owner and the public see: a published event whose last day has passed is "ended". */
export type EventDisplayStatus = EventStatus | "ended";

export type EventSponsor = { name: string; logo_url?: string; note?: string };

/** "unspecified" is only set by the team for curated events whose source does not say. */
export type EventFeeType = "free" | "paid" | "unspecified";

/** Who put the event on SameCor: our own event, a member's submission, or one the team found elsewhere. */
export type EventOrigin = "original" | "community" | "curated";

/** Team panel text (Thai UI shows these English names). Public UI: use originLabel(). */
export const EVENT_ORIGIN_LABEL: Record<EventOrigin, string> = {
  original: "Organized by SAMECOR",
  community: "Submitted by Community",
  curated: "Curated by SAMECOR",
};

const ORIGIN_ENTRY: Record<EventOrigin, Entry> = {
  original: S.originOriginal,
  community: S.originCommunity,
  curated: S.originCurated,
};

/** Origin tag in the UI language. */
export function originLabel(origin: EventOrigin, lang: Lang = getLang()): string {
  return tr(ORIGIN_ENTRY[origin] ?? S.originCommunity, undefined, lang);
}

/** Shown wherever a curated source did not state a value. We never guess. Thai constant; UI: notSpecified(). */
export const NOT_SPECIFIED = "ไม่ระบุ";

/** "ไม่ระบุ" / "Not specified" / "未注明" in the UI language. */
export function notSpecified(lang: Lang = getLang()): string {
  return tr(COMMON.notSpecified, undefined, lang);
}

export type ExhibitionEvent = {
  id: string;
  owner_id: string;
  title: string;
  category: EventCategory;
  starts_on: string | null;
  ends_on: string | null;
  time_note: string | null;
  location_name: string | null;
  location_note: string | null;
  description: string;
  organizer_name: string | null;
  cover_url: string | null;
  gallery_urls: string[];
  website_url: string | null;
  registration_url: string | null;
  ticket_url: string | null;
  registration_open: boolean;
  fee_type: EventFeeType;
  fee_note: string | null;
  sponsors: EventSponsor[];
  open_for_sponsors: boolean;
  project_ids: string[];
  origin: EventOrigin;
  source_name: string | null;
  source_url: string | null;
  source_checked_at: string | null;
  status: EventStatus;
  review_note: string | null;
  submitted_at: string | null;
  published_at: string | null;
  is_pick: boolean;
  updated_at: string;
};

/** Fields the owner edits; sent as the `_data` JSON of event_save. */
export type EventDraft = Omit<
  ExhibitionEvent,
  | "id"
  | "owner_id"
  | "status"
  | "review_note"
  | "submitted_at"
  | "published_at"
  | "is_pick"
  | "updated_at"
  | "origin"
  | "source_name"
  | "source_url"
  | "source_checked_at"
>;

/** What the team edits for its own (original / curated) events; sent to admin_event_save. */
export type TeamEventDraft = EventDraft & {
  origin: Exclude<EventOrigin, "community">;
  source_name: string | null;
  source_url: string | null;
};

export const EVENT_SELECT =
  "id, owner_id, title, category, starts_on, ends_on, time_note, location_name, location_note, description, organizer_name, cover_url, gallery_urls, website_url, registration_url, ticket_url, registration_open, fee_type, fee_note, sponsors, open_for_sponsors, project_ids, origin, source_name, source_url, source_checked_at, status, review_note, submitted_at, published_at, is_pick, updated_at";

export const EVENT_LIMITS = {
  title: 100,
  description: 2000,
  gallery: 8,
  sponsors: 5,
  sponsorName: 80,
  sponsorNote: 120,
  projects: 6,
  pending: 5,
} as const;

export function emptyEventDraft(): EventDraft {
  return {
    title: "",
    category: "exhibition",
    starts_on: null,
    ends_on: null,
    time_note: null,
    location_name: null,
    location_note: null,
    description: "",
    organizer_name: null,
    cover_url: null,
    gallery_urls: [],
    website_url: null,
    registration_url: null,
    ticket_url: null,
    registration_open: false,
    fee_type: "free",
    fee_note: null,
    sponsors: [],
    open_for_sponsors: false,
    project_ids: [],
  };
}

export type EventActionKind = "tickets" | "apply" | "workshop" | "register";
export type EventAction = { label: string; url: string; kind: EventActionKind };

const ACTION_ENTRY: Record<EventActionKind, Entry> = {
  tickets: S.ctaTickets,
  apply: S.ctaApply,
  workshop: S.ctaWorkshop,
  register: S.ctaRegister,
};

/**
 * The main button on an event page: buy tickets for paid events with a ticket page, Apply for open calls,
 * otherwise register. Null when there is no link to send people to (the page then says "not specified").
 */
export function eventPrimaryAction(
  e: Pick<ExhibitionEvent, "category" | "fee_type" | "registration_url" | "ticket_url" | "registration_open">,
  lang: Lang = getLang(),
): EventAction | null {
  const act = (kind: EventActionKind, url: string): EventAction => ({ kind, url, label: tr(ACTION_ENTRY[kind], undefined, lang) });
  if (e.ticket_url && e.fee_type !== "free") return act("tickets", e.ticket_url);
  if (e.registration_url && e.registration_open) {
    if (e.category === "open_call") return act("apply", e.registration_url);
    if (e.category === "workshop") return act("workshop", e.registration_url);
    return act("register", e.registration_url);
  }
  if (e.ticket_url) return act("tickets", e.ticket_url);
  return null;
}

export function feeLabel(e: Pick<ExhibitionEvent, "fee_type" | "fee_note">, lang: Lang = getLang()): string {
  if (e.fee_type === "free") return tr(S.feeFree, undefined, lang);
  if (e.fee_type === "paid") return e.fee_note ? tr(S.feePaidNote, { note: e.fee_note }, lang) : tr(S.feePaid, undefined, lang);
  return tr(S.feeUnspecified, { ns: notSpecified(lang) }, lang);
}

const CATEGORY_ENTRY: Record<EventCategory, Entry> = {
  exhibition: S.catExhibition,
  workshop: S.catWorkshop,
  art_fair: S.catArtFair,
  talk_forum: S.catTalkForum,
  open_call: S.catOpenCall,
  other: S.catOther,
};

/** Category name in the UI language ("Event" for an unknown id). Thai keeps the English names shown today. */
export function categoryLabel(id: string, lang: Lang = getLang()): string {
  return tr(CATEGORY_ENTRY[id as EventCategory] ?? S.catEvent, undefined, lang);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isEventEnded(e: Pick<ExhibitionEvent, "ends_on">): boolean {
  return !!e.ends_on && e.ends_on < todayIso();
}

export type EventTiming = "now" | "soon" | "done";

/** Now = running today, Soon = not started yet (or no start date), Done = ended. */
export function eventTiming(e: Pick<ExhibitionEvent, "starts_on" | "ends_on">): EventTiming {
  if (isEventEnded(e)) return "done";
  return e.starts_on && e.starts_on <= todayIso() ? "now" : "soon";
}

export function eventDisplayStatus(e: Pick<ExhibitionEvent, "status" | "ends_on">): EventDisplayStatus {
  return e.status === "published" && isEventEnded(e) ? "ended" : e.status;
}

export const EVENT_STATUS_LABEL: Record<EventDisplayStatus, { label: string; th: string; dot: string }> = {
  draft: { label: "Draft", th: "ยังไม่ส่ง", dot: "bg-muted-foreground/50" },
  pending: { label: "Pending Review", th: "รอตรวจสอบ", dot: "bg-amber-500" },
  published: { label: "Published", th: "เผยแพร่แล้ว", dot: "bg-emerald-500" },
  needs_revision: { label: "Needs Revision", th: "ต้องแก้ไข", dot: "bg-destructive" },
  rejected: { label: "Not Approved", th: "ไม่ผ่านการตรวจ", dot: "bg-foreground" },
  ended: { label: "Ended", th: "งานจบแล้ว", dot: "bg-foreground/40" },
};

/** "15 – 28 พ.ย. 2569" / "15 Nov – 28 Dec 2026" / "2026年11月15日 – 12月28日", in the UI language. "" without a start. */
export function formatEventDates(starts?: string | null, ends?: string | null, lang: Lang = getLang()): string {
  if (!starts) return "";
  return formatDateRange(starts, ends, lang);
}

/** Published events for the public list: picks first, then running/upcoming by start date, ended last. */
export function sortPublicEvents(rows: ExhibitionEvent[]): ExhibitionEvent[] {
  return [...rows].sort((x, y) => {
    const ex = isEventEnded(x) ? 1 : 0;
    const ey = isEventEnded(y) ? 1 : 0;
    if (ex !== ey) return ex - ey;
    if (x.is_pick !== y.is_pick) return x.is_pick ? -1 : 1;
    return (x.starts_on ?? "").localeCompare(y.starts_on ?? "");
  });
}

/** Missing required fields, in form order — empty when the event can be submitted. */
export function missingForSubmit(d: Pick<EventDraft, "title" | "starts_on" | "ends_on" | "location_name" | "description" | "cover_url">): string[] {
  const missing: string[] = [];
  if (!d.title.trim()) missing.push("ชื่องาน");
  if (!d.starts_on || !d.ends_on) missing.push("วันที่");
  if (!d.location_name?.trim()) missing.push("สถานที่");
  if (!d.description.trim()) missing.push("รายละเอียด");
  if (!d.cover_url) missing.push("รูปปก");
  return missing;
}

// ── Development preview data ─────────────────────────────────────────────────
// Shown only in `vite dev` when the events table is missing or empty, so the pages can be reviewed
// before the migration is applied. Never part of a production build path.
const DEMO_OWNER = "00000000-0000-0000-0000-00000000demo";

function demo(partial: Partial<ExhibitionEvent> & Pick<ExhibitionEvent, "id" | "title" | "category">): ExhibitionEvent {
  return {
    ...emptyEventDraft(),
    owner_id: DEMO_OWNER,
    status: "published",
    review_note: null,
    submitted_at: "2026-11-01T09:00:00Z",
    published_at: "2026-11-02T09:00:00Z",
    is_pick: false,
    updated_at: "2026-11-02T09:00:00Z",
    origin: "community",
    source_name: null,
    source_url: null,
    source_checked_at: null,
    ...partial,
  };
}

export const DEMO_EVENTS: ExhibitionEvent[] = [
  demo({
    id: "demo-creative-visions",
    title: "Creative Visions 2026",
    category: "exhibition",
    starts_on: "2026-11-15",
    ends_on: "2026-12-28",
    time_note: "10:00 – 20:00 (ปิดวันจันทร์)",
    location_name: "Riverside Art Space, Bangkok",
    location_note: "ชั้น 3 · ใกล้ BTS สะพานตากสิน",
    description:
      "นิทรรศการที่รวมศิลปิน นักออกแบบ และครีเอเตอร์รุ่นใหม่ เพื่อสำรวจมุมมองใหม่ของศิลปะร่วมสมัย ตั้งแต่ภาพวาด งานจัดวาง ไปจนถึงสื่อแบบอินเทอร์แอคทีฟ\n\nชวนมาดูว่าความคิดใหม่ ๆ เปลี่ยนวิธีที่เรามองโลกรอบตัวได้อย่างไร",
    organizer_name: "Riverside Art Collective",
    cover_url: demoImageUrl(3),
    gallery_urls: [demoImageUrl(3), demoImageUrl(7), demoImageUrl(11), demoImageUrl(15)],
    website_url: "https://example.com/creative-visions",
    registration_url: "https://example.com/creative-visions/rsvp",
    registration_open: true,
    fee_type: "free",
    sponsors: [
      { name: "Northlight Studio", note: "สนับสนุนระบบไฟนิทรรศการ" },
      { name: "Paper & Ink Co.", note: "สนับสนุนงานพิมพ์" },
    ],
    open_for_sponsors: true,
    is_pick: true,
  }),
  demo({
    id: "demo-risograph-workshop",
    title: "Risograph Printing Workshop",
    category: "workshop",
    starts_on: "2026-12-06",
    ends_on: "2026-12-06",
    time_note: "13:00 – 17:00",
    location_name: "Makers Room, Chiang Mai",
    description:
      "เวิร์กช็อปพิมพ์ริโซกราฟครึ่งวัน ตั้งแต่แยกสี ทำเพลต จนพิมพ์โปสเตอร์ของตัวเองกลับบ้าน เหมาะกับนักออกแบบกราฟิกและนักวาดภาพประกอบ ไม่ต้องมีพื้นฐาน",
    organizer_name: "Makers Room",
    cover_url: demoImageUrl(5),
    gallery_urls: [demoImageUrl(5), demoImageUrl(9), demoImageUrl(13)],
    registration_url: "https://example.com/riso-workshop",
    registration_open: true,
    fee_type: "paid",
    fee_note: "฿1,500 รวมวัสดุ",
  }),
  demo({
    id: "demo-design-talk",
    title: "Design for Real Life — Talk Series",
    category: "talk_forum",
    starts_on: "2026-11-22",
    ends_on: "2026-11-22",
    time_note: "18:30 – 20:30",
    location_name: "Online + Common Ground, Bangkok",
    description:
      "ทอล์กชวนคุยเรื่องการออกแบบที่ใช้ได้จริงในชีวิตประจำวัน จากนักออกแบบผลิตภัณฑ์ UX และกราฟิก 3 คน ตามด้วยช่วงถาม-ตอบ",
    organizer_name: "Common Ground Design Club",
    website_url: "https://example.com/design-talk",
    registration_url: "https://www.eventbrite.com/e/design-for-real-life",
    registration_open: true,
    fee_type: "unspecified",
    origin: "curated",
    source_name: "Common Ground Design Club",
    source_url: "https://example.com/design-talk",
    source_checked_at: "2026-11-03T06:00:00Z",
  }),
];

export function isDemoEventId(id: string | undefined): boolean {
  return !!id && id.startsWith("demo-");
}

/** "สรุปโดย SAMECOR": short lists written from the organiser's page; null when not prepared yet. */
export type EventLinkKind = "download" | "form" | "rules" | "register" | "tickets" | "info";
export type EventInsightLink = { label: string; url: string; kind: EventLinkKind };

export type EventInsights = {
  who_for: string[];
  takeaways: string[];
  know_before: string[];
  /** SAMECOR work categories (projects.category) for the related-works row. */
  related_categories: string[];
  /** Ordered steps: apply (open call), book (workshop), register (talk). */
  steps: string[];
  eligibility: string[];
  /** Prizes (contests) or what selected applicants get. */
  benefits: string[];
  /** What to bring / prepare (workshops). */
  bring: string[];
  speakers: string[];
  /** Programme times, or rounds / ticket sessions. */
  schedule: string[];
  highlights: string[];
  capacity: string | null;
  /** Closing date (YYYY-MM-DD) when it differs from ends_on. */
  deadline: string | null;
  /** Buttons that say exactly what they open — only links from the organiser's page. */
  links: EventInsightLink[];
};

export const EVENT_INSIGHT_KEYS = ["who_for", "takeaways", "know_before"] as const;

/**
 * List keys with their limits. The three summary lists show two lines each (owner, 2026-11-06: more read as
 * repetition); the database still accepts up to 5 / 4 / 5 (anthem.event_insights_clean), extra lines are hidden.
 */
export const EVENT_INSIGHT_LISTS = {
  who_for: 2,
  takeaways: 2,
  know_before: 2,
  related_categories: 4,
  steps: 8,
  eligibility: 5,
  benefits: 5,
  bring: 6,
  speakers: 8,
  schedule: 8,
  highlights: 6,
} as const;
export type EventInsightListKey = keyof typeof EVENT_INSIGHT_LISTS;

export const EVENT_LINK_KINDS: Record<EventLinkKind, string> = {
  download: "ดาวน์โหลด",
  form: "แบบฟอร์มสมัคร",
  rules: "กติกา",
  register: "ลงทะเบียน",
  tickets: "ซื้อบัตร / จอง",
  info: "รายละเอียด",
};

const LINK_KIND_ENTRY: Record<EventLinkKind, Entry> = {
  download: S.linkDownload,
  form: S.linkForm,
  rules: S.linkRules,
  register: S.linkRegister,
  tickets: S.linkTickets,
  info: S.linkInfo,
};

/** Link kind name in the UI language (EVENT_LINK_KINDS stays the Thai list for the team editor). */
export function linkKindLabel(kind: EventLinkKind, lang: Lang = getLang()): string {
  return tr(LINK_KIND_ENTRY[kind] ?? S.linkInfo, undefined, lang);
}

const LINK_KINDS = Object.keys(EVENT_LINK_KINDS) as EventLinkKind[];
const SHORTENERS = /^(bit\.ly|bitly\.com|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|tiny\.cc|rb\.gy|lnkd\.in|s\.id|v\.gd|clck\.ru|adf\.ly|bc\.vc)$/i;

/** https only, no link shorteners (same list as anthem.event_link_ok). */
export function isSafeEventLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !SHORTENERS.test(u.hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

/** Accessible button text: "ดาวน์โหลด: <label>" — the kind in the UI language, then the organiser's label. */
export function eventLinkText(l: Pick<EventInsightLink, "label" | "kind">, lang: Lang = getLang()): string {
  return tr(S.linkText, { kind: linkKindLabel(l.kind, lang), label: l.label }, lang);
}

export function parseEventInsights(raw: unknown): EventInsights | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const list = (v: unknown, max: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()).slice(0, max) : [];
  const lists = Object.fromEntries(
    (Object.entries(EVENT_INSIGHT_LISTS) as [EventInsightListKey, number][]).map(([k, max]) => [k, list(r[k], max)]),
  ) as Record<EventInsightListKey, string[]>;
  const links = (Array.isArray(r.links) ? r.links : [])
    .filter(
      (l): l is EventInsightLink =>
        !!l &&
        typeof l === "object" &&
        typeof (l as EventInsightLink).label === "string" &&
        (l as EventInsightLink).label.trim() !== "" &&
        typeof (l as EventInsightLink).url === "string" &&
        isSafeEventLink((l as EventInsightLink).url) &&
        LINK_KINDS.includes((l as EventInsightLink).kind),
    )
    .slice(0, 6)
    .map((l) => ({ label: l.label.trim(), url: l.url, kind: l.kind }));
  const capacity = typeof r.capacity === "string" && r.capacity.trim() ? r.capacity.trim() : null;
  const deadline = typeof r.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.deadline) ? r.deadline : null;
  const out: EventInsights = { ...lists, capacity, deadline, links };
  const any = Object.values(lists).some((v) => v.length > 0) || capacity || deadline || links.length > 0;
  return any ? out : null;
}

/** "ปิดรับใน 32 วัน" / "ปิดรับพรุ่งนี้" / "ปิดรับวันนี้" / "ปิดรับแล้ว", by Bangkok date. Null without a date. */
export function deadlineLabel(iso: string | null | undefined, now: Date = new Date(), lang: Lang = getLang()): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86_400_000;
  const today = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  const n = day(iso) - day(today);
  if (n < 0) return tr(S.deadlineClosed, undefined, lang);
  if (n === 0) return tr(S.deadlineToday, undefined, lang);
  if (n === 1) return tr(S.deadlineTomorrow, undefined, lang);
  return tr(S.deadlineInDays, { n }, lang);
}
