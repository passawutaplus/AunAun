import type { CommunityPostKind, CommunityQuestionTopic } from "@/hooks/useCommunityPosts";

export type CommunityKindFilter = "all" | CommunityPostKind;

export const COMMUNITY_KIND_CHIPS: { id: CommunityKindFilter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "tip", label: "Tips" },
  { id: "question", label: "Q&A" },
];

export const QUESTION_TOPICS: {
  id: CommunityQuestionTopic;
  label: string;
  desc: string;
}[] = [
  { id: "feedback", label: "ขอ Feedback", desc: "ขอความคิดเห็นหรือ critique ผลงาน" },
  { id: "technique", label: "เทคนิค / Workflow", desc: "วิธีทำ ขั้นตอน หรือ process" },
  { id: "tools", label: "เครื่องมือ", desc: "ซอฟต์แวร์ ปลั๊กอิน หรือ setup" },
  { id: "career", label: "อาชีพ / ราคา", desc: "หางาน เรต หรือเส้นทางอาชีพ" },
  { id: "client", label: "ลูกค้า / Brief", desc: "การสื่อสาร brief หรือ revision" },
  { id: "inspiration", label: "ไอเดีย", desc: "แรงบันดาลใจ แนวทาง หรือ reference" },
  { id: "other", label: "อื่นๆ", desc: "คำถามทั่วไปเกี่ยวกับงานออกแบบ" },
];

export const questionTopicLabel = (id: CommunityQuestionTopic | null | undefined) =>
  QUESTION_TOPICS.find((t) => t.id === id)?.label ?? null;

export const COMMUNITY_FILTER_STORAGE_KEY = "anthem-community-feed-filter";

export type CommunityFeedFilter = {
  category: string;
  feedSource: "all" | "following" | "drill";
};

export const DEFAULT_COMMUNITY_FILTER: CommunityFeedFilter = {
  category: "All",
  feedSource: "all",
};

export function loadCommunityFilter(): CommunityFeedFilter {
  if (typeof window === "undefined") return DEFAULT_COMMUNITY_FILTER;
  try {
    const raw = localStorage.getItem(COMMUNITY_FILTER_STORAGE_KEY);
    if (!raw) return DEFAULT_COMMUNITY_FILTER;
    return { ...DEFAULT_COMMUNITY_FILTER, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COMMUNITY_FILTER;
  }
}

export function saveCommunityFilter(filter: CommunityFeedFilter) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMMUNITY_FILTER_STORAGE_KEY, JSON.stringify(filter));
  } catch {
    /* ignore */
  }
}
