import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  Compass,
  Heart,
  LayoutGrid,
  MessageSquarePlus,
  Orbit,
  Share2,
  Sparkles,
  User,
  Users,
  Wrench,
} from "lucide-react";
import type { OnboardingVisitId } from "@/lib/onboardingStorage";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";

export type OnboardingTaskId =
  | "profile"
  | "explore_feed"
  | "explore_community"
  | "explore_designers"
  | "explore_studios"
  | "publish_project"
  | "post_community"
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

/** Fallback cap — production reads shared.gift_limits_config.welcome_px_cap (100). */
export const WELCOME_PX_CAP = 100;

export const ONBOARDING_TASKS: OnboardingTaskDef[] = [
  {
    id: "explore_feed",
    title: "สำรวจฟีดผลงาน",
    description: "เปิดแท็บ Projects ในหน้าแรก",
    href: "/",
    icon: Compass,
    rewardPx: 6,
    difficulty: "easy",
    visitId: "explore_feed",
  },
  {
    id: "explore_community",
    title: "สำรวจ Area",
    description: "เปิดแท็บ Area ดูโพสต์ในชุมชน",
    href: "/?mode=community",
    icon: Orbit,
    rewardPx: 6,
    difficulty: "easy",
    visitId: "explore_community",
  },
  {
    id: "explore_designers",
    title: "สำรวจ Designers",
    description: "เปิดแท็บ Designers ค้นหาครีเอเตอร์",
    href: "/?mode=designers",
    icon: Users,
    rewardPx: 6,
    difficulty: "easy",
    visitId: "explore_designers",
  },
  {
    id: "explore_studios",
    title: "สำรวจ Studios",
    description: "เปิดแท็บ Studios ดูสตูดิโอ",
    href: "/?mode=studios",
    icon: Building2,
    rewardPx: 6,
    difficulty: "easy",
    visitId: "explore_studios",
  },
  {
    id: "like",
    title: "กดหัวใจผลงานและโพสต์",
    description: "กดหัวใจอย่างน้อย 1 ผลงานในฟีด Projects และ 1 โพสต์ใน Area",
    href: "/?mode=community",
    icon: Heart,
    rewardPx: 6,
    difficulty: "easy",
  },
  {
    id: "follow",
    title: "ติดตามครีเอเตอร์",
    description: "ติดตามดีไซเนอร์ที่ชอบจากฟีดหรือแท็บ Designers",
    href: "/?mode=designers",
    icon: Sparkles,
    rewardPx: 8,
    difficulty: "easy",
  },
  {
    id: "jobs",
    title: "ดูบอร์ดงาน",
    description: "สำรวจประกาศงานและโอกาสรับจ้าง",
    href: "/jobs",
    icon: Briefcase,
    rewardPx: 8,
    difficulty: "easy",
    visitId: "jobs",
  },
  {
    id: "skills",
    title: "ใส่ทักษะ",
    description: "บอกว่าคุณถนัดอะไร — ช่วยให้ลูกค้าจับคู่ได้ตรง",
    href: "/settings",
    icon: Wrench,
    rewardPx: 8,
    difficulty: "medium",
  },
  {
    id: "share_profile",
    title: "แชร์ลิงก์โปรไฟล์",
    description: "คัดลอกลิงก์ @username ส่งให้ลูกค้าหรือเพื่อน",
    href: "/portfolio",
    icon: Share2,
    rewardPx: 10,
    difficulty: "medium",
    visitId: "share_profile",
  },
  {
    id: "profile",
    title: "ตั้งโปรไฟล์ให้พร้อม",
    description: "ใส่รูปโปรไฟล์ username และแนะนำตัวอย่างน้อย 20 ตัวอักษร",
    href: "/settings",
    icon: User,
    rewardPx: 12,
    difficulty: "medium",
  },
  {
    id: "post_community",
    title: "โพสต์ใน Area",
    description: "เผยแพร่โพสต์ใน Area อย่างน้อย 1 ครั้ง",
    href: "/community/new",
    icon: MessageSquarePlus,
    rewardPx: 12,
    difficulty: "medium",
  },
  {
    id: "publish_project",
    title: "เผยแพร่ผลงานชิ้นแรก",
    description: "ลงผลงานและตั้งสถานะ Published เพื่อโชว์ในฟีด",
    href: "/portfolio/new",
    icon: LayoutGrid,
    rewardPx: 12,
    difficulty: "hard",
  },
];

const LAUNCH_HIDDEN_TASK_IDS: OnboardingTaskId[] = [
  "explore_community",
  "explore_studios",
  "post_community",
  "jobs",
];

export function getVisibleOnboardingTasks(): OnboardingTaskDef[] {
  if (!isAplus1LaunchMinimal()) return ONBOARDING_TASKS;
  return ONBOARDING_TASKS.filter((task) => !LAUNCH_HIDDEN_TASK_IDS.includes(task.id));
}

export type OnboardingSignals = {
  hasAvatar: boolean;
  hasUsername: boolean;
  bioLength: number;
  skillsCount: number;
  publishedCount: number;
  communityPostCount: number;
  followCount: number;
  likeCount: number;
  communityLikeCount: number;
  visits: Partial<Record<OnboardingVisitId, boolean>>;
};

export function isTaskDone(id: OnboardingTaskId, s: OnboardingSignals): boolean {
  switch (id) {
    case "profile":
      return s.hasAvatar && s.hasUsername && s.bioLength >= 20;
    case "explore_feed":
      return !!s.visits.explore_feed;
    case "explore_community":
      return !!s.visits.explore_community;
    case "explore_designers":
      return !!s.visits.explore_designers;
    case "explore_studios":
      return !!s.visits.explore_studios;
    case "publish_project":
      return s.publishedCount >= 1;
    case "post_community":
      return s.communityPostCount >= 1;
    case "skills":
      return s.skillsCount >= 1;
    case "follow":
      return s.followCount >= 1;
    case "like":
      if (isAplus1LaunchMinimal()) return s.likeCount >= 1;
      return s.likeCount >= 1 && s.communityLikeCount >= 1;
    case "jobs":
      return !!s.visits.jobs;
    case "share_profile":
      return !!s.visits.share_profile;
    default:
      return false;
  }
}

/** Short progress hint for dual-heart mission. */
export function likeMissionHint(s: OnboardingSignals): string | null {
  const projectDone = s.likeCount >= 1;
  const postDone = s.communityLikeCount >= 1;
  if (isAplus1LaunchMinimal()) {
    return projectDone ? null : "ยังไม่กดหัวใจผลงาน";
  }
  if (projectDone && postDone) return null;
  const parts: string[] = [];
  if (!projectDone) parts.push("ยังไม่กดหัวใจผลงาน");
  if (!postDone) parts.push("ยังไม่กดหัวใจโพสต์ Area");
  return parts.join(" · ");
}
