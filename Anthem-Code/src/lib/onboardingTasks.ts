import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Compass,
  Heart,
  LayoutGrid,
  Share2,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import type { OnboardingVisitId } from "@/lib/onboardingStorage";

export type OnboardingTaskId =
  | "profile"
  | "explore_feed"
  | "publish_project"
  | "skills"
  | "follow"
  | "like"
  | "jobs"
  | "share_profile";

export type MissionDifficulty = "easy" | "medium" | "hard";

export type OnboardingTaskDef = {
  id: OnboardingTaskId;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  rewardPx: number;
  difficulty: MissionDifficulty;
  visitId?: OnboardingVisitId;
};

export const WELCOME_PX_CAP = 100;

export const ONBOARDING_TASKS: OnboardingTaskDef[] = [
  {
    id: "explore_feed",
    title: "สำรวจฟีดผลงาน",
    description: "เปิดหน้าแรกดูผลงานและโหมดต่าง ๆ ในชุมชน",
    href: "/",
    icon: Compass,
    rewardPx: 8,
    difficulty: "easy",
    visitId: "explore_feed",
  },
  {
    id: "like",
    title: "กดถูกใจผลงาน",
    description: "กดหัวใจผลงานที่ชอบในฟีด",
    href: "/",
    icon: Heart,
    rewardPx: 8,
    difficulty: "easy",
  },
  {
    id: "follow",
    title: "ติดตามครีเอเตอร์",
    description: "ติดตามดีไซเนอร์ที่ชอบจากฟีดหรือแท็บ Designers",
    href: "/?mode=designers",
    icon: Sparkles,
    rewardPx: 10,
    difficulty: "easy",
  },
  {
    id: "jobs",
    title: "ดูบอร์ดงาน",
    description: "สำรวจประกาศงานและโอกาสรับจ้าง",
    href: "/jobs",
    icon: Briefcase,
    rewardPx: 10,
    difficulty: "easy",
    visitId: "jobs",
  },
  {
    id: "skills",
    title: "ใส่ทักษะ",
    description: "บอกว่าคุณถนัดอะไร — ช่วยให้ลูกค้าจับคู่ได้ตรง",
    href: "/settings",
    icon: Wrench,
    rewardPx: 12,
    difficulty: "medium",
  },
  {
    id: "share_profile",
    title: "แชร์ลิงก์โปรไฟล์",
    description: "คัดลอกลิงก์ @username ส่งให้ลูกค้าหรือเพื่อน",
    href: "/portfolio",
    icon: Share2,
    rewardPx: 14,
    difficulty: "medium",
    visitId: "share_profile",
  },
  {
    id: "profile",
    title: "ตั้งโปรไฟล์ให้พร้อม",
    description: "ใส่รูปโปรไฟล์ username และแนะนำตัวอย่างน้อย 20 ตัวอักษร",
    href: "/settings",
    icon: User,
    rewardPx: 16,
    difficulty: "medium",
  },
  {
    id: "publish_project",
    title: "เผยแพร่ผลงานชิ้นแรก",
    description: "ลงผลงานและตั้งสถานะ Published เพื่อโชว์ในฟีด",
    href: "/portfolio/new",
    icon: LayoutGrid,
    rewardPx: 22,
    difficulty: "hard",
  },
];

export type OnboardingSignals = {
  hasAvatar: boolean;
  hasUsername: boolean;
  bioLength: number;
  skillsCount: number;
  publishedCount: number;
  followCount: number;
  likeCount: number;
  visits: Partial<Record<OnboardingVisitId, boolean>>;
};

export function isTaskDone(id: OnboardingTaskId, s: OnboardingSignals): boolean {
  switch (id) {
    case "profile":
      return s.hasAvatar && s.hasUsername && s.bioLength >= 20;
    case "explore_feed":
      return !!s.visits.explore_feed;
    case "publish_project":
      return s.publishedCount >= 1;
    case "skills":
      return s.skillsCount >= 1;
    case "follow":
      return s.followCount >= 1;
    case "like":
      return s.likeCount >= 1;
    case "jobs":
      return !!s.visits.jobs;
    case "share_profile":
      return !!s.visits.share_profile;
    default:
      return false;
  }
}
