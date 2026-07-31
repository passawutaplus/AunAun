/** Settings page panels — click switches content (not scroll-spy). */

export type SettingsPanelId =
  | "profile"
  | "billing"
  | "notifications"
  | "chat"
  | "preferences"
  | "privacy"
  | "account"
  | "admin";

export type SettingsNavItem = {
  id: SettingsPanelId;
  label: string;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "group-profile",
    label: "โปรไฟล์",
    items: [
      { id: "profile", label: "แก้ไขโปรไฟล์" },
      { id: "billing", label: "เอกสาร & Billing" },
    ],
  },
  {
    id: "group-settings",
    label: "การตั้งค่า",
    items: [
      { id: "notifications", label: "การแจ้งเตือน" },
      { id: "chat", label: "แชท" },
      { id: "preferences", label: "การแสดงผล" },
    ],
  },
  {
    id: "group-privacy",
    label: "Privacy & Security",
    items: [
      { id: "privacy", label: "ความเป็นส่วนตัว & ความปลอดภัย" },
      { id: "account", label: "บัญชี" },
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
  privacy: "privacy",
  "settings-privacy": "privacy",
  "settings-password": "privacy",
  account: "account",
  "settings-account": "account",
  admin: "admin",
  "settings-admin": "admin",
};

export const DEFAULT_SETTINGS_PANEL: SettingsPanelId = "profile";

export function resolveSettingsPanel(
  hash: string | null | undefined,
  opts?: { isAdmin?: boolean },
): SettingsPanelId {
  const raw = (hash ?? "").replace(/^#/, "").trim();
  if (!raw) return DEFAULT_SETTINGS_PANEL;
  const mapped = HASH_TO_PANEL[raw] ?? (isSettingsPanelId(raw) ? raw : DEFAULT_SETTINGS_PANEL);
  if (mapped === "admin" && !opts?.isAdmin) return DEFAULT_SETTINGS_PANEL;
  return mapped;
}

export function isSettingsPanelId(value: string): value is SettingsPanelId {
  return (
    value === "profile" ||
    value === "billing" ||
    value === "notifications" ||
    value === "chat" ||
    value === "preferences" ||
    value === "privacy" ||
    value === "account" ||
    value === "admin"
  );
}

export function settingsPanelHash(panel: SettingsPanelId): string {
  return `#${panel}`;
}

export function buildSettingsNavGroups(isAdmin?: boolean): SettingsNavGroup[] {
  if (!isAdmin) return SETTINGS_NAV_GROUPS;
  return [
    ...SETTINGS_NAV_GROUPS,
    {
      id: "group-admin",
      label: "ระบบ",
      items: [{ id: "admin", label: "ผู้ดูแลระบบ" }],
    },
  ];
}
