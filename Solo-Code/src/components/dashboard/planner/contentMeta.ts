import * as React from "react";
import {
  Facebook,
  Instagram,
  Youtube,
  Music2,
  Globe,
  FileEdit,
  Clock,
  CheckCircle2,
  Sparkles,
  CalendarClock,
  Eye,
} from "lucide-react";

export type Platform = "facebook" | "instagram" | "tiktok" | "youtube" | "other";
export type Status = "draft" | "in_review" | "approved" | "scheduled" | "published";
export type ApprovalStatus = "none" | "pending" | "approved" | "changes_requested";

export type Post = {
  id: string;
  clientId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  platforms: Platform[];
  customPlatforms?: string[];
  status: Status;
  link?: string;
  imageUrl?: string;
  caption?: string;
  visionCanvasId?: string;
  approvalStatus?: ApprovalStatus;
  clientFeedback?: string;
};

export const PLATFORM_META: Record<
  Platform,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgClass: string;
  }
> = {
  facebook: {
    label: "Facebook",
    icon: Facebook,
    color: "text-[#1877F2]",
    bgClass: "bg-[#1877F2] text-white",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "text-[#E1306C]",
    bgClass: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white",
  },
  tiktok: {
    label: "TikTok",
    icon: Music2,
    color: "text-foreground",
    bgClass: "bg-black text-white",
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    color: "text-[#FF0000]",
    bgClass: "bg-[#FF0000] text-white",
  },
  other: {
    label: "อื่นๆ",
    icon: Globe,
    color: "text-muted-foreground",
    bgClass: "bg-muted text-foreground",
  },
};

export const STATUS_META: Record<
  Status,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: { label: "Draft", icon: FileEdit, className: "bg-muted text-muted-foreground" },
  in_review: { label: "In Review", icon: Eye, className: "bg-[#FF6B00]/15 text-[#FF6B00]" },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  scheduled: {
    label: "Scheduled",
    icon: CalendarClock,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  published: { label: "Published", icon: Sparkles, className: "bg-success/15 text-success" },
};

const CLIENT_COLORS = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-rose-500",
];

export function colorForClient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CLIENT_COLORS[h % CLIENT_COLORS.length];
}

export const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayISO = toISO(new Date());

export const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM
