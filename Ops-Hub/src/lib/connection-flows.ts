import { DEFERRED_ROADMAP } from "@/lib/ecosystem-roadmap-deferred";

export type ConnectionFlow = {
  id: string;
  label: string;
  direction: "anthem_to_so1o" | "so1o_to_anthem" | "other";
  description: string;
  status: "live" | "partial" | "planned";
  sourcePages: string[];
  roadmapId?: string;
};

function statusFromRoadmap(roadmapId: string): ConnectionFlow["status"] | undefined {
  const item = DEFERRED_ROADMAP.find((d) => d.id === roadmapId);
  if (!item) return undefined;
  if (item.status === "shipped") return "live";
  if (item.status === "stub") return "partial";
  return "planned";
}

const BASE_FLOWS: ConnectionFlow[] = [
  {
    id: "anthem_hire_quotation",
    label: "an1hem จ้าง → So1o ใบเสนอราคา",
    direction: "anthem_to_so1o",
    description: "Hire CTA + deep-link handoff ไป Quotations tab",
    status: "live",
    sourcePages: ["project_detail", "chat_header", "hire_panel"],
  },
  {
    id: "so1o_job_portfolio",
    label: "So1o งานเสร็จ → an1hem โพสต์ผลงาน",
    direction: "so1o_to_anthem",
    description: "PostToAnthemBanner จาก Job Tracker",
    status: "partial",
    sourcePages: ["job_tracker_post_anthem"],
    roadmapId: "post-loop",
  },
  {
    id: "pro_unified",
    label: "Pro ครั้งเดียว ใช้ทั้ง 2 แอป",
    direction: "other",
    description: "subscription_tier จาก profiles ร่วม",
    status: "live",
    sourcePages: [],
  },
  {
    id: "sso_cross_domain",
    label: "SSO ข้ามโดเมน",
    direction: "other",
    description: "คนละ cookie จนกว่า SSO จะ ship — ดู metrics",
    status: "planned",
    sourcePages: [],
    roadmapId: "sso",
  },
];

export const CONNECTION_FLOWS: ConnectionFlow[] = BASE_FLOWS.map((flow) => {
  if (!flow.roadmapId) return flow;
  const fromRoadmap = statusFromRoadmap(flow.roadmapId);
  return fromRoadmap ? { ...flow, status: fromRoadmap } : flow;
});

export function conversionRate(clicks: number, converted: number) {
  if (clicks <= 0) return 0;
  return Math.round((converted / clicks) * 100);
}

export function flowHealth(clicks: number, converted: number, stuck: number): "good" | "warn" | "bad" {
  if (clicks === 0) return "good";
  const rate = conversionRate(clicks, converted);
  if (stuck >= 5 && rate < 20) return "bad";
  if (rate < 15 || stuck >= 3) return "warn";
  return "good";
}
