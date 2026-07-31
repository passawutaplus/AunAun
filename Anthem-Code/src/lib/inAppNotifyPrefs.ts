/** Client prefs for in-app (bell) notification categories. */

export type InAppNotifyKey =
  | "hire"
  | "collab"
  | "follow"
  | "chat"
  | "community"
  | "workLike"
  | "system";

export const IN_APP_NOTIFY_OPTIONS: {
  key: InAppNotifyKey;
  label: string;
  description: string;
}[] = [
  {
    key: "hire",
    label: "คำขอจ้างงาน",
    description: "มีคนส่งคำขอจ้างหรืออัปเดตสถานะงานจ้าง",
  },
  {
    key: "collab",
    label: "คอลแลป",
    description: "คำชวนคอลแลปและอัปเดตแผนร่วม",
  },
  {
    key: "follow",
    label: "ติดตาม",
    description: "มีคนติดตามโปรไฟล์ของคุณ",
  },
  {
    key: "chat",
    label: "ข้อความแชท",
    description: "ข้อความใหม่ในกล่องแชท (กระดิ่ง)",
  },
  {
    key: "community",
    label: "ชุมชน",
    description: "ไลค์และคอมเมนต์บนโพสต์ชุมชน",
  },
  {
    key: "workLike",
    label: "ถูกใจผลงาน",
    description: "มีคนกดถูกใจผลงานที่คุณอัปโหลด",
  },
  {
    key: "system",
    label: "ระบบ",
    description: "สถานะไฟล์ ฟีดแบ็กแอดมิน และการแจ้งเตือนระบบ",
  },
];

export const DEFAULT_IN_APP_NOTIFY_PREFS: Record<InAppNotifyKey, boolean> = {
  hire: true,
  collab: true,
  follow: true,
  chat: true,
  community: true,
  workLike: true,
  system: true,
};

const storageKey = (userId: string) => `aplus1:in-app-notify-prefs:${userId}`;

export function loadInAppNotifyPrefs(userId: string | null | undefined): Record<InAppNotifyKey, boolean> {
  if (!userId || typeof window === "undefined") return { ...DEFAULT_IN_APP_NOTIFY_PREFS };
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_IN_APP_NOTIFY_PREFS };
    const parsed = JSON.parse(raw) as Partial<Record<InAppNotifyKey, boolean>>;
    return { ...DEFAULT_IN_APP_NOTIFY_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_IN_APP_NOTIFY_PREFS };
  }
}

export function saveInAppNotifyPrefs(
  userId: string,
  prefs: Record<InAppNotifyKey, boolean>,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("aplus1:in-app-notify-prefs", { detail: { userId } }));
}

/** Map notification kind → preference bucket. */
export function inAppPrefKeyForKind(kind: string): InAppNotifyKey {
  const k = kind.toLowerCase();
  if (k.includes("hire")) return "hire";
  if (k.includes("collab")) return "collab";
  if (k.includes("follow")) return "follow";
  if (k.includes("chat") || k.includes("message")) return "chat";
  if (k.includes("community")) return "community";
  // Portfolio work likes (not community)
  if (
    k === "like" ||
    k.includes("project_like") ||
    k.includes("work_like") ||
    (k.includes("like") && !k.includes("community"))
  ) {
    return "workLike";
  }
  if (k.includes("comment") && !k.includes("community")) return "workLike";
  // Unused channels for now — keep under system so they don't get a dedicated toggle
  if (k.includes("gift") || k.includes("px") || k.includes("job")) return "system";
  return "system";
}

export function isInAppKindEnabled(
  kind: string,
  prefs: Record<InAppNotifyKey, boolean>,
): boolean {
  return prefs[inAppPrefKeyForKind(kind)] !== false;
}

export function isWorkLikePrefEnabled(
  userId: string | null | undefined,
): boolean {
  return loadInAppNotifyPrefs(userId).workLike !== false;
}
