import { ImagePlus, type LucideIcon } from "lucide-react";
import type { CommunityPostKind } from "@/hooks/useCommunityPosts";

export type CreateAction = {
  label: string;
  desc: string;
  icon: LucideIcon;
  to: string;
};

export const COMMUNITY_NEW_PATH = "/community/new";

export const COMMUNITY_KIND_INFO: Record<
  CommunityPostKind,
  { label: string; desc: string; titlePlaceholder: string; bodyPlaceholder: string }
> = {
  tip: {
    label: "Tips",
    desc: "แชร์เทคนิค ทริค หรือบทเรียนที่ช่วยให้คนอื่นทำงานได้ดีขึ้น",
    titlePlaceholder: "หัวข้อ เช่น วิธีจัด hierarchy ให้อ่านง่าย",
    bodyPlaceholder: "เล่าเทคนิค ขั้นตอน หรือสิ่งที่คุณเรียนรู้...",
  },
  question: {
    label: "Q&A",
    desc: "ถามคำถามหรือขอคำแนะนำจากชุมชนนักออกแบบ",
    titlePlaceholder: "คำถามของคุณ เช่น ควรใช้ฟอนต์แบบไหนกับแบรนด์ lifestyle",
    bodyPlaceholder: "อธิบายบริบทหรือรายละเอียดเพิ่มเติม...",
  },
};

/** @deprecated Use COMMUNITY_NEW_PATH — kind is chosen on the editor page. */
export const communityNewPath = (_kind?: CommunityPostKind) => COMMUNITY_NEW_PATH;

export const CREATE_ACTIONS: CreateAction[] = [
  { label: "ลงผลงาน", desc: "เผยแพร่ผลงานใหม่ลงพอร์ตโฟลิโอ", icon: ImagePlus, to: "/portfolio/new" },
  {
    label: "โพสชุมชน",
    desc: "แชร์เรื่องราว รูป หรือคำถามกับชุมชน",
    icon: ImagePlus,
    to: COMMUNITY_NEW_PATH,
  },
];

export const parseCommunityKind = (value: string | null): CommunityPostKind | null =>
  value === "tip" || value === "question" ? value : null;

export const communityNewPathWithKind = (kind: CommunityPostKind) =>
  `${COMMUNITY_NEW_PATH}?kind=${kind}`;
