import type { InAppNotifyKey } from "@/lib/inAppNotifyPrefs";

export type NotifyFrequency = "immediate" | "daily" | "weekly";

export type NotifyChannel = "inApp" | "email";

export type NotifyMuteUntil = number | null;

type DeliveryPrefs = {
  frequency: NotifyFrequency;
  muteUntil: NotifyMuteUntil;
  emailByType: Partial<Record<InAppNotifyKey, boolean>>;
};

const DEFAULT: DeliveryPrefs = {
  frequency: "immediate",
  muteUntil: null,
  emailByType: {},
};

const storageKey = (userId: string) => `aplus1:notify-delivery:${userId}`;

export const NOTIFY_FREQUENCY_OPTIONS: { value: NotifyFrequency; label: string; hint: string }[] = [
  { value: "immediate", label: "ทันที", hint: "แจ้งทีละรายการเมื่อมีเหตุการณ์" },
  { value: "daily", label: "วันละครั้ง", hint: "สรุปรวมวันละครั้ง (ในอุปกรณ์นี้)" },
  { value: "weekly", label: "สรุปสัปดาห์", hint: "สรุปรวมสัปดาห์ละครั้ง (ในอุปกรณ์นี้)" },
];

export const MUTE_DURATIONS_MS = [
  { label: "1 ชั่วโมง", ms: 60 * 60 * 1000 },
  { label: "8 ชั่วโมง", ms: 8 * 60 * 60 * 1000 },
  { label: "24 ชั่วโมง", ms: 24 * 60 * 60 * 1000 },
] as const;

function parse(raw: string | null): DeliveryPrefs {
  if (!raw) return { ...DEFAULT, emailByType: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<DeliveryPrefs>;
    return {
      frequency:
        parsed.frequency === "daily" || parsed.frequency === "weekly" ? parsed.frequency : "immediate",
      muteUntil: typeof parsed.muteUntil === "number" ? parsed.muteUntil : null,
      emailByType: parsed.emailByType ?? {},
    };
  } catch {
    return { ...DEFAULT, emailByType: {} };
  }
}

export function loadNotifyDeliveryPrefs(userId: string | null | undefined): DeliveryPrefs {
  if (!userId || typeof window === "undefined") return { ...DEFAULT, emailByType: {} };
  return parse(window.localStorage.getItem(storageKey(userId)));
}

export function saveNotifyDeliveryPrefs(userId: string, prefs: DeliveryPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("aplus1:in-app-notify-prefs", { detail: { userId } }));
}

export function isNotifyGloballyMuted(userId: string | null | undefined, now = Date.now()): boolean {
  const until = loadNotifyDeliveryPrefs(userId).muteUntil;
  return typeof until === "number" && until > now;
}

export function notifyMuteRemainingLabel(until: NotifyMuteUntil, now = Date.now()): string | null {
  if (!until || until <= now) return null;
  const mins = Math.max(1, Math.round((until - now) / 60_000));
  if (mins < 60) return `ปิดเสียงอีก ${mins} นาที`;
  const hours = Math.round(mins / 60);
  return `ปิดเสียงอีก ${hours} ชม.`;
}
