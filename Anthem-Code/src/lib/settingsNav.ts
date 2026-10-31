/** Settings page panels — click switches content (not scroll-spy). */

import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, LifeBuoy, SlidersHorizontal, UserRound } from "lucide-react";
import { isCommerceEnabled } from "@/lib/aplus1Launch";
import { isAndroidApp } from "@/lib/appShell";

export type SettingsPanelId =
  | "profile"
  | "billing"
  | "notifications"
  | "chat"
  | "preferences"
  | "visibility"
  | "data"
  | "feedback"
  | "app"
  | "account"
  | "admin";

export type SettingsNavItem = {
  id: SettingsPanelId;
  label: string;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "group-account",
    label: "บัญชีของฉัน",
    icon: UserRound,
    items: [
      { id: "profile", label: "โปรไฟล์" },
      { id: "account", label: "บัญชีและความปลอดภัย" },
      { id: "billing", label: "เอกสาร & Billing" },
    ],
  },
  {
    id: "group-usage",
    label: "การใช้งาน",
    icon: SlidersHorizontal,
    items: [
      { id: "notifications", label: "การแจ้งเตือน" },
      { id: "chat", label: "แชท" },
      { id: "visibility", label: "การมองเห็น & แท็ก" },
      { id: "preferences", label: "การแสดงผล" },
    ],
  },
  {
    id: "group-help",
    label: "ข้อมูลและความช่วยเหลือ",
    icon: LifeBuoy,
    items: [
      { id: "data", label: "ข้อมูลของฉัน" },
      { id: "feedback", label: "ฟีดแบ็ก & รายงาน" },
      { id: "app", label: "ดาวน์โหลดแอป" },
    ],
  },
];

/** Legacy section hashes → panel id (keep old deep links working). */
const HASH_TO_PANEL: Record<string, SettingsPanelId> = {
  profile: "profile",
  "profile-about": "profile",
  "settings-basic": "profile",
  "settings-address": "profile",
  "settings-bio": "profile",
  "settings-disciplines": "profile",
  "settings-opportunity": "profile",
  "settings-experience": "profile",
  "settings-education": "profile",
  "settings-cv-photo": "profile",
  "settings-cv-tools": "profile",
  "settings-languages": "profile",
  "settings-work-arrangement": "profile",
  "settings-skills": "profile",
  "settings-contact": "profile",
  "settings-links": "profile",
  billing: "billing",
  "billing-profile": "billing",
  notifications: "notifications",
  "settings-email": "notifications",
  "settings-bell": "notifications",
  chat: "chat",
  "settings-chat": "chat",
  preferences: "preferences",
  "settings-preferences": "preferences",
  visibility: "visibility",
  "settings-visibility": "visibility",
  "settings-tag": "visibility",
  // "privacy" used to hold tagging + PDPA + reports; PDPA is the part people link to
  privacy: "data",
  "settings-privacy": "data",
  data: "data",
  feedback: "feedback",
  "settings-feedback": "feedback",
  app: "app",
  "settings-app": "app",
  account: "account",
  "settings-account": "account",
  "settings-password": "account",
  "settings-pin": "account",
  admin: "admin",
  "settings-admin": "admin",
};

export const DEFAULT_SETTINGS_PANEL: SettingsPanelId = "profile";

export const SETTINGS_ACCOUNT_HREF = "/settings#account";
export const SETTINGS_PIN_RECOVER_HREF = "/settings?recover=pin#account";
export const ABOUT_ME_EDIT_HREF = "/portfolio?tab=about";

const ABOUT_ME_SETTINGS_HASHES = new Set([
  "profile-about",
  "settings-bio",
  "settings-disciplines",
  "settings-opportunity",
  "settings-experience",
  "settings-education",
  "settings-cv-photo",
  "settings-cv-tools",
  "settings-languages",
  "settings-work-arrangement",
  "settings-skills",
  "settings-contact",
  "settings-links",
]);

export function isAboutMeSettingsHash(hash: string | null | undefined): boolean {
  const raw = (hash ?? "").replace(/^#/, "").trim();
  return ABOUT_ME_SETTINGS_HASHES.has(raw);
}

export function resolveSettingsPanel(
  hash: string | null | undefined,
  opts?: { isAdmin?: boolean },
): SettingsPanelId {
  const raw = (hash ?? "").replace(/^#/, "").trim();
  if (!raw) return DEFAULT_SETTINGS_PANEL;
  const mapped = HASH_TO_PANEL[raw] ?? (isSettingsPanelId(raw) ? raw : DEFAULT_SETTINGS_PANEL);
  if (mapped === "admin" && !opts?.isAdmin) return DEFAULT_SETTINGS_PANEL;
  // Billing / tax documents belong to the money phase.
  if (mapped === "billing" && !isCommerceEnabled()) return DEFAULT_SETTINGS_PANEL;
  if (mapped === "app" && isAndroidApp()) return DEFAULT_SETTINGS_PANEL;
  return mapped;
}

export function isSettingsPanelId(value: string): value is SettingsPanelId {
  return (
    value === "profile" ||
    value === "billing" ||
    value === "notifications" ||
    value === "chat" ||
    value === "preferences" ||
    value === "visibility" ||
    value === "data" ||
    value === "feedback" ||
    value === "app" ||
    value === "account" ||
    value === "admin"
  );
}

export function settingsPanelHash(panel: SettingsPanelId): string {
  return `#${panel}`;
}

export function buildSettingsNavGroups(isAdmin?: boolean): SettingsNavGroup[] {
  // Billing waits for the money phase; "download the app" is pointless inside the app.
  const hidden = new Set<SettingsPanelId>();
  if (!isCommerceEnabled()) hidden.add("billing");
  if (isAndroidApp()) hidden.add("app");
  const groups = SETTINGS_NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !hidden.has(i.id)) }));
  if (!isAdmin) return groups;
  return [
    ...groups,
    {
      id: "group-admin",
      label: "ระบบ",
      icon: LayoutDashboard,
      items: [{ id: "admin", label: "ผู้ดูแลระบบ" }],
    },
  ];
}
