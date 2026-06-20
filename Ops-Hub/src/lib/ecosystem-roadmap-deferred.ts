export type DeferredRoadmapItem = {
  id: string;
  title: string;
  status: "stub" | "deferred" | "shipped";
  note: string;
  quarter: string;
};

/** From docs/ECOSYSTEM_ROADMAP.md Phase 4 deferred items. */
export const DEFERRED_ROADMAP: DeferredRoadmapItem[] = [
  {
    id: "post-loop",
    title: "ปิดลูปโพสต์ผลงาน",
    status: "stub",
    note: "PostToAnthemBanner → /portfolio/new?from=so1o",
    quarter: "2026-Q3",
  },
  {
    id: "boost",
    title: "Boost/โฆษณาผลงาน",
    status: "shipped",
    note: "Self-serve post_boosts + Stripe boost_* checkout",
    quarter: "2026-Q2",
  },
  {
    id: "sso",
    title: "SSO ข้ามโดเมน",
    status: "deferred",
    note: "parallel กับ unified profiles",
    quarter: "2026-Q4",
  },
  {
    id: "live-work",
    title: "ไลฟ์ทำงาน",
    status: "deferred",
    note: "scope แยก",
    quarter: "2027-Q1",
  },
  {
    id: "escrow",
    title: "Escrow marketplace",
    status: "shipped",
    note: "marketplace_escrows + /pay/:token + Connect release",
    quarter: "2026-Q2",
  },
  {
    id: "pro-plus-auto",
    title: "Ecosystem auto-link Pro+",
    status: "deferred",
    note: "Brief จากแชท → CRM + Quote draft",
    quarter: "2026-Q4",
  },
  {
    id: "inhouse",
    title: "In-House workspace",
    status: "shipped",
    note: "org, invites, kanban, chat — MVP shipped",
    quarter: "2026-Q2",
  },
  {
    id: "gifts-cashout",
    title: "Gifts/PX cashout",
    status: "shipped",
    note: "Stripe Connect + admin transfer",
    quarter: "2026-Q2",
  },
];
