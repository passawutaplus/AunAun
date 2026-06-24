// Smart Brief — central types + defaults
// Used by both the in-app editor and the public client-fill page

import { normalizeHexArray } from "@/lib/colorUtils";

export type BriefStatus = "draft" | "awaiting_client" | "awaiting_confirm" | "confirmed";

export interface BriefClientInfo {
  client_id?: string; // FK to saved_clients
  client_name?: string;
  brand_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_line?: string;
  /** Client's existing logo URL (for keeping designs on-brand) */
  logo_url?: string;
  /** A CI / brand reference image uploaded by the freelancer */
  ci_image_url?: string;
  /** Hex palette extracted from the CI image */
  ci_palette?: string[];
  /** Past works owned by the client (previous designs, marketing materials, etc.) */
  past_works?: BriefReference[];
}

export interface BriefScopeItem {
  name: string;
  quantity: number;
  note?: string;
}

export interface BriefProjectOverview {
  project_type?: string; // โลโก้ / แบรนดิ้ง / Social / เว็บ / อื่นๆ
  /** ระบุเองเมื่อ project_type = อื่นๆ */
  project_type_custom?: string;
  project_name?: string; // ชื่อโปรเจกต์ / หัวข้องาน
  about_business?: string;
  goal?: string;
  problem?: string;
  proposition?: string; // โจทย์ของลูกค้า / pain point (Quick Capture)
  element_design?: string; // โลโก้/สี/ฟอนต์ที่ลูกค้าให้มา (Quick Capture)
  style_name?: string; // ชื่อสไตล์งาน เช่น Y2K, Minimal, Brutalist
  scope_items?: BriefScopeItem[]; // รายการเนื้องาน เช่น โลโก้ x1, นามบัตร x2
}

export interface BriefAudience {
  gender?: string;
  age_range?: string;
  lifestyle?: string;
  interests?: string;
}

export interface BriefDesignDirection {
  moods?: string[]; // chips
  liked_colors?: string;
  forbidden_colors?: string;
  liked_color_chips?: string[]; // hex codes — ใช้คู่กับ swatch UI
  forbidden_color_chips?: string[]; // hex codes
  liked_fonts?: string;
  inspiration?: string;
}

export interface BriefTechSpecs {
  formats?: string[]; // .AI .PNG .PDF .SVG
  size?: string;
  usage?: string; // print / online / both
}

export interface BriefTimelineBudget {
  draft_date?: string; // YYYY-MM-DD
  deadline?: string;
  revisions?: number;
  budget?: string;
}

export interface BriefReference {
  url: string;
  name?: string;
  size?: number;
}

export interface BriefAiAnalysis {
  key_takeaways?: string;
  red_flags?: string;
  questions?: string;
  generated_at?: string;
}

export interface BriefOwnerPublic {
  display_name?: string | null;
  brand_name?: string | null;
  logo_url?: string | null;
  avatar_url?: string | null;
  tagline?: string | null;
  email?: string | null;
  phone?: string | null;
  social_link?: string | null;
}

export interface DesignBrief {
  id: string;
  user_id?: string;
  project_id?: string | null;
  share_token: string;
  title: string;
  status: BriefStatus;
  client_info: BriefClientInfo;
  project_overview: BriefProjectOverview;
  audience: BriefAudience;
  design_direction: BriefDesignDirection;
  tech_specs: BriefTechSpecs;
  timeline_budget: BriefTimelineBudget;
  notes: string;
  references: BriefReference[];
  ai_analysis?: BriefAiAnalysis | null;
  confirmed_at?: string | null;
  confirmed_by_name?: string | null;
  confirmed_signature?: string | null;
  created_at: string;
  updated_at: string;
  owner?: BriefOwnerPublic;
}

export const PROJECT_TYPES = [
  "โลโก้",
  "Branding / CI",
  "Social Media Post",
  "เว็บไซต์",
  "Packaging",
  "Illustration",
  "Motion / วิดีโอ",
  "Print / สิ่งพิมพ์",
  "อื่นๆ",
];

export const MOOD_OPTIONS = [
  "Minimal",
  "Luxury",
  "Playful",
  "Modern",
  "Vintage",
  "Bold",
  "Elegant",
  "Cute",
  "Tech / Futuristic",
  "Natural / Organic",
  "Dark Mode",
  "Pastel",
];

export const FORMAT_OPTIONS = [".AI", ".PSD", ".PNG", ".JPG", ".PDF", ".SVG", ".MP4", ".GIF"];

export const STATUS_LABEL: Record<BriefStatus, string> = {
  draft: "Draft",
  awaiting_client: "รอลูกค้ากรอก",
  awaiting_confirm: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
};

export const STATUS_TONE: Record<BriefStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_client: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  awaiting_confirm: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function emptyBrief(): Omit<
  DesignBrief,
  "id" | "share_token" | "created_at" | "updated_at"
> {
  return {
    title: "บรีฟใหม่",
    status: "draft",
    client_info: {},
    project_overview: {},
    audience: {},
    design_direction: { moods: [] },
    tech_specs: { formats: [] },
    timeline_budget: {},
    notes: "",
    references: [],
  };
}

// Canonical production domain — share links always point to the live site
// even when copied from preview/staging environments
const CANONICAL_BRIEF_BASE = "https://solofreelancer.com";

export function briefShareUrl(token: string, opts?: { review?: boolean }): string {
  const qs = opts?.review ? "?review=1" : "";
  return `${CANONICAL_BRIEF_BASE}/brief/${token}${qs}`;
}

/** Rough completeness 0-100 for progress bar */
export function briefCompleteness(
  b: Pick<
    DesignBrief,
    | "client_info"
    | "project_overview"
    | "audience"
    | "design_direction"
    | "tech_specs"
    | "timeline_budget"
  >,
): number {
  const checks: boolean[] = [
    !!b.client_info?.client_name,
    !!b.client_info?.brand_name,
    !!(b.client_info?.contact_email || b.client_info?.contact_phone || b.client_info?.contact_line),
    !!b.project_overview?.project_type,
    !!b.project_overview?.about_business,
    !!b.project_overview?.goal,
    !!b.audience?.age_range || !!b.audience?.lifestyle,
    !!(b.design_direction?.moods && b.design_direction.moods.length > 0),
    !!b.design_direction?.liked_colors,
    !!(b.tech_specs?.formats && b.tech_specs.formats.length > 0),
    !!b.tech_specs?.usage,
    !!b.timeline_budget?.deadline,
  ];
  const score = checks.filter(Boolean).length;
  return Math.round((score / checks.length) * 100);
}

/**
 * Sanitize a brief's design_direction color chip arrays — normalize hex,
 * drop invalid entries, dedupe. Idempotent. Always call on inbound DB rows
 * and before persisting.
 */
export function sanitizeBriefDesignDirection(
  dd: BriefDesignDirection | undefined | null,
): BriefDesignDirection {
  const src = dd ?? {};
  return {
    ...src,
    liked_color_chips: normalizeHexArray(src.liked_color_chips),
    forbidden_color_chips: normalizeHexArray(src.forbidden_color_chips),
  };
}
