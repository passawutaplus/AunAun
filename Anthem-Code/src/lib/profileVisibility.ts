export type ProfilePublicField = "bio" | "skills" | "location" | "socials" | "joined";

export const PROFILE_PUBLIC_FIELDS: { key: ProfilePublicField; label: string }[] = [
  { key: "bio", label: "คำแนะนำตัว" },
  { key: "skills", label: "สกิล" },
  { key: "location", label: "ที่อยู่ / พื้นที่" },
  { key: "socials", label: "ลิงก์โซเชียล" },
  { key: "joined", label: "วันที่สมัคร" },
];

export type ProfileVisibility = Record<ProfilePublicField, boolean>;

export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = {
  bio: true,
  skills: true,
  location: true,
  socials: true,
  joined: true,
};

const storageKey = (userId: string) => `aplus1:profile-visibility:${userId}`;

export function loadProfileVisibility(userId: string | null | undefined): ProfileVisibility {
  if (!userId || typeof window === "undefined") return { ...DEFAULT_PROFILE_VISIBILITY };
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_PROFILE_VISIBILITY };
    const parsed = JSON.parse(raw) as Partial<ProfileVisibility>;
    return { ...DEFAULT_PROFILE_VISIBILITY, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE_VISIBILITY };
  }
}

export function saveProfileVisibility(userId: string, value: ProfileVisibility): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(value));
}

export function parseProfileVisibility(raw: unknown): ProfileVisibility {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PROFILE_VISIBILITY };
  const o = raw as Partial<ProfileVisibility>;
  return { ...DEFAULT_PROFILE_VISIBILITY, ...o };
}
